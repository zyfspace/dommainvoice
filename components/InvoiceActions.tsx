"use client";

import Link from "next/link";
import { useActionState } from "react";
import {
  cancelAction,
  deleteInvoiceAction,
  financeAction,
  issueManualAction,
  submitInvoiceAction,
  type FormState,
} from "@/app/actions";
import { invoiceFileName } from "@/lib/company";
import { CANCELLABLE, DELETABLE, EDITABLE, PRINTABLE, SURAT_JALAN_ROLES, deliveryGate, installmentLabel, suratJalanReady } from "@/lib/domain";
import type { Invoice, Role } from "@/lib/types";
import { Icon } from "./Icon";
import { DownloadButton, PrintButton } from "./PrintButton";
import { PrintedNote } from "./Status";

function Msg({ s }: { s: FormState }) {
  if (s?.error) return <div className="err" style={{ marginTop: 10, marginBottom: 0 }}>{s.error}</div>;
  if (s?.ok) return <div className="ok" style={{ marginTop: 10, marginBottom: 0 }}>{s.ok}</div>;
  return null;
}

function Approve({ id }: { id: string }) {
  const [s, act, pending] = useActionState(financeAction, undefined);
  return (
    <form action={act}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="action" value="approve" />
      <button className="btn pri block" disabled={pending}>
        <Icon n="check" /> {pending ? "Memproses…" : "Approve"}
      </button>
      <Msg s={s} />
    </form>
  );
}

function NoteForm({
  id,
  label,
  action,
  field,
  placeholder,
  submit,
  extra,
}: {
  id: string;
  label: string;
  action: (s: FormState, fd: FormData) => Promise<FormState>;
  field: string;
  placeholder: string;
  submit: string;
  extra?: Record<string, string>;
}) {
  const [s, act, pending] = useActionState(action, undefined);
  return (
    <details className="act">
      <summary className="btn block">{label}</summary>
      <form action={act}>
        <input type="hidden" name="id" value={id} />
        {extra && Object.entries(extra).map(([k, v]) => <input key={k} type="hidden" name={k} value={v} />)}
        <textarea className="in" name={field} placeholder={placeholder} required />
        <button className="btn danger block" style={{ marginTop: 8 }} disabled={pending}>
          {pending ? "Memproses…" : submit}
        </button>
        <Msg s={s} />
      </form>
    </details>
  );
}

function Submit({ id }: { id: string }) {
  const [s, act, pending] = useActionState(submitInvoiceAction, undefined);
  return (
    <form action={act}>
      <input type="hidden" name="id" value={id} />
      <button className="btn pri block" disabled={pending}>
        <Icon n="send" /> {pending ? "Mengajukan…" : "Ajukan ke Finance"}
      </button>
      <Msg s={s} />
    </form>
  );
}

function Delete({ id }: { id: string }) {
  const [s, act, pending] = useActionState(deleteInvoiceAction, undefined);
  return (
    <details className="act">
      <summary className="btn block">
        <Icon n="trash" /> Hapus invoice
      </summary>
      <form action={act}>
        <input type="hidden" name="id" value={id} />
        <p className="hint" style={{ margin: "0 0 8px" }}>
          Invoice beserta riwayatnya dihapus permanen dan tidak bisa dikembalikan.
        </p>
        <button className="btn danger block" disabled={pending}>
          {pending ? "Menghapus…" : "Ya, hapus permanen"}
        </button>
        <Msg s={s} />
      </form>
    </details>
  );
}

function IssueManual({ id }: { id: string }) {
  const [s, act, pending] = useActionState(issueManualAction, undefined);
  return (
    <details className="act">
      <summary className="btn block">Tandai Issued manual</summary>
      <form action={act}>
        <input type="hidden" name="id" value={id} />
        <p className="hint" style={{ margin: "0 0 8px" }}>
          Pakai ini kalau penerbitan otomatis gagal. Kosongkan URL untuk memakai halaman cetak dashboard.
        </p>
        <input className="in" name="pdf_url" type="url" placeholder="URL PDF (opsional)" />
        <button className="btn block" style={{ marginTop: 8 }} disabled={pending}>
          {pending ? "Memproses…" : "Tandai Issued"}
        </button>
        <Msg s={s} />
      </form>
    </details>
  );
}

