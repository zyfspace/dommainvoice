import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import type { Customer, Invoice, InvoiceFull, Payment, Profile } from "../types";
import type { Repo } from "./types";

/**
 * Mode SUPABASE.
 * - Auth memakai sesi Supabase (cookie) via @supabase/ssr.
 * - Semua penulisan dilakukan server-side dengan service role SETELAH role dicek di lib/service.ts.
 * - RLS aktif: client (anon key) hanya bisa SELECT jika login, tidak bisa menulis langsung.
 */

const url = () => process.env.NEXT_PUBLIC_SUPABASE_URL!;

async function authClient() {
  const store = await cookies();
  return createServerClient(url(), process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (list) => {
        try {
          for (const { name, value, options } of list) store.set(name, value, options);
        } catch {
          // dipanggil dari Server Component — refresh sesi ditangani saat action berikutnya
        }
      },
    },
  });
}

let admin: SupabaseClient | null = null;
function db() {
  admin ??= createClient(url(), process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return admin;
}

function must<T>(res: { data: T; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data;
}

const CUSTOMER_SELECT = "*, pics:customer_pics(*)";
const PROOF_BUCKET = "payment-proofs";

export const supabaseRepo: Repo = {
  mode: "supabase",

  async signIn(email, password) {
    const { error } = await (await authClient()).auth.signInWithPassword({ email: email.trim(), password });
    return error ? { ok: false, error: "Email atau password salah." } : { ok: true };
  },

  async signUp(email, password) {
    // Lewat Admin API + email_confirm: tidak ada email verifikasi, domain sudah dicek di server action.
    const { error } = await db().auth.admin.createUser({ email, password, email_confirm: true });
    if (error) {
      if (error.code === "email_exists") return { ok: false, error: "Email sudah terdaftar. Silakan masuk." };
      if (error.code === "weak_password") return { ok: false, error: "Password terlalu lemah." };
      return { ok: false, error: "Pendaftaran gagal, coba lagi." };
    }
    return supabaseRepo.signIn(email, password);
  },

  async signOut() {
    await (await authClient()).auth.signOut();
  },

  async currentUser() {
    const { data } = await (await authClient()).auth.getUser();
    return data.user?.email ? { id: data.user.id, email: data.user.email } : null;
  },

  async currentProfile() {
    const { data } = await (await authClient()).auth.getUser();
    if (!data.user) return null;
    const { data: p } = await db().from("profiles").select("*").eq("id", data.user.id).maybeSingle();
    return (p as Profile) ?? null;
  },

  async listProfiles() {
    return must(await db().from("profiles").select("*").order("email")) as Profile[];
  },

  async createProfile(profile) {
    must(await db().from("profiles").insert(profile));
  },

  async updateProfile(id, patch) {
    must(await db().from("profiles").update(patch).eq("id", id));
  },

  async listCustomers() {
    return must(await db().from("customers").select(CUSTOMER_SELECT).order("company_name")) as Customer[];
  },

  async getCustomer(id) {
    return must(await db().from("customers").select(CUSTOMER_SELECT).eq("id", id).maybeSingle()) as Customer | null;
  },

  async insertCustomer(input, pics, actorId) {
    const c = must(await db().from("customers").insert({ ...input, created_by: actorId }).select().single()) as Customer;
    if (pics.length)
      must(await db().from("customer_pics").insert(pics.map(({ id: _, ...p }) => ({ ...p, customer_id: c.id }))));
    return (await this.getCustomer(c.id))!;
  },

  async updateCustomer(id, input, pics) {
    must(await db().from("customers").update({ ...input, updated_at: new Date().toISOString() }).eq("id", id));
    const keep = pics.filter((p) => p.id).map((p) => p.id!);
    let del = db().from("customer_pics").delete().eq("customer_id", id);
    if (keep.length) del = del.not("id", "in", `(${keep.join(",")})`);
    must(await del);
    for (const p of pics.filter((p) => p.id))
      must(
        await db()
          .from("customer_pics")
          .update({ name: p.name, email: p.email, phone: p.phone, position: p.position })
          .eq("id", p.id!),
      );
    const fresh = pics.filter((p) => !p.id).map(({ id: _, ...p }) => ({ ...p, customer_id: id }));
    if (fresh.length) must(await db().from("customer_pics").insert(fresh));
  },

  async listInvoices() {
    return must(await db().from("invoices").select("*").order("created_at", { ascending: false })) as Invoice[];
  },

  async listGroup(groupId) {
    return must(await db().from("invoices").select("*").eq("group_id", groupId).order("installment")) as Invoice[];
  },

  async getInvoice(id) {
    const inv = must(
      await db()
        .from("invoices")
        .select("*, items:invoice_items(*), events:invoice_events(*), webhooks:webhook_events(*), payments:invoice_payments(*)")
        .eq("id", id)
        .maybeSingle(),
    ) as InvoiceFull | null;
    if (!inv) return null;
    inv.items.sort((a, b) => a.position - b.position);
    inv.events.sort((a, b) => a.created_at.localeCompare(b.created_at));
    inv.webhooks.sort((a, b) => b.created_at.localeCompare(a.created_at));
    inv.payments.sort((a, b) => a.created_at.localeCompare(b.created_at));
    for (const p of inv.payments) p.amount = Number(p.amount);
    for (const i of inv.items) i.discount_percent = Number(i.discount_percent ?? 0);
    return inv;
  },

  async insertInvoice(data, items) {
    const inv = must(await db().from("invoices").insert(data).select().single()) as Invoice;
    if (items.length) must(await db().from("invoice_items").insert(items.map((i) => ({ ...i, invoice_id: inv.id }))));
    return inv;
  },

  async updateInvoice(id, patch, opts = {}) {
    let q = db()
      .from("invoices")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (opts.expect) q = q.in("status", opts.expect);
    const rows = must(await q.select()) as Invoice[];
    if (!rows.length) return null;
    if (opts.items) {
      must(await db().from("invoice_items").delete().eq("invoice_id", id));
      if (opts.items.length)
        must(await db().from("invoice_items").insert(opts.items.map((i) => ({ ...i, invoice_id: id }))));
    }
    return rows[0];
  },

  async deleteInvoice(id, expect) {
    const proofs = must(await db().from("invoice_payments").select("proof_path").eq("invoice_id", id)) as { proof_path: string }[];
    const rows = must(await db().from("invoices").delete().eq("id", id).in("status", expect).select("id"));
    if (!(rows as unknown[]).length) return false;
    if (proofs.length) await db().storage.from(PROOF_BUCKET).remove(proofs.map((p) => p.proof_path));
    return true;
  },

  async insertEvent(e) {
    must(await db().from("invoice_events").insert(e));
  },

  async insertPayment(p, file) {
    const up = await db().storage.from(PROOF_BUCKET).upload(p.proof_path, file, { contentType: p.content_type });
    if (up.error) throw new Error(up.error.message);
    try {
      const row = must(await db().from("invoice_payments").insert(p).select().single()) as Payment;
      return { ...row, amount: Number(row.amount) };
    } catch (e) {
      await db().storage.from(PROOF_BUCKET).remove([p.proof_path]);
      throw e;
    }
  },

  async getPayment(id) {
    const row = must(await db().from("invoice_payments").select("*").eq("id", id).maybeSingle()) as Payment | null;
    return row && { ...row, amount: Number(row.amount) };
  },

  async readProof(path) {
    const { data, error } = await db().storage.from(PROOF_BUCKET).download(path);
    return error || !data ? null : new Uint8Array(await data.arrayBuffer());
  },

  async nextSequence(key) {
    return must(await db().rpc("next_sequence", { p_key: key })) as number;
  },

  async nextSequenceBlock(key, n) {
    const last = must(await db().rpc("next_sequence_block", { p_key: key, p_n: n })) as number;
    return last - n + 1;
  },

  async insertWebhook(w) {
    must(await db().from("webhook_events").insert(w));
  },

  async updateWebhook(id, patch) {
    must(await db().from("webhook_events").update(patch).eq("id", id));
  },

  async getWebhook(id) {
    return must(await db().from("webhook_events").select("*").eq("id", id).maybeSingle());
  },

  async claimInboundEvent(eventId, eventType) {
    const { error } = await db().from("inbound_events").insert({ event_id: eventId, event_type: eventType });
    if (!error) return true;
    if (error.code === "23505") return false;
    throw new Error(error.message);
  },

  async releaseInboundEvent(eventId) {
    must(await db().from("inbound_events").delete().eq("event_id", eventId));
  },

  async getSetting(key) {
    const row = must(await db().from("app_settings").select("value").eq("key", key).maybeSingle()) as { value: string } | null;
    return row?.value ?? null;
  },

  async setSetting(key, value) {
    must(await db().from("app_settings").upsert({ key, value, updated_at: new Date().toISOString() }));
  },
};
