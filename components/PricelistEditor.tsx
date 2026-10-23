"use client";

import { noSpin } from "@/lib/input";
import { useState, useTransition } from "react";
import { savePricelistAction, type FormState } from "@/app/actions";
import { rupiah } from "@/lib/domain";
import { tierLabels, validateSeries, type Pricelist, type SeriesPrice } from "@/lib/pricelist";
import { Icon } from "./Icon";

const COLS = [
  ["engrave", 0, "Engrave normal"],
  ["engrave", 1, "Engrave min"],
  ["plain", 0, "Non-engrave normal"],
  ["plain", 1, "Non-engrave min"],
] as const;

/** Draft editor: semua angka disimpan sebagai string supaya input bisa dikosongkan saat mengetik. */
type Draft = { tiers: string[]; engrave: [string, string][]; plain: [string, string][] };

const toDraft = (s: SeriesPrice): Draft => ({
  tiers: s.tiers.map(String),
  engrave: s.engrave.map(([n, m]) => [String(n), String(m)]),
  plain: s.plain.map(([n, m]) => [String(n), String(m)]),
});
const fromDraft = (label: string, d: Draft): SeriesPrice => ({
  label,
  tiers: d.tiers.map(Number),
  engrave: d.engrave.map(([n, m]) => [Number(n), Number(m)]),
  plain: d.plain.map(([n, m]) => [Number(n), Number(m)]),
});
const same = (a: SeriesPrice, b: SeriesPrice) =>
  JSON.stringify([a.tiers, a.engrave, a.plain]) === JSON.stringify([b.tiers, b.engrave, b.plain]);

export function PricelistEditor({ list, defaults, canEdit }: { list: Pricelist; defaults: Pricelist; canEdit: boolean }) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr)", gap: 12 }}>
      {Object.entries(list).map(([key, s]) => (
        <SeriesPanel key={key} k={key} s={s} def={defaults[key]} canEdit={canEdit} />
      ))}
    </div>
  );
}

function SeriesPanel({ k, s, def, canEdit }: { k: string; s: SeriesPrice; def: SeriesPrice; canEdit: boolean }) {
  const [draft, setDraft] = useState<Draft | null>(null);
  const [msg, setMsg] = useState<FormState>();
  const [pending, start] = useTransition();
  const changed = !same(s, def);

  const save = (price: SeriesPrice | null) =>
    start(async () => {
      const res = await savePricelistAction(k, price);
      setMsg(res);
      if (!res?.error) setDraft(null);
    });

  const edit = (fn: (d: Draft) => void) =>
    setDraft((d) => {
      if (!d) return d;
      const next = structuredClone(d);
      fn(next);
      return next;
    });

  const preview = draft ? fromDraft(s.label, draft) : s;
  const err = draft ? validateSeries(preview) : null;
  const labels = draft && !err ? tierLabels(preview) : tierLabels(s);

  return (
    <div className="panel">
      <h3>
        {s.label}
        {changed && <span className="tag">Diubah</span>}
        <span className="mut">{k}</span>
      </h3>
      <div className="tw">
        <table className="t pl">
          <colgroup>
            <col style={{ width: "12%" }} />
            <col style={{ width: "16%" }} />
            {COLS.map(([, , h]) => (
              <col key={h} />
            ))}
            {draft && <col style={{ width: 52 }} />}
          </colgroup>
          <thead>
            <tr>
              <th>Qty minimum</th>
              <th>Rentang</th>
              {COLS.map(([, , h]) => (
                <th key={h} className="r">
                  {h}
                </th>
              ))}
              {draft && <th />}
            </tr>
          </thead>
          <tbody>
            {(draft ? draft.tiers : s.tiers).map((t, i) => (
              <tr key={i}>
                <td className="num">
                  {draft ? (
                    <input
                      type="number"
                      {...noSpin}
                      min="1"
                      step="1"
                      value={t}
                      readOnly={i === 0}
                      onChange={(e) => edit((d) => void (d.tiers[i] = e.target.value))}
                      style={{ width: 90 }}
                    />
                  ) : (
                    t
                  )}
                </td>
                <td className="mut">{labels[i] ?? "—"}</td>
                {COLS.map(([c, j, h]) => (
                  <td key={h} className="r num">
                    {draft ? (
                      <input
                        type="number"
                        {...noSpin}
                        min="1"
                        step="1"
                        value={draft[c][i][j]}
                        onChange={(e) => edit((d) => void (d[c][i][j] = e.target.value))}
                        style={{ width: 110, textAlign: "right" }}
                      />
                    ) : (
                      rupiah(s[c][i][j])
                    )}
                  </td>
                ))}
                {draft && (
                  <td>
                    {i > 0 && (
                      <button
                        type="button"
                        className="ib"
                        title="Hapus tier"
                        onClick={() =>
                          edit((d) => {
                            d.tiers.splice(i, 1);
                            d.engrave.splice(i, 1);
                            d.plain.splice(i, 1);
                          })
                        }
                      >
                        <Icon n="trash" s={14} />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {err && <div className="err" style={{ marginTop: 10 }}>{err}</div>}
      {msg?.error && <div className="err" style={{ marginTop: 10 }}>{msg.error}</div>}
      {canEdit && (
        <div style={{ marginTop: 12, display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {draft ? (
            <>
              <button
                type="button"
                className="btn sm"
                onClick={() =>
                  edit((d) => {
                    const last = d.tiers.length - 1;
                    d.tiers.push(String(Number(d.tiers[last]) + 1));
                    d.engrave.push([...d.engrave[last]]);
                    d.plain.push([...d.plain[last]]);
                  })
                }
              >
                <Icon n="plus" s={14} /> Tambah tier
              </button>
              <span style={{ marginLeft: "auto" }} />
              <button type="button" className="btn sm ghost" onClick={() => setDraft(null)} disabled={pending}>
                Batal
              </button>
              <button type="button" className="btn sm pri" disabled={pending || !!err} onClick={() => save(preview)}>
                <Icon n="check" s={14} /> {pending ? "Menyimpan…" : "Simpan"}
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn sm" onClick={() => (setMsg(undefined), setDraft(toDraft(s)))}>
                <Icon n="edit" s={14} /> Edit harga
              </button>
              {changed && (
                <button type="button" className="btn sm ghost" disabled={pending} onClick={() => save(null)}>
                  <Icon n="refresh" s={14} /> Kembalikan default
                </button>
              )}
              {msg?.ok && <span className="hint">{msg.ok}</span>}
            </>
          )}
        </div>
      )}
    </div>
  );
}
