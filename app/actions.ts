"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { canSignUp, getProfile, getSessionUser } from "@/lib/auth";
import { DEFAULT_REMARKS_KEY } from "@/lib/company";
import { deliver } from "@/lib/n8n";
import { repo } from "@/lib/repo";
import {
  ServiceError,
  cancelInvoice,
  createInvoice,
  deleteInvoice,
  financeDecision,
  markIssued,
  recordPayment,
  savePreparers,
  saveCustomer,
  savePricelistSeries,
  submitInvoice,
  updateInvoice,
  type FinanceAction,
  type InvoiceInput,
} from "@/lib/service";
import type { SeriesPrice } from "@/lib/pricelist";
import type { PicInput } from "@/lib/types";

export type FormState = { error?: string; ok?: string } | undefined;

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const opt = (fd: FormData, k: string) => str(fd, k) || null;

async function guard(fn: () => Promise<void>): Promise<FormState> {
  try {
    await fn();
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    // redirect() melempar error khusus — teruskan
    throw e;
  }
}

// ── Auth ──────────────────────────────────────────────────

export async function loginAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await repo.signIn(str(fd, "email"), String(fd.get("password") ?? ""));
  if (!res.ok) return { error: res.error };
  redirect("/");
}

export async function registerAction(_: FormState, fd: FormData): Promise<FormState> {
  const email = str(fd, "email").toLowerCase();
  const password = String(fd.get("password") ?? "");
  // Pesan sengaja umum: jangan bocorkan domain yang diizinkan.
  if (!canSignUp(email)) return { error: "Email ini tidak bisa dipakai untuk mendaftar." };
  if (password.length < 8) return { error: "Password minimal 8 karakter." };
  if (password !== String(fd.get("confirm") ?? "")) return { error: "Konfirmasi password tidak sama." };
  const res = await repo.signUp(email, password);
  if (!res.ok) return { error: res.error };
  redirect("/onboarding");
}

export async function onboardingAction(_: FormState, fd: FormData): Promise<FormState> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (await getProfile()) redirect("/");
  // Cek ulang domain: jaga-jaga akun auth dibuat di luar form daftar.
  if (!canSignUp(user.email)) return { error: "Akun ini tidak bisa melanjutkan pendaftaran." };
  const full_name = str(fd, "full_name");
  const role = str(fd, "role");
  if (!full_name) return { error: "Nama wajib diisi." };
  if (role !== "admin" && role !== "finance") return { error: "Pilih role terlebih dahulu." };
  try {
    await repo.createProfile({ id: user.id, email: user.email, full_name, role });
  } catch {
    return { error: "Gagal menyimpan, coba lagi." };
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function logoutAction() {
  await repo.signOut();
  redirect("/login");
}

// ── Customer ──────────────────────────────────────────────

export async function saveCustomerAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = opt(fd, "id");
  let savedId = id;
  const pics = JSON.parse(String(fd.get("pics") ?? "[]")) as PicInput[];
  const res = await guard(async () => {
    savedId = await saveCustomer(
      await getProfile(),
      id,
      {
        company_name: str(fd, "company_name"),
        billing_address: opt(fd, "billing_address"),
        npwp: opt(fd, "npwp"),
        phone: opt(fd, "phone"),
        email: opt(fd, "email"),
        notes: opt(fd, "notes"),
      },
      pics.map((p) => ({
        id: p.id || undefined,
        name: p.name?.trim() ?? "",
        email: p.email?.trim() || null,
        phone: p.phone?.trim() || null,
        position: p.position?.trim() || null,
      })),
    );
  });
  if (res) return res;
  revalidatePath("/customers");
  const back = str(fd, "return_to");
  redirect(back.startsWith("/") ? back : `/customers/${savedId}`);
}

// ── Invoice ───────────────────────────────────────────────

export async function saveInvoiceAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = opt(fd, "id");
  const submit = str(fd, "intent") === "submit";
  const input = JSON.parse(String(fd.get("payload"))) as InvoiceInput;
  input.tax_rate = Number(input.tax_rate);
  input.payable_percent = input.payable_percent ? Number(input.payable_percent) : null;
  input.items = (input.items ?? []).map((i) => ({
    ...i,
    quantity: Number(i.quantity),
    unit_price: Number(i.unit_price),
    discount_percent: Number(i.discount_percent) || 0,
  }));
  let target = id;
  const res = await guard(async () => {
    const actor = await getProfile();
    if (id) await updateInvoice(actor, id, input, submit);
    else target = await createInvoice(actor, input, submit);
  });
  if (res) return res;
  revalidatePath("/", "layout");
  redirect(`/invoices/${target}`);
}

