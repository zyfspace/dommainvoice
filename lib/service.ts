import "server-only";
import { randomUUID } from "node:crypto";
import {
  CANCELLABLE,
  DELETABLE,
  EDITABLE,
  PAYABLE,
  PAYMENT_ROLES,
  PRINTABLE,
  SURAT_JALAN_ROLES,
  invoiceDue,
  rupiah,
  STATUS_LABEL,
  computeTotals,
  SEQUENCE_KEY,
  formatInvoiceNumber,
} from "./domain";
import { emit } from "./n8n";
import { repo } from "./repo";
import type { NewItem } from "./repo/types";
import { DEFAULT_PRICELIST, PRICELIST_KEY, resolvePricelist, validateSeries, type Pricelist, type SeriesPrice } from "./pricelist";
import type {
  CustomerInput,
  Entity,
  Invoice,
  InvoiceStatus,
  ItemInput,
  PaymentType,
  PicInput,
  Profile,
  Role,
} from "./types";

/** Semua aturan bisnis & validasi role ada di sini (backend), bukan di tampilan. */

export class ServiceError extends Error {}

function requireRole(actor: Profile | null, role: Role): asserts actor is Profile {
  if (!actor) throw new ServiceError("Sesi berakhir, silakan login ulang.");
  if (actor.role !== role)
    throw new ServiceError(`Aksi ini hanya untuk ${role === "admin" ? "Admin" : "Finance"}.`);
}

async function log(
  inv: Pick<Invoice, "id">,
  actor: Profile | null,
  action: string,
  from: InvoiceStatus | null,
  to: InvoiceStatus | null,
  notes: string | null = null,
) {
  await repo.insertEvent({
    invoice_id: inv.id,
    actor_id: actor?.id ?? null,
    actor_email: actor?.email ?? "system",
    action,
    from_status: from,
    to_status: to,
    notes,
  });
}

// ── Customer ──────────────────────────────────────────────

export async function saveCustomer(actor: Profile | null, id: string | null, input: CustomerInput, pics: PicInput[]) {
  requireRole(actor, "admin");
  if (!input.company_name.trim()) throw new ServiceError("Nama perusahaan wajib diisi.");
  const cleanPics = pics.filter((p) => p.name.trim());
  if (!cleanPics.length) throw new ServiceError("Minimal satu PIC.");
  if (id) {
    await repo.updateCustomer(id, input, cleanPics);
    return id;
  }
  return (await repo.insertCustomer(input, cleanPics, actor.id)).id;
}

// ── Invoice ───────────────────────────────────────────────

export interface InvoiceInput {
  customer_id: string;
  /** true = customer belum ada; dibuat otomatis dari data invoice saat disimpan. */
  new_customer?: boolean;
  /** true = PIC belum ada di customer ini; ditambahkan ke master customer saat disimpan. */
  new_pic?: boolean;
  pic_id: string | null;
  company_name: string;
  pic_name: string | null;
  /** Jabatan PIC baru (disimpan ke master customer). */
  pic_position?: string | null;
  email: string | null;
  phone: string | null;
  billing_address: string | null;
  npwp: string | null;
  entity: Entity;
  invoice_date: string;
  due_date: string;
  payment_type: PaymentType;
  tax_rate: number;
  notes: string | null;
  term_of_payment: string | null;
  payment_info: string | null;
  payable_label: string | null;
  payable_percent: number | null;
  /** Payment type DP / Termin: tahap pembayaran (persen & due date), urut dari tahap 1. */
  schedule?: { percent: number; due_date: string }[] | null;
  /** Nomor tahap (1-based) yang menjadi syarat cetak Surat Jalan. */
  delivery_after?: number | null;
  items: ItemInput[];
}