export function InvoiceActions({ inv, role, group }: { inv: Invoice; role: Role; group: Invoice[] }) {
  const adminCan = role === "admin" && EDITABLE.includes(inv.status);
  const financeReview = role === "finance" && inv.status === "on_check";
  const financeOther = role === "finance" && CANCELLABLE.includes(inv.status);
  const suratJalan = suratJalanReady(inv, group) && SURAT_JALAN_ROLES.includes(role);
  const dpEdit = (inv.installment ?? 0) > 1 ? group.find((g) => g.installment === 1) : null;
  const gate = inv.group_id ? deliveryGate(group) : undefined;

  return (
    <div className="panel">
      <h3>Tindakan</h3>
      <div className="actions" style={{ marginTop: 0 }}>
        {adminCan && (
          <>
            <Submit id={inv.id} />
            <Link href={`/invoices/${(dpEdit ?? inv).id}/edit`} className="btn block">
              <Icon n="edit" /> Edit invoice
            </Link>
          </>
        )}

        {financeReview && (
          <>
            <Approve id={inv.id} />
            <NoteForm
              id={inv.id}
              label="Minta revisi"
              action={financeAction}
              field="notes"
              extra={{ action: "revision" }}
              placeholder="Catatan revisi"
              submit="Kirim permintaan revisi"
            />
            <NoteForm
              id={inv.id}
              label="Tolak"
              action={financeAction}
              field="notes"
              extra={{ action: "reject" }}
              placeholder="Alasan penolakan"
              submit="Tolak invoice"
            />
          </>
        )}

        {suratJalan && (
          <Link href={`/invoices/${inv.id}/surat-jalan`} className="btn pri block">
            <Icon n="printer" /> Cetak Surat Jalan
          </Link>
        )}
        {!suratJalan && inv.group_id && inv.status === "paid" && gate && (
          <p className="hint" style={{ margin: 0 }}>
            {gate.id === inv.id
              ? "Surat Jalan bisa dicetak setelah tahap sebelumnya juga Paid."
              : (gate.installment ?? 0) < (inv.installment ?? 0)
                ? `Surat Jalan dicetak dari invoice ${installmentLabel(gate)} (${gate.invoice_number ?? "—"}).`
                : `Surat Jalan dicetak dari invoice ${installmentLabel(gate)} setelah tahap itu Paid.`}
          </p>
        )}

        {role === "finance" && inv.status === "approved" && <IssueManual id={inv.id} />}

        {role === "finance" && CANCELLABLE.includes(inv.status) && (
          <NoteForm
            id={inv.id}
            label="Batalkan invoice"
            action={cancelAction}
            field="reason"
            placeholder="Alasan pembatalan"
            submit="Batalkan invoice"
          />
        )}

        {!adminCan && !financeReview && !financeOther && !suratJalan && !(inv.group_id && inv.status === "paid") && (
          <p className="hint" style={{ margin: 0 }}>
            {role === "admin" && inv.status === "on_check"
              ? "Menunggu pemeriksaan Finance."
              : role === "finance" && EDITABLE.includes(inv.status)
                ? "Menunggu Admin mengajukan invoice."
                : "Tidak ada aksi untuk status ini."}
          </p>
        )}

        {PRINTABLE.includes(inv.status) && (
          <>
            <div className="doc-btns">
              <DownloadButton fileName={invoiceFileName(inv)} />
              <PrintButton id={inv.id} small />
            </div>
            {inv.printed_at && <PrintedNote name={inv.printed_by_name} at={inv.printed_at} />}
          </>
        )}

        {DELETABLE.includes(inv.status) && <Delete id={inv.id} />}
      </div>
    </div>
  );
}