/** Simpan remarks sebagai default untuk invoice baru berikutnya. */
export async function saveDefaultRemarksAction(notes: string): Promise<FormState> {
  const me = await getProfile();
  if (me?.role !== "admin") return { error: "Hanya admin yang bisa mengubah default remarks." };
  await repo.setSetting(DEFAULT_REMARKS_KEY, notes.trim());
  return { ok: "Default remarks disimpan." };
}

export async function submitInvoiceAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id");
  const res = await guard(async () => submitInvoice(await getProfile(), id));
  if (res) return res;
  revalidatePath("/", "layout");
  return { ok: "Invoice diajukan ke Finance." };
}

export async function financeAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id");
  const action = str(fd, "action") as FinanceAction;
  const res = await guard(async () => {
    await financeDecision(await getProfile(), id, action, opt(fd, "notes"));
  });
  if (res) return res;
  revalidatePath("/", "layout");
  return { ok: { approve: "Invoice disetujui.", reject: "Invoice ditolak.", revision: "Revisi diminta ke Admin." }[action] };
}

export async function cancelAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await guard(async () => cancelInvoice(await getProfile(), str(fd, "id"), str(fd, "reason")));
  if (res) return res;
  revalidatePath("/", "layout");
  return { ok: "Invoice dibatalkan." };
}

export async function deleteInvoiceAction(_: FormState, fd: FormData): Promise<FormState> {
  const res = await guard(async () => deleteInvoice(await getProfile(), str(fd, "id")));
  if (res) return res;
  revalidatePath("/", "layout");
  redirect("/invoices");
}

export async function issueManualAction(_: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id");
  const res = await guard(async () => {
    await markIssued(await getProfile(), id, { pdf_url: opt(fd, "pdf_url") ?? `/invoices/${id}/print` });
  });
  if (res) return res;
  revalidatePath("/", "layout");
  return { ok: "Invoice ditandai Issued." };
}

export async function recordPaymentAction(_: FormState, fd: FormData): Promise<FormState> {
  const file = fd.get("proof");
  const res = await guard(async () =>
    recordPayment(await getProfile(), str(fd, "id"), {
      notes: opt(fd, "notes"),
      file: file instanceof File ? file : null,
    }),
  );
  if (res) return res;
  revalidatePath("/", "layout");
  return { ok: "Bukti diupload. Invoice sekarang Paid." };
}

/** Simpan daftar nama "Prepared By" Surat Jalan; mengembalikan daftar yang tersimpan. */
export async function savePreparersAction(names: string[]): Promise<{ error?: string; names?: string[] }> {
  try {
    return { names: await savePreparers(await getProfile(), names) };
  } catch (e) {
    if (e instanceof ServiceError) return { error: e.message };
    throw e;
  }
}

export async function retryWebhookAction(fd: FormData) {
  const actor = await getProfile();
  if (!actor) redirect("/login");
  const w = await repo.getWebhook(str(fd, "webhook_id"));
  if (w && w.status !== "sent") await deliver(w);
  revalidatePath(`/invoices/${w?.invoice_id}`);
}

// ── Account ───────────────────────────────────────────────

export async function updateAccountAction(_: FormState, fd: FormData): Promise<FormState> {
  const actor = await getProfile();
  if (!actor) redirect("/login");
  try {
    await repo.updateProfile(actor.id, { full_name: opt(fd, "full_name") });
  } catch {
    return { error: "Gagal menyimpan." };
  }
  revalidatePath("/", "layout");
  return { ok: "Profil tersimpan." };
}

/** Simpan harga tier satu series; `price = null` → reset ke default. */
export async function savePricelistAction(key: string, price: SeriesPrice | null): Promise<FormState> {
  const res = await guard(async () => savePricelistSeries(await getProfile(), key, price));
  if (res) return res;
  revalidatePath("/pricelist");
  revalidatePath("/invoices", "layout");
  return { ok: price ? "Harga disimpan." : "Harga dikembalikan ke default." };
}