const MAX_TERMIN = 12;
const isGrouped = (t: PaymentType) => t === "dp" || t === "termin";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function validate(input: InvoiceInput): NewItem[] {
  if (!input.customer_id && !input.new_customer) throw new ServiceError("Pilih customer.");
  if (!input.company_name.trim()) throw new ServiceError("Nama perusahaan wajib diisi.");
  if (!input.email?.trim()) throw new ServiceError("Email wajib diisi.");
  if (!input.billing_address?.trim()) throw new ServiceError("Billing address wajib diisi.");
  if (!DATE.test(input.invoice_date) || !DATE.test(input.due_date))
    throw new ServiceError("Tanggal tidak valid.");
  if (input.due_date < input.invoice_date) throw new ServiceError("Due date tidak boleh sebelum invoice date.");
  if (!["cbd", "dp", "termin", "top"].includes(input.payment_type)) throw new ServiceError("Payment type tidak valid.");
  if (!["dts", "tmb"].includes(input.entity)) throw new ServiceError("Entitas penerbit tidak valid.");
  if (isGrouped(input.payment_type)) {
    const sch = input.schedule ?? [];
    const dp = input.payment_type === "dp";
    if (dp ? sch.length !== 2 : sch.length < 2 || sch.length > MAX_TERMIN)
      throw new ServiceError(dp ? "DP terdiri dari 2 tahap: DP & Pelunasan." : `Termin minimal 2, maksimal ${MAX_TERMIN} tahap.`);
    for (const [i, t] of sch.entries()) {
      const name = dp ? (i ? "Pelunasan" : "DP") : `Termin ${i + 1}`;
      if (!(t.percent > 0 && t.percent < 100)) throw new ServiceError(`Persentase ${name} harus antara 0–100.`);
      if (!DATE.test(t.due_date ?? "")) throw new ServiceError(`Due date ${name} wajib diisi.`);
      if (t.due_date < input.invoice_date) throw new ServiceError(`Due date ${name} tidak boleh sebelum invoice date.`);
    }
    const sum = sch.reduce((a, t) => a + t.percent, 0);
    if (Math.abs(sum - 100) > 0.01) throw new ServiceError(`Total persentase tahap harus 100% (sekarang ${sum}%).`);
    const gate = input.delivery_after ?? sch.length;
    if (!(Number.isInteger(gate) && gate >= 1 && gate <= sch.length))
      throw new ServiceError("Pilih tahap syarat cetak Surat Jalan.");
  } else {
    if (input.payable_percent != null && !(input.payable_percent > 0 && input.payable_percent <= 100))
      throw new ServiceError("Persentase tagihan harus 1–100.");
    if (input.payable_percent != null && !input.payable_label?.trim())
      throw new ServiceError("Label baris tagihan wajib diisi (mis. Total Termin 3).");
  }
  if (![0, 11, 12].includes(input.tax_rate)) throw new ServiceError("Tarif pajak tidak valid.");
  const items = input.items.filter((i) => i.product.trim());
  if (!items.length) throw new ServiceError("Minimal satu item.");
  for (const i of items) {
    if (!i.uom?.trim()) throw new ServiceError(`UoM "${i.product}" wajib diisi.`);
    if (!(i.quantity > 0)) throw new ServiceError(`Quantity "${i.product}" harus lebih dari 0.`);
    if (!(i.unit_price >= 0)) throw new ServiceError(`Harga "${i.product}" tidak valid.`);
    if (!(i.discount_percent >= 0 && i.discount_percent < 100))
      throw new ServiceError(`Diskon "${i.product}" harus 0–99,99%.`);
    if (!["engrave", "uv_print", "plain"].includes(i.customization))
      throw new ServiceError("Customization tidak valid.");
  }
  // Total selalu dihitung ulang di server — nilai dari browser diabaikan.
  const { lines } = computeTotals(items, input.tax_rate);
  return items.map((i, idx) => ({
    position: idx + 1,
    sku: i.sku?.trim() || null,
    product: i.product.trim(),
    quantity: i.quantity,
    uom: i.uom.trim(),
    unit_price: i.unit_price,
    discount_percent: i.discount_percent,
    customization: i.customization,
    notes: i.notes?.trim() || null,
    line_total: lines[idx],
  }));
}

function header(input: InvoiceInput, items: NewItem[]) {
  const t = computeTotals(items, input.tax_rate);
  return {
    entity: input.entity,
    term_of_payment: input.term_of_payment?.trim() || null,
    payment_info: input.payment_info?.trim() || null,
    payable_label: input.payable_percent ? input.payable_label!.trim() : null,
    payable_percent: input.payable_percent || null,
    customer_id: input.customer_id,
    pic_id: input.pic_id,
    company_name: input.company_name.trim(),
    pic_name: input.pic_name?.trim() || null,
    email: input.email?.trim() || null,
    phone: input.phone?.trim() || null,
    billing_address: input.billing_address?.trim() || null,
    npwp: input.npwp?.trim() || null,
    invoice_date: input.invoice_date,
    due_date: input.due_date,
    payment_type: input.payment_type,
    tax_rate: input.tax_rate,
    notes: input.notes?.trim() || null,
    subtotal: t.subtotal,
    tax_amount: t.tax_amount,
    total: t.total,
  };
}

