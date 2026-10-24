import Link from "next/link";
import { notFound } from "next/navigation";
import { Icon } from "@/components/Icon";
import { InvoiceActions } from "@/components/InvoiceActions";
import { InvoiceGroup } from "@/components/InvoiceGroup";
import { InvoicePaper } from "@/components/InvoicePaper";
import { IssueWatcher } from "@/components/IssueWatcher";
import { PaymentsPanel } from "@/components/PaymentsPanel";
import { RevisionNotes } from "@/components/RevisionNotes";
import { StatusPair } from "@/components/Status";
import { requireProfile } from "@/lib/auth";
import { STATUS_LABEL, fmtDateTime } from "@/lib/domain";
import { getInvoiceCached, repo } from "@/lib/repo";
import type { InvoiceFull } from "@/lib/types";

const ACTION_LABEL: Record<string, string> = {
  created: "Invoice dibuat",
  edited: "Invoice diedit",
  submitted: "Diajukan ke Finance",
  resubmitted: "Diajukan ulang setelah revisi",
  approved: "Disetujui Finance",
  rejected: "Ditolak Finance",
  revision_requested: "Revisi diminta",
  cancelled: "Dibatalkan",
  issued: "PDF diterbitkan otomatis",
  issued_manual: "Diterbitkan manual",
  paid: "Bukti pembayaran diupload — Paid",
  printed: "Invoice dicetak",
  reprinted: "Invoice dicetak ulang",
  email_sent: "Email terkirim",
  sheets_synced: "Tersinkron ke Google Sheets",
  workflow_failed: "Penerbitan otomatis gagal",
};

const ISSUE_EVENTS = ["issued", "email_sent", "sheets_synced", "workflow_failed"];

/** True selama penerbitan otomatis masih berjalan (belum lengkap, belum gagal, bukan terbit manual). */
function issuePending(inv: InvoiceFull) {
  if (inv.status !== "approved" && inv.status !== "issued") return false;
  if (inv.events.some((e) => e.action === "issued_manual")) return false;
  if (inv.issued_at && inv.email_sent_at && inv.sheets_synced_at) return false;
  const last = [...inv.events].reverse().find((e) => e.action === "approved" || ISSUE_EVENTS.includes(e.action));
  return last?.action !== "workflow_failed";
}

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const inv = await getInvoiceCached((await params).id);
  return { title: inv?.invoice_number ?? inv?.company_name ?? "Invoice" };
}

export default async function InvoiceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireProfile();
  const inv = await getInvoiceCached(id);
  if (!inv) notFound();
  const group = inv.group_id ? await repo.listGroup(inv.group_id) : [inv];
  const lastEvent = [...inv.events].reverse().find((e) => e.to_status === inv.status);
  const lastNote = lastEvent?.notes;

  return (
    <>
      <Link href="/invoices" className="crumb">
        <Icon n="back" s={14} /> Invoices
      </Link>
      <div className="top">
        <div style={{ marginRight: "auto", minWidth: 0 }}>
          <h1 className="num">{inv.invoice_number ?? "Belum bernomor"}</h1>
          <div className="sub">
            {inv.company_name} · dibuat {fmtDateTime(inv.created_at)} oleh {inv.created_by_email}
          </div>
        </div>
        <StatusPair inv={inv} lg />
      </div>

      {inv.status === "revision_requested" && (
        <RevisionNotes
          title="Revisi diminta Finance"
          notes={inv.revision_notes}
          meta={lastEvent && [lastEvent.actor_email, fmtDateTime(lastEvent.created_at)].filter(Boolean).join(" · ")}
        />
      )}
      {inv.status === "rejected" && (
        <div className="banner dark">
          <Icon n="ban" s={18} />
          <div>
            <b>Invoice ditolak</b>
            {lastNote}
          </div>
        </div>
      )}
      {inv.status === "cancelled" && (
        <div className="banner dark">
          <Icon n="ban" s={18} />
          <div>
            <b>Invoice dibatalkan</b>
            {inv.cancel_reason}
          </div>
        </div>
      )}
      <IssueWatcher pending={issuePending(inv)} />

      <div className="dgrid">
        <div className="dpanels">
          <InvoiceActions inv={inv} role={me.role} group={group} />
          <InvoiceGroup current={inv} group={group} />
          <PaymentsPanel inv={inv} role={me.role} />

          <div className="panel">
            <h3>Detail</h3>
            <div className="kv"><span>Status</span><span>{STATUS_LABEL[inv.status]}</span></div>
            <div className="kv"><span>Dibuat oleh</span><span>{inv.created_by_email}</span></div>
            <div className="kv"><span>Disetujui</span><span>{fmtDateTime(inv.approved_at)}</span></div>
            <div className="kv"><span>Diterbitkan</span><span>{fmtDateTime(inv.issued_at)}</span></div>
            <div className="kv"><span>Email terkirim</span><span>{fmtDateTime(inv.email_sent_at)}</span></div>
            <div className="kv"><span>Google Sheets</span><span>{fmtDateTime(inv.sheets_synced_at)}</span></div>
            {inv.customer_id && (
              <div className="kv">
                <span>Customer</span>
                <Link href={`/customers/${inv.customer_id}`} style={{ textDecoration: "underline" }}>
                  Lihat data
                </Link>
              </div>
            )}
          </div>

          <div className="panel">
            <h3>
              Riwayat status <span className="mut">{inv.events.length}</span>
            </h3>
            <ul className="tl">
              {inv.events.map((e) => (
                <li key={e.id}>
                  <b>{ACTION_LABEL[e.action] ?? e.action}</b>
                  <small>
                    {e.actor_email} · {fmtDateTime(e.created_at)}
                  </small>
                  {e.notes && <p>{e.notes}</p>}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <InvoicePaper inv={inv} />
      </div>
    </>
  );
}
