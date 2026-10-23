import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { repo } from "./repo";
import type { Invoice, WebhookEvent } from "./types";

export type OutboundEvent =
  | "invoice.submitted"
  | "invoice.approved"
  | "invoice.revision_requested"
  | "invoice.rejected"
  | "invoice.cancelled";

const PATH: Record<OutboundEvent, string> = {
  "invoice.submitted": "/webhook/invoice/submitted",
  "invoice.approved": "/webhook/invoice/approved",
  "invoice.revision_requested": "/webhook/invoice/revision",
  "invoice.rejected": "/webhook/invoice/rejected",
  "invoice.cancelled": "/webhook/invoice/cancelled",
};

export const n8nConfigured = () => Boolean(process.env.N8N_WEBHOOK_BASE_URL);

/** Catat event di outbox lalu kirim ke n8n. Kegagalan tidak membatalkan aksi, hanya dicatat untuk retry. */
export async function emit(type: OutboundEvent, inv: Invoice, extra: Record<string, unknown>) {
  const id = `evt_${randomUUID()}`;
  const payload = {
    event_id: id,
    event_type: type,
    invoice_id: inv.id,
    invoice_number: inv.invoice_number,
    status: inv.status,
    dashboard_url: `${process.env.APP_URL ?? ""}/invoices/${inv.id}`,
    timestamp: new Date().toISOString(),
    ...extra,
  };
  await repo.insertWebhook({
    id,
    event_type: type,
    invoice_id: inv.id,
    payload,
    status: "pending",
    attempts: 0,
    last_error: null,
    sent_at: null,
  });
  await deliver({ id, event_type: type, payload, attempts: 0 });
}

export async function deliver(w: Pick<WebhookEvent, "id" | "event_type" | "payload" | "attempts">) {
  const base = process.env.N8N_WEBHOOK_BASE_URL;
  if (!base) {
    await repo.updateWebhook(w.id, { status: "skipped", last_error: "N8N_WEBHOOK_BASE_URL belum diisi" });
    return;
  }
  try {
    const res = await fetch(base.replace(/\/$/, "") + PATH[w.event_type as OutboundEvent], {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-domma-secret": process.env.N8N_WEBHOOK_SECRET ?? "",
        "x-event-id": w.id,
      },
      body: JSON.stringify(w.payload),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    await repo.updateWebhook(w.id, {
      status: "sent",
      attempts: w.attempts + 1,
      last_error: null,
      sent_at: new Date().toISOString(),
    });
  } catch (e) {
    await repo.updateWebhook(w.id, {
      status: "failed",
      attempts: w.attempts + 1,
      last_error: e instanceof Error ? e.message : String(e),
    });
  }
}

/** Autentikasi server-to-server untuk endpoint yang dipanggil n8n. */
export function verifyCallback(req: Request) {
  const expected = process.env.N8N_CALLBACK_SECRET;
  return Boolean(expected) && req.headers.get("x-domma-secret") === expected;
}

/**
 * Token sementara agar n8n bisa merender halaman cetak invoice menjadi PDF tanpa sesi login.
 * Format: "<exp unix detik>.<hmac sha256>" ditandatangani dengan N8N_CALLBACK_SECRET, terikat ke 1 invoice.
 */
export function printToken(invoiceId: string, ttlSeconds = 15 * 60) {
  const secret = process.env.N8N_CALLBACK_SECRET;
  if (!secret) return null;
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return `${exp}.${signPrint(secret, invoiceId, exp)}`;
}

export function verifyPrintToken(invoiceId: string, token: string | null | undefined) {
  const secret = process.env.N8N_CALLBACK_SECRET;
  if (!secret || !token) return false;
  const [expRaw, sig] = token.split(".");
  const exp = Number(expRaw);
  if (!sig || !Number.isInteger(exp) || exp < Math.floor(Date.now() / 1000)) return false;
  const expected = Buffer.from(signPrint(secret, invoiceId, exp));
  const given = Buffer.from(sig);
  return expected.length === given.length && timingSafeEqual(expected, given);
}

function signPrint(secret: string, invoiceId: string, exp: number) {
  return createHmac("sha256", secret).update(`print:${invoiceId}:${exp}`).digest("hex");
}