/** Tambah PIC baru ke customer existing, lalu tautkan ke invoice. */
async function attachNewPic(input: InvoiceInput): Promise<InvoiceInput> {
  if (!input.new_pic || input.new_customer) return input;
  const name = input.pic_name?.trim();
  if (!name) throw new ServiceError("Nama PIC wajib diisi.");
  const c = await repo.getCustomer(input.customer_id);
  if (!c) throw new ServiceError("Customer tidak ditemukan.");
  const { pics, id: _, created_by: _b, created_at: _c, updated_at: _u, ...base } = c;
  await repo.updateCustomer(c.id, base, [
    ...pics,
    { name, email: input.email?.trim() || null, phone: input.phone?.trim() || null, position: input.pic_position?.trim() || null },
  ]);
  const known = new Set(pics.map((p) => p.id));
  const pic = (await repo.getCustomer(c.id))?.pics.find((p) => !known.has(p.id));
  return { ...input, pic_id: pic?.id ?? null };
}

/**
 * Payment type DP / Termin dipecah jadi satu invoice per tahap dalam satu grup
 * (DP x% + Pelunasan, atau Termin 1..N). Isi (customer, item, total) sama; yang beda baris tagihan & due date.
 */
function installments(input: InvoiceInput) {
  if (!isGrouped(input.payment_type)) return null;
  const sch = input.schedule!;
  const gate = input.delivery_after ?? sch.length;
  return sch.map((t, i) => ({
    installment: i + 1,
    payable_percent: t.percent,
    payable_label:
      input.payment_type === "dp" ? `${i ? "Pelunasan" : "DP"} ${t.percent}%` : `Termin ${i + 1} (${t.percent}%)`,
    due_date: t.due_date,
    delivery_gate: i + 1 === gate,
  }));
}

/** Semua invoice yang bergerak bersama (satu grup DP / Termin), atau invoice itu sendiri. */
async function members(inv: Invoice) {
  return inv.group_id ? await repo.listGroup(inv.group_id) : [inv];
}

const blankState = {
  invoice_number: null,
  status: "draft" as const,
  revision_notes: null,
  pdf_url: null,
  email_sent_at: null,
  sheets_synced_at: null,
  approved_by: null,
  approved_at: null,
  issued_at: null,
  cancelled_at: null,
  cancel_reason: null,
  printed_at: null,
  printed_by: null,
  printed_by_name: null,
};

export async function createInvoice(actor: Profile | null, input: InvoiceInput, submit: boolean) {
  requireRole(actor, "admin");
  const items = validate(input);
  if (input.new_customer) {
    if (!input.pic_name?.trim()) throw new ServiceError("Nama PIC wajib diisi.");
    const c = await repo.insertCustomer(
      {
        company_name: input.company_name.trim(),
        billing_address: input.billing_address?.trim() || null,
        npwp: input.npwp?.trim() || null,
        phone: input.phone?.trim() || null,
        email: input.email?.trim() || null,
        notes: null,
      },
      [
        {
          name: input.pic_name.trim(),
          email: input.email?.trim() || null,
          phone: input.phone?.trim() || null,
          position: input.pic_position?.trim() || null,
        },
      ],
      actor.id,
    );
    const pic = (await repo.getCustomer(c.id))?.pics[0];
    input = { ...input, customer_id: c.id, pic_id: pic?.id ?? null };
  }
  input = await attachNewPic(input);
  const base = { ...header(input, items), ...blankState, created_by: actor.id, created_by_email: actor.email };
  const parts = installments(input);
  const group_id = parts ? randomUUID() : null;
  const created: Invoice[] = [];
  for (const part of parts ?? [{ installment: null, delivery_gate: false }]) {
    const inv = await repo.insertInvoice({ ...base, ...part, group_id }, items);
    await log(inv, actor, "created", null, "draft", inv.group_id ? inv.payable_label : null);
    created.push(inv);
  }
  if (submit) await submitInvoice(actor, created[0].id);
  return created[0].id;
}

