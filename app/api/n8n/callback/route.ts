import { verifyCallback } from "@/lib/n8n";
import { repo } from "@/lib/repo";
import { ServiceError, markIssued, recordSystemEvent } from "@/lib/service";

/**
 * Callback hasil workflow n8n → dashboard.
 * Header: x-domma-secret: <N8N_CALLBACK_SECRET>
 *
 * { event_id, event_type: "invoice.issued",   invoice_id, pdf_url, email_sent_at? }
 * { event_id, event_type: "invoice.email_sent", invoice_id, sent_at?, recipients? }
 * { event_id, event_type: "sheets.synced",    invoice_id, synced_at? }
 * { event_id, event_type: "workflow.failed",  invoice_id, workflow, error }
 *
 * event_id wajib & unik → retry dari n8n tidak diproses dua kali.
 */
export async function POST(req: Request) {
  if (!verifyCallback(req)) return Response.json({ error: "unauthorized" }, { status: 401 });

  let body: Record<string, string | undefined>;
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "invalid_json" }, { status: 400 });
  }
  const { event_id, event_type, invoice_id } = body;
  if (!event_id || !event_type || !invoice_id)
    return Response.json({ error: "event_id, event_type, invoice_id wajib" }, { status: 400 });

  if (!(await repo.getInvoice(invoice_id))) return Response.json({ error: "invoice_not_found" }, { status: 404 });
  if (!(await repo.claimInboundEvent(event_id, event_type)))
    return Response.json({ ok: true, duplicate: true });

  const ts = (v?: string) => (v && !Number.isNaN(Date.parse(v)) ? new Date(v).toISOString() : new Date().toISOString());

  try {
    switch (event_type) {
      case "invoice.issued":
        if (!body.pdf_url) throw new ServiceError("pdf_url wajib");
        await markIssued(null, invoice_id, {
          pdf_url: body.pdf_url,
          email_sent_at: body.email_sent_at ? ts(body.email_sent_at) : null,
        });
        break;
      case "invoice.email_sent":
        await recordSystemEvent(invoice_id, { email_sent_at: ts(body.sent_at) }, "email_sent", body.recipients ?? null);
        break;
      case "sheets.synced":
        await recordSystemEvent(invoice_id, { sheets_synced_at: ts(body.synced_at) }, "sheets_synced", null);
        break;
      case "workflow.failed":
        await recordSystemEvent(invoice_id, {}, "workflow_failed", `${body.workflow ?? "workflow"}: ${body.error ?? "unknown error"}`);
        break;
      default:
        throw new ServiceError("event_type tidak dikenal");
    }
  } catch (e) {
    await repo.releaseInboundEvent(event_id);
    if (e instanceof ServiceError) return Response.json({ error: e.message }, { status: 409 });
    throw e;
  }
  return Response.json({ ok: true });
}
