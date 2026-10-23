"use client";

import { useState, useTransition } from "react";
import { savePreparersAction } from "@/app/actions";
import { Icon } from "./Icon";
import { SuratJalanPaper, type SuratJalanData, type SjRow } from "./SuratJalanPaper";

export function SuratJalanForm({
  initial,
  preparers: initialPreparers,
}: {
  initial: Omit<SuratJalanData, "prepared_by" | "po_no" | "vendor_no">;
  preparers: string[];
}) {
  const [preparers, setPreparers] = useState(initialPreparers);
  const [prepared, setPrepared] = useState(initialPreparers[0] ?? "");
  const [newName, setNewName] = useState("");
  const [customer, setCustomer] = useState(initial.customer);
  const [po, setPo] = useState("");
  const [vendor, setVendor] = useState("");
  const [rows, setRows] = useState<SjRow[]>(initial.rows);
  const [err, setErr] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const persist = (names: string[], pick?: string) =>
    start(async () => {
      const res = await savePreparersAction(names);
      if (res.error) return setErr(res.error);
      setErr(null);
      const saved = res.names ?? names;
      setPreparers(saved);
      setPrepared(pick !== undefined ? pick : saved.includes(prepared) ? prepared : (saved[0] ?? ""));
    });

  const add = () => {
    const n = newName.trim().replace(/\s+/g, " ");
    if (!n) return;
    setNewName("");
    if (preparers.includes(n)) return setPrepared(n);
    persist([...preparers, n], n);
  };

  const setRow = (i: number, patch: Partial<SjRow>) => setRows(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));

  const data: SuratJalanData = { ...initial, customer, po_no: po, vendor_no: vendor, prepared_by: prepared, rows };

  return (
    <div className="dgrid">
      <div className="dpanels noprint">
        <div className="panel">
          <h3>Data Surat Jalan</h3>
          {err && <div className="err">{err}</div>}
          <div className="f">
            <label>Prepared By</label>
            <select value={prepared} onChange={(e) => setPrepared(e.target.value)}>
              {!preparers.length && <option value="">—</option>}
              {preparers.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="f">
            <label>Tambah / hapus nama</label>
            <div style={{ display: "flex", gap: 6 }}>
              <input
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
                placeholder="Nama baru"
              />
              <button type="button" className="btn sm" onClick={add} disabled={pending || !newName.trim()}>
                <Icon n="plus" s={14} /> Tambah
              </button>
            </div>
            <div className="chips" style={{ margin: "4px 0 0" }}>
              {preparers.map((p) => (
                <span key={p} className="chip">
                  {p}
                  <button
                    type="button"
                    className="chip-x"
                    title={`Hapus ${p}`}
                    disabled={pending}
                    onClick={() => persist(preparers.filter((x) => x !== p))}
                  >
                    <Icon n="x" s={12} />
                  </button>
                </span>
              ))}
            </div>
          </div>
          <div className="f">
            <label>Sales No.</label>
            <input value={initial.sales_no} readOnly disabled />
          </div>
          <div className="two">
            <div className="f">
              <label>No. PO</label>
              <input value={po} onChange={(e) => setPo(e.target.value)} placeholder="Nomor PO" />
            </div>
            <div className="f">
              <label>No. Vendor</label>
              <input value={vendor} onChange={(e) => setVendor(e.target.value)} placeholder="Nomor vendor" />
            </div>
          </div>
          <div className="f" style={{ marginBottom: 0 }}>
            <label>Customer Information</label>
            <textarea value={customer} onChange={(e) => setCustomer(e.target.value)} style={{ height: 120 }} />
          </div>
        </div>

        <div className="panel">
          <h3>
            Item <span className="mut">{rows.length}</span>
          </h3>
          {rows.map((r, i) => (
            <div key={i} className="sj-row">
              <small className="hint">
                {i + 1}. {r.sku || "—"} · {r.quantity.toLocaleString("en-US")} {r.uom}
              </small>
              <div className="f">
                <input value={r.product} onChange={(e) => setRow(i, { product: e.target.value })} placeholder="Product" />
              </div>
              <div className="two">
                <div className="f">
                  <input value={r.variant} onChange={(e) => setRow(i, { variant: e.target.value })} placeholder="Variant" />
                </div>
                <div className="f">
                  <input value={r.remarks} onChange={(e) => setRow(i, { remarks: e.target.value })} placeholder="Remarks" />
                </div>
              </div>
            </div>
          ))}
        </div>

        <button type="button" className="btn pri block" onClick={() => window.print()} disabled={!prepared}>
          <Icon n="printer" /> Cetak / Simpan PDF
        </button>
      </div>
      <SuratJalanPaper d={data} />
    </div>
  );
}