export async function updateInvoice(actor: Profile | null, id: string, input: InvoiceInput, submit: boolean) {
  requireRole(actor, "admin");
  const items = validate(input);
  const before = await repo.getInvoice(id);
  if (!before) throw new ServiceError("Invoice tidak ditemukan.");
  const group = await members(before);
  if (group.some((g) => !EDITABLE.includes(g.status)))
    throw new ServiceError("Invoice hanya bisa diedit saat Draft atau Revision Requested.");
  if (before.group_id && !isGrouped(input.payment_type))
    throw new ServiceError("Grup DP / Termin tidak bisa diubah jadi invoice tunggal. Hapus lalu buat invoice baru.");
  input = await attachNewPic(input);
  const h = header(input, items);
  const parts = installments(input);

  if (!parts) {
    const inv = await repo.updateInvoice(
      id,
      { ...h, status: "draft", installment: null, delivery_gate: false },
      { expect: EDITABLE, items },
    );
    if (!inv) throw new ServiceError("Invoice hanya bisa diedit saat Draft atau Revision Requested.");
    await log(inv, actor, "edited", before.status, "draft");
  } else {
    // Invoice tunggal yang diubah ke DP / Termin → jadikan tahap 1, lalu buat tahap berikutnya.
    const group_id = before.group_id ?? randomUUID();
    for (const part of parts) {
      const existing = group.find((g) => (before.group_id ? g.installment === part.installment : part.installment === 1));
      if (existing) {
        const inv = await repo.updateInvoice(existing.id, { ...h, ...part, group_id, status: "draft" }, { expect: EDITABLE, items });
        if (!inv) throw new ServiceError("Invoice sudah berubah status, muat ulang halaman.");
        await log(inv, actor, "edited", existing.status, "draft");
      } else {
        const inv = await repo.insertInvoice(
          { ...h, ...part, group_id, ...blankState, created_by: actor.id, created_by_email: actor.email },
          items,
        );
        await log(inv, actor, "created", null, "draft", part.payable_label);
      }
    }
    // Jumlah termin dikurangi → hapus tahap yang tidak dipakai lagi (masih Draft/Revisi).
    for (const g of group)
      if (before.group_id && (g.installment ?? 0) > parts.length && !(await repo.deleteInvoice(g.id, EDITABLE)))
        throw new ServiceError("Invoice sudah berubah status, muat ulang halaman.");
  }
  if (submit) await submitInvoice(actor, id, before.status === "revision_requested");
}

/**
 * Terbitkan nomor untuk invoice yang belum bernomor. Grup DP mengambil blok nomor sekaligus,
 * jadi DP & Pelunasan selalu berurutan (mis. 765 & 766).
 */
async function assignNumbers(list: Invoice[]) {
  const todo = list.filter((i) => !i.invoice_number);
  if (!todo.length) return list;
  const first = await repo.nextSequenceBlock(SEQUENCE_KEY, todo.length);
  const done = new Map<string, Invoice>();
  for (const [k, inv] of todo.entries())
    done.set(inv.id, (await repo.updateInvoice(inv.id, { invoice_number: formatInvoiceNumber(inv.invoice_date, first + k) }))!);
  return list.map((i) => done.get(i.id) ?? i);
}

export async function submitInvoice(actor: Profile | null, id: string, afterRevision = false) {
  requireRole(actor, "admin");
  const before = await repo.getInvoice(id);
  if (!before) throw new ServiceError("Invoice tidak ditemukan.");
  const group = await members(before);
  const claimed: Invoice[] = [];
  for (const g of group) {
    const inv = await repo.updateInvoice(g.id, { status: "on_check" }, { expect: EDITABLE });
    if (!inv) throw new ServiceError(`Invoice berstatus ${STATUS_LABEL[g.status]}, tidak bisa diajukan.`);
    claimed.push(inv);
  }
  const resubmit = afterRevision || before.status === "revision_requested";
  // Nomor terbit saat diajukan (dipakai ulang setelah revisi) supaya admin & Finance merujuk nomor yang sama.
  const [numbered, notify] = await Promise.all([assignNumbers(claimed), financeEmails()]);
  for (const inv of numbered) {
    await log(inv, actor, resubmit ? "resubmitted" : "submitted", before.status, "on_check");
    await emit("invoice.submitted", inv, {
      requested_by: actor.email,
      total: inv.total,
      company_name: inv.company_name,
      resubmitted: resubmit,
      notify_emails: notify,
    });
  }
}

