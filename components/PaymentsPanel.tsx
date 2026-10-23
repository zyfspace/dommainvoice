"use client";

import { useActionState, useState } from "react";
import { recordPaymentAction } from "@/app/actions";
import { PAYABLE, PAYMENT_ROLES, fmtDateTime, invoiceDue, rupiah } from "@/lib/domain";
import type { InvoiceFull, Role } from "@/lib/types";
import { Icon } from "./Icon";

function UploadForm({ inv }: { inv: InvoiceFull }) {
  const [s, act, pending] = useActionState(recordPaymentAction, undefined);
  const [file, setFile] = useState<File | null>(null);
  return (
    <form action={act}>
      <input type="hidden" name="id" value={inv.id} />
      <label className={`drop${file ? " on" : ""}`}>
        <input
          type="file"
          name="proof"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          required
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
        <Icon n={file ? "file" : "plus"} s={18} />
        <span>
          <b>{file ? file.name : "Pilih bukti transfer"}</b>
          <small>{file ? `${(file.size / 1024 / 1024).toFixed(2)} MB · klik untuk ganti` : "JPG, PNG, WEBP, atau PDF · maks 5 MB"}</small>
        </span>
      </label>
      <div className="f" style={{ marginTop: 12 }}>
        <label>Catatan</label>
        <input name="notes" placeholder="Catatan (opsional)" />
      </div>
      <button className="btn pri block" disabled={pending || !file}>
        <Icon n="check" /> {pending ? "Mengupload…" : "Upload & tandai Paid"}
      </button>
      {s?.error && <div className="err" style={{ marginTop: 10, marginBottom: 0 }}>{s.error}</div>}
    </form>
  );
}

/** Bukti pembayaran invoice — satu invoice satu bukti (DP & pelunasan = invoice terpisah). */
export function PaymentsPanel({ inv, role }: { inv: InvoiceFull; role: Role }) {
  const p = inv.payments[0];
  const canUpload = !p && PAYMENT_ROLES.includes(role) && PAYABLE.includes(inv.status);
  if (!p && !canUpload) return null;

  return (
    <div className="panel">
      <h3>Bukti pembayaran</h3>
      {p ? (
        <>
          <div className="kv"><span>Nominal</span><span>{rupiah(p.amount)}</span></div>
          <div className="kv"><span>Diupload</span><span>{fmtDateTime(p.created_at)}</span></div>
          <div className="kv"><span>Oleh</span><span>{p.created_by_email}</span></div>
          {p.notes && <div className="kv"><span>Catatan</span><span>{p.notes}</span></div>}
          <a href={`/api/payments/${p.id}`} target="_blank" className="btn block" style={{ marginTop: 12 }}>
            <Icon n="file" s={14} /> Lihat bukti transfer
          </a>
        </>
      ) : (
        <>
          <div className="kv" style={{ marginBottom: 12 }}>
            <span>{inv.payable_label ?? "Tagihan"}</span>
            <span>{rupiah(invoiceDue(inv))}</span>
          </div>
          <UploadForm inv={inv} />
        </>
      )}
    </div>
  );
}
