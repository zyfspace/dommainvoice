"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { saveCustomerAction } from "@/app/actions";
import type { Customer } from "@/lib/types";
import { Icon } from "./Icon";

type PicRow = { key: number; id?: string; name: string; email: string; phone: string; position: string };
let seq = 0;
const blank = (): PicRow => ({ key: ++seq, name: "", email: "", phone: "", position: "" });

export function CustomerForm({
  initial,
  readOnly,
  returnTo,
}: {
  initial?: Customer;
  readOnly?: boolean;
  returnTo?: string;
}) {
  const [state, action, pending] = useActionState(saveCustomerAction, undefined);
  const [pics, setPics] = useState<PicRow[]>(
    initial?.pics.length
      ? initial.pics.map((p) => ({
          key: ++seq,
          id: p.id,
          name: p.name,
          email: p.email ?? "",
          phone: p.phone ?? "",
          position: p.position ?? "",
        }))
      : [blank()],
  );
  // Read-only (Finance) tanpa PIC: tampilkan keterangan, bukan baris input kosong.
  const noPic = readOnly && !initial?.pics.length;
  const set = (key: number, patch: Partial<PicRow>) =>
    setPics((ps) => ps.map((p) => (p.key === key ? { ...p, ...patch } : p)));

  return (
    <form action={action}>
      {initial && <input type="hidden" name="id" value={initial.id} />}
      {returnTo && <input type="hidden" name="return_to" value={returnTo} />}
      <input type="hidden" name="pics" value={JSON.stringify(pics.map(({ key: _, ...p }) => p))} />
      {state?.error && <div className="err">{state.error}</div>}

      <fieldset className="cform" disabled={readOnly}>
        <div className="panel">
          <h3>
            <Icon n="bld" /> Perusahaan
          </h3>
          <div className="f">
            <label>
              Nama perusahaan <i>*</i>
            </label>
            <input name="company_name" defaultValue={initial?.company_name} required placeholder="Nama perusahaan" />
          </div>
          <div className="two">
            <div className="f">
              <label>Email perusahaan</label>
              <input name="email" type="email" defaultValue={initial?.email ?? ""} />
            </div>
            <div className="f">
              <label>Telepon</label>
              <input name="phone" defaultValue={initial?.phone ?? ""} />
            </div>
          </div>
          <div className="two">
            <div className="f">
              <label>Billing address</label>
              <textarea name="billing_address" defaultValue={initial?.billing_address ?? ""} />
            </div>
            <div className="f">
              <label>NPWP</label>
              <input name="npwp" defaultValue={initial?.npwp ?? ""} />
              <label style={{ marginTop: 10 }}>Catatan</label>
              <input name="notes" defaultValue={initial?.notes ?? ""} />
            </div>
          </div>
        </div>

        <div className="panel">
          <h3>
            <Icon n="users" /> PIC <span className="mut">{noPic ? 0 : pics.length} orang</span>
          </h3>
          {noPic && <p className="hint" style={{ margin: 0 }}>Belum ada PIC.</p>}
          {!noPic && pics.map((p) => (
            <div className="pic-row" key={p.key}>
              <div className="f">
                <label>
                  Nama <i>*</i>
                </label>
                <input className="in" value={p.name} onChange={(e) => set(p.key, { name: e.target.value })} required />
              </div>
              <div className="f">
                <label>Jabatan</label>
                <input className="in" value={p.position} onChange={(e) => set(p.key, { position: e.target.value })} />
              </div>
              <div className="f">
                <label>Email</label>
                <input className="in" type="email" value={p.email} onChange={(e) => set(p.key, { email: e.target.value })} />
              </div>
              <div className="f">
                <label>Telepon</label>
                <input className="in" value={p.phone} onChange={(e) => set(p.key, { phone: e.target.value })} />
              </div>
              {!readOnly && (
                <button
                  type="button"
                  className="ib"
                  title="Hapus PIC"
                  disabled={pics.length === 1}
                  onClick={() => setPics((ps) => ps.filter((x) => x.key !== p.key))}
                  style={{ marginBottom: 4 }}
                >
                  <Icon n="trash" />
                </button>
              )}
            </div>
          ))}
          {!readOnly && (
            <button type="button" className="btn sm" onClick={() => setPics((ps) => [...ps, blank()])}>
              <Icon n="plus" /> Tambah PIC
            </button>
          )}
        </div>
      </fieldset>

      {!readOnly && (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          <button className="btn pri" disabled={pending}>
            {pending ? "Menyimpan…" : "Simpan customer"}
          </button>
          <Link href={returnTo ?? "/customers"} className="btn ghost">
            Batal
          </Link>
        </div>
      )}
    </form>
  );
}