/** Penerima email notifikasi (dikirim n8n): Finance untuk invoice masuk, admin pembuat untuk keputusan. */
async function financeEmails() {
  return (await repo.listProfiles()).filter((p) => p.role === "finance").map((p) => p.email);
}

const creatorEmails = (inv: Invoice) => (inv.created_by_email ? [inv.created_by_email] : []);

export type FinanceAction = "approve" | "reject" | "revision";

/** Approval Finance dari dashboard. Grup DP diputuskan bersama. */
export async function financeDecision(actor: Profile | null, id: string, action: FinanceAction, notes: string | null) {
  requireRole(actor, "finance");
  notes = notes?.trim() || null;
  if (action !== "approve" && !notes)
    throw new ServiceError(action === "reject" ? "Alasan penolakan wajib diisi." : "Catatan revisi wajib diisi.");

  const before = await repo.getInvoice(id);
  if (!before) throw new ServiceError("Invoice tidak ditemukan.");
  const group = await members(before);
  if (group.some((g) => g.status !== "on_check"))
    throw new ServiceError(`Invoice sudah berstatus ${STATUS_LABEL[group.find((g) => g.status !== "on_check")!.status]}.`);

  if (action === "approve") {
    // Klaim transisi dulu (atomik), baru ambil nomor → nomor tidak terbuang & tidak dobel.
    const claimed: Invoice[] = [];
    for (const g of group) {
      const c = await repo.updateInvoice(
        g.id,
        { status: "approved", approved_by: actor.id, approved_at: new Date().toISOString(), revision_notes: null },
        { expect: ["on_check"] },
      );
      if (!c) throw new ServiceError(`Invoice sudah berstatus ${STATUS_LABEL[g.status]}.`);
      claimed.push(c);
    }
    // Normalnya nomor sudah terbit saat diajukan; ini fallback untuk invoice lama.
    const finance = await financeEmails();
    for (const inv of await assignNumbers(claimed)) {
      await log(inv, actor, "approved", "on_check", "approved", notes ?? `Nomor ${inv.invoice_number}`);
      await emit("invoice.approved", inv, {
        approved_by: actor.email,
        approved_by_name: actor.full_name ?? null,
        notify_emails: creatorEmails(inv),
        finance_emails: finance,
      });
    }
    return;
  }

  const to: InvoiceStatus = action === "reject" ? "rejected" : "revision_requested";
  for (const g of group) {
    const inv = await repo.updateInvoice(
      g.id,
      action === "revision" ? { status: to, revision_notes: notes } : { status: to },
      { expect: ["on_check"] },
    );
    if (!inv) throw new ServiceError(`Invoice sudah berstatus ${STATUS_LABEL[g.status]}.`);
    await log(inv, actor, action === "reject" ? "rejected" : "revision_requested", "on_check", to, notes);
    if (action === "revision")
      await emit("invoice.revision_requested", inv, {
        requested_by: actor.email,
        revision_notes: notes,
        notify_emails: creatorEmails(inv),
      });
    else await emit("invoice.rejected", inv, { rejected_by: actor.email, reason: notes, notify_emails: creatorEmails(inv) });
  }
}

/** Batalkan invoice (grup DP: semua bagian yang masih bisa dibatalkan). */
export async function cancelInvoice(actor: Profile | null, id: string, reason: string) {
  requireRole(actor, "finance");
  if (!reason.trim()) throw new ServiceError("Alasan pembatalan wajib diisi.");
  const before = await repo.getInvoice(id);
  if (!before) throw new ServiceError("Invoice tidak ditemukan.");
  const targets = (await members(before)).filter((g) => CANCELLABLE.includes(g.status));
  if (!targets.length) throw new ServiceError(`Invoice berstatus ${STATUS_LABEL[before.status]} tidak bisa dibatalkan.`);
  for (const g of targets) {
    const inv = await repo.updateInvoice(
      g.id,
      { status: "cancelled", cancelled_at: new Date().toISOString(), cancel_reason: reason.trim() },
      { expect: CANCELLABLE },
    );
    if (!inv) continue;
    await log(inv, actor, "cancelled", g.status, "cancelled", reason.trim());
    await emit("invoice.cancelled", inv, {
      cancelled_by: actor.email,
      reason: reason.trim(),
      notify_emails: creatorEmails(inv),
    });
  }
}

/** Hapus permanen (grup DP: semua bagian ikut terhapus). */
export async function deleteInvoice(actor: Profile | null, id: string) {
  if (!actor) throw new ServiceError("Sesi berakhir, silakan login ulang.");
  const before = await repo.getInvoice(id);
  if (!before) throw new ServiceError("Invoice tidak ditemukan.");
  const group = await members(before);
  const blocked = group.find((g) => !DELETABLE.includes(g.status));
  if (blocked)
    throw new ServiceError(`Invoice berstatus ${STATUS_LABEL[blocked.status]} harus dibatalkan dulu sebelum dihapus.`);
  for (const g of group)
    if (!(await repo.deleteInvoice(g.id, DELETABLE)))
      throw new ServiceError("Invoice sudah berubah status, muat ulang halaman.");
}

/**
 * Approved → Issued. Dipanggil n8n setelah PDF jadi (actor null),
 * atau Finance secara manual (fallback memakai halaman cetak dashboard).
 */
export async function markIssued(
  actor: Profile | null,
  id: string,
  data: { pdf_url: string | null; email_sent_at?: string | null },
) {
  if (actor) requireRole(actor, "finance");
  const inv = await repo.updateInvoice(
    id,
    {
      status: "issued",
      issued_at: new Date().toISOString(),
      pdf_url: data.pdf_url,
      ...(data.email_sent_at ? { email_sent_at: data.email_sent_at } : {}),
    },
    { expect: ["approved"] },
  );
  if (!inv) throw new ServiceError("Invoice harus berstatus Approved untuk diterbitkan.");
  await log(inv, actor, actor ? "issued_manual" : "issued", "approved", "issued", data.pdf_url);
  return inv;
}

// ── Cetak ─────────────────────────────────────────────────

export type PrintResult = { ok: true } | { conflict: { name: string; at: string } };

/**
 * Catat cetak invoice yang sudah di-approve. Cetak pertama diklaim atomik (printed_at masih kosong),
 * jadi dua admin yang klik bersamaan tidak sama-sama tercatat sebagai pencetak pertama.
 * Sudah dicetak orang lain → kembalikan conflict, kecuali `force` (user sudah konfirmasi cetak ulang).
 */
export async function recordPrint(actor: Profile | null, id: string, force: boolean): Promise<PrintResult> {
  if (!actor) throw new ServiceError("Sesi berakhir, silakan login ulang.");
  const before = await repo.getInvoice(id);
  if (!before) throw new ServiceError("Invoice tidak ditemukan.");
  if (!PRINTABLE.includes(before.status))
    throw new ServiceError("Invoice belum di-approve Finance, belum bisa dicetak.");
  const at = new Date().toISOString();
  const name = actor.full_name || actor.email;
  const claimed = await repo.claimPrint(id, { printed_at: at, printed_by: actor.id, printed_by_name: name }, PRINTABLE);
  if (claimed) {
    await log(claimed, actor, "printed", null, null);
    return { ok: true };
  }
  const inv = await repo.getInvoice(id);
  if (!inv) throw new ServiceError("Invoice tidak ditemukan.");
  // Status berubah di antara cek & klaim (mis. dibatalkan).
  if (!PRINTABLE.includes(inv.status)) throw new ServiceError("Invoice ini tidak bisa dicetak.");
  if (!inv.printed_at) return { ok: true };
  if (inv.printed_by !== actor.id && !force)
    return { conflict: { name: inv.printed_by_name ?? "admin lain", at: inv.printed_at } };
  await log(inv, actor, "reprinted", null, null);
  return { ok: true };
}

// ── Pembayaran ────────────────────────────────────────────

const PROOF_TYPES: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "application/pdf": "pdf",
};
const PROOF_MAX = 5 * 1024 * 1024;

/**
 * Upload bukti transfer (wajib) → invoice langsung Paid.
 * Satu invoice satu bukti; DP & pelunasan dibuat sebagai invoice terpisah.
 */
export async function recordPayment(actor: Profile | null, id: string, input: { notes: string | null; file: File | null }) {
  if (!actor) throw new ServiceError("Sesi berakhir, silakan login ulang.");
  if (!PAYMENT_ROLES.includes(actor.role)) throw new ServiceError("Tidak punya akses mencatat pembayaran.");
  const before = await repo.getInvoice(id);
  if (!before) throw new ServiceError("Invoice tidak ditemukan.");
  if (!PAYABLE.includes(before.status))
    throw new ServiceError(`Invoice berstatus ${STATUS_LABEL[before.status]} tidak bisa dicatat pembayarannya.`);
  const { file } = input;
  if (!file || !file.size) throw new ServiceError("Bukti transfer wajib diupload.");
  const ext = PROOF_TYPES[file.type];
  if (!ext) throw new ServiceError("Bukti transfer harus JPG, PNG, WEBP, atau PDF.");
  if (file.size > PROOF_MAX) throw new ServiceError("Ukuran bukti transfer maksimal 5 MB.");
  if (before.payments.length) throw new ServiceError("Bukti pembayaran invoice ini sudah diupload.");

  // Klaim status dulu (atomik) supaya upload ganda bersamaan tidak tercatat dua kali.
  const inv = await repo.updateInvoice(id, { status: "paid" }, { expect: PAYABLE });
  if (!inv) throw new ServiceError("Invoice sudah berubah status, muat ulang halaman.");

  let payment;
  try {
    payment = await repo.insertPayment(
      {
        invoice_id: id,
        amount: invoiceDue(before),
        proof_path: `${id}/${randomUUID()}.${ext}`,
        file_name: file.name.slice(0, 200) || `bukti.${ext}`,
        content_type: file.type,
        notes: input.notes?.trim() || null,
        created_by: actor.id,
        created_by_email: actor.email,
      },
      new Uint8Array(await file.arrayBuffer()),
    );
  } catch (e) {
    // Upload gagal → kembalikan status semula.
    await repo.updateInvoice(id, { status: before.status }, { expect: ["paid"] });
    throw new ServiceError(`Gagal mengupload bukti transfer: ${e instanceof Error ? e.message : "coba lagi"}.`);
  }
  await log(inv, actor, "paid", before.status, "paid", `${rupiah(payment.amount)} · ${payment.file_name}${payment.notes ? ` · ${payment.notes}` : ""}`);
}

// ── Surat Jalan ───────────────────────────────────────────

const PREPARERS_KEY = "surat_jalan_preparers";
const DEFAULT_PREPARERS = ["Irfan", "Santi"];

/** Daftar nama "Prepared By" Surat Jalan (tersimpan di app_settings). */
export async function getPreparers(): Promise<string[]> {
  try {
    const v = JSON.parse((await repo.getSetting(PREPARERS_KEY)) ?? "null");
    if (Array.isArray(v)) return v.filter((x) => typeof x === "string");
  } catch {}
  return DEFAULT_PREPARERS;
}

export async function savePreparers(actor: Profile | null, names: string[]) {
  if (!actor) throw new ServiceError("Sesi berakhir, silakan login ulang.");
  if (!SURAT_JALAN_ROLES.includes(actor.role)) throw new ServiceError("Tidak punya akses Surat Jalan.");
  const clean = [...new Set(names.map((n) => n.trim().replace(/s+/g, " ")).filter(Boolean))];
  await repo.setSetting(PREPARERS_KEY, JSON.stringify(clean));
  return clean;
}

export async function recordSystemEvent(id: string, patch: Partial<Invoice>, action: string, notes: string | null) {
  const inv = await repo.updateInvoice(id, patch);
  if (!inv) throw new ServiceError("Invoice tidak ditemukan.");
  await log(inv, null, action, null, null, notes);
}

/** Pricelist aktif: default kode + override admin dari app_settings. */
export async function getPricelist(): Promise<Pricelist> {
  return resolvePricelist(await repo.getSetting(PRICELIST_KEY));
}

/**
 * Simpan harga satu series (admin). `price = null` → kembali ke harga default.
 * Hanya memengaruhi saran harga invoice berikutnya; unit price invoice yang sudah ada tidak berubah.
 */
export async function savePricelistSeries(actor: Profile | null, key: string, price: SeriesPrice | null) {
  requireRole(actor, "admin");
  const def = DEFAULT_PRICELIST[key];
  if (!def) throw new ServiceError("Series tidak dikenal.");
  let stored: Record<string, SeriesPrice> = {};
  try {
    stored = JSON.parse((await repo.getSetting(PRICELIST_KEY)) ?? "{}") ?? {};
  } catch {}
  if (price) {
    const next = { ...price, label: def.label };
    const err = validateSeries(next);
    if (err) throw new ServiceError(`${def.label}: ${err}.`);
    stored[key] = next;
  } else delete stored[key];
  await repo.setSetting(PRICELIST_KEY, JSON.stringify(stored));
}
