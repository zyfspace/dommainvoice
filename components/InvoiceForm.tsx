"use client";

import { noSpin } from "@/lib/input";
import Link from "next/link";
import { useActionState, useEffect, useMemo, useRef, useState } from "react";
import { saveInvoiceAction } from "@/app/actions";
import { DEFAULT_REMARKS, ENTITIES, UOM_OPTIONS } from "@/lib/company";
import { CUSTOMIZATION_LABEL, DEFAULT_TAX_RATE, DEFAULT_TERM, PAYMENT_TYPES, computeTotals, rupiah } from "@/lib/domain";
import type { Customer, Customization, Entity, InvoiceFull, PaymentType } from "@/lib/types";
import { DEFAULT_PRICELIST, quotePrice, type Pricelist } from "@/lib/pricelist";
import { productLabel } from "@/lib/products";
import { Icon } from "./Icon";
import { InvoicePaper } from "./InvoicePaper";
import { ProductPicker } from "./ProductPicker";
import { RemarksEditor } from "./RemarksEditor";

type Row = {
  key: number;
  sku: string;
  product: string;
  quantity: string;
  uom: string;
  unit_price: string;
  customization: Customization;
  notes: string;
  /** true = unit price mengikuti pricelist (berhenti saat diisi manual). */
  auto: boolean;
};

const NEW_PIC = "__new";

let seq = 0;
const blank = (): Row => ({
  key: ++seq,
  sku: "",
  product: "",
  quantity: "1",
  uom: "Pcs",
  unit_price: "",
  customization: "plain",
  notes: "",
  auto: true,
});

const quoteOf = (r: Row, list: Pricelist) =>
  quotePrice(r.sku, r.product, Number(r.quantity), r.customization, list);

function reprice(r: Row, list: Pricelist): Row {
  const q = r.auto ? quoteOf(r, list) : null;
  return q ? { ...r, unit_price: String(q.normal) } : r;
}

export function InvoiceForm({
  customers,
  initial,
  defaults,
  defaultRemarks = DEFAULT_REMARKS,
  pricelist = DEFAULT_PRICELIST,
  schedule,
  deliveryAfter,
}: {
  customers: Customer[];
  initial?: InvoiceFull;
  /** Edit grup DP / Termin: tahap pembayaran yang tersimpan. */
  schedule?: { percent: number; due_date: string }[];
  /** Edit grup: tahap (1-based) syarat cetak Surat Jalan. */
  deliveryAfter?: number;
  defaults: { invoice_date: string; due_date: string };
  /** Remarks default tersimpan untuk invoice baru. */
  defaultRemarks?: string;
  /** Pricelist aktif (default + override admin). */
  pricelist?: Pricelist;
}) {
  const [state, action, pending] = useActionState(saveInvoiceAction, undefined);

  const [isNew, setIsNew] = useState(!initial && customers.length === 0);
  const [customerId, setCustomerId] = useState(initial?.customer_id ?? "");
  const [picId, setPicId] = useState(initial?.pic_id ?? "");
  const [picPosition, setPicPosition] = useState("");
  /** Grup DP yang sudah ada: payment type dikunci (DP & Pelunasan bergerak bersama). */
  const grouped = Boolean(initial?.group_id);
  const [info, setInfo] = useState({
    company_name: initial?.company_name ?? "",
    pic_name: initial?.pic_name ?? "",
    email: initial?.email ?? "",
    phone: initial?.phone ?? "",
    billing_address: initial?.billing_address ?? "",
    npwp: initial?.npwp ?? "",
  });
  const [meta, setMeta] = useState({
    entity: (initial?.entity ?? "dts") as Entity,
    invoice_date: initial?.invoice_date ?? defaults.invoice_date,
    due_date: initial?.due_date ?? defaults.due_date,
    payment_type: (initial?.payment_type ?? "cbd") as PaymentType,
    tax_rate: initial?.tax_rate ?? DEFAULT_TAX_RATE,
    notes: initial ? (initial.notes ?? "") : defaultRemarks,
    term_of_payment: initial ? (initial.term_of_payment ?? "") : DEFAULT_TERM.cbd,
    payment_info: initial?.payment_info ?? ENTITIES[initial?.entity ?? "dts"].payment,
    payable_label: initial?.payable_label ?? "",
    payable_percent: initial?.payable_percent ? String(initial.payable_percent) : "",
    final_due_date: schedule?.[1]?.due_date ?? initial?.due_date ?? defaults.due_date,
  });
  const isDp = meta.payment_type === "dp";
  const isTermin = meta.payment_type === "termin";
  /** Termin 2..N (Termin 1 memakai persen & due date utama). */
  const [terms, setTerms] = useState<{ percent: string; due_date: string }[]>(
    initial?.payment_type === "termin" && schedule
      ? schedule.slice(1).map((t) => ({ percent: String(t.percent), due_date: t.due_date }))
      : [{ percent: "50", due_date: defaults.due_date }],
  );
  const stageCount = isDp ? 2 : isTermin ? terms.length + 1 : 0;
  /** Tahap syarat cetak Surat Jalan; 0 = tahap terakhir. */
  const [gate, setGate] = useState(deliveryAfter ?? 0);
  const gateValue = gate && gate <= stageCount ? gate : stageCount;
  const stageName = (i: number) => (isDp ? (i === 1 ? "DP" : "Pelunasan") : `Termin ${i}`);
  const terminSum = (Number(meta.payable_percent) || 0) + terms.reduce((a, t) => a + (Number(t.percent) || 0), 0);
  const [rows, setRows] = useState<Row[]>(
    initial?.items.length
      ? initial.items.map((i) => ({
          key: ++seq,
          sku: i.sku ?? "",
          product: i.product,
          quantity: String(i.quantity),
          uom: i.uom ?? "Pcs",
          unit_price: String(i.unit_price),
          customization: i.customization,
          notes: i.notes ?? "",
          auto: false,
        }))
      : [blank()],
  );

  const customer = customers.find((c) => c.id === customerId);
  const totals = useMemo(
    () =>
      computeTotals(
        rows.map((r) => ({ quantity: Number(r.quantity) || 0, unit_price: Number(r.unit_price) || 0 })),
        meta.tax_rate,
        Number(meta.payable_percent) || null,
      ),
    [rows, meta.tax_rate, meta.payable_percent],
  );

  function pickCustomer(id: string) {
    setCustomerId(id);
    const c = customers.find((x) => x.id === id);
    const p = c?.pics[0];
    setPicId(p?.id ?? "");
    setInfo({
      company_name: c?.company_name ?? "",
      pic_name: p?.name ?? "",
      email: p?.email || c?.email || "",
      phone: p?.phone || c?.phone || "",
      billing_address: c?.billing_address ?? "",
      npwp: c?.npwp ?? "",
    });
  }

  function pickMode(next: boolean) {
    if (next === isNew) return;
    setIsNew(next);
    pickCustomer("");
  }

  function pickPic(id: string) {
    setPicId(id);
    if (id === NEW_PIC) return setInfo((s) => ({ ...s, pic_name: "", email: customer?.email ?? "", phone: customer?.phone ?? "" }));
    const p = customer?.pics.find((x) => x.id === id);
    setInfo((s) => ({
      ...s,
      pic_name: p?.name ?? "",
      email: p?.email || customer?.email || s.email,
      phone: p?.phone || customer?.phone || s.phone,
    }));
  }

  function pickEntity(entity: Entity) {
    // Ganti info pembayaran hanya jika masih default entitas sebelumnya.
    setMeta((m) => ({
      ...m,
      entity,
      payment_info: m.payment_info.trim() === ENTITIES[m.entity].payment ? ENTITIES[entity].payment : m.payment_info,
    }));
  }

  function pickPayment(payment_type: PaymentType) {
    setMeta((m) => ({
      ...m,
      payment_type,
      term_of_payment:
        !m.term_of_payment.trim() || m.term_of_payment === DEFAULT_TERM[m.payment_type]
          ? DEFAULT_TERM[payment_type]
          : m.term_of_payment,
      ...(payment_type === "dp" || payment_type === "termin"
        ? { payable_label: "", payable_percent: m.payable_percent || "50" }
        : m.payment_type === "dp" || m.payment_type === "termin"
          ? { payable_label: "", payable_percent: "" }
          : {}),
    }));
  }

  const setRow = (key: number, patch: Partial<Row>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? reprice({ ...r, ...patch }, pricelist) : r)));

  const payload = JSON.stringify({
    customer_id: isNew ? "" : customerId,
    new_customer: isNew,
    new_pic: !isNew && picId === NEW_PIC,
    pic_id: isNew || picId === NEW_PIC ? null : picId || null,
    ...info,
    pic_position: picPosition || null,
    ...meta,
    payable_percent: meta.payable_percent ? Number(meta.payable_percent) : null,
    schedule: isDp
      ? [
          { percent: Number(meta.payable_percent), due_date: meta.due_date },
          { percent: 100 - Number(meta.payable_percent), due_date: meta.final_due_date },
        ]
      : isTermin
        ? [
            { percent: Number(meta.payable_percent), due_date: meta.due_date },
            ...terms.map((t) => ({ percent: Number(t.percent), due_date: t.due_date })),
          ]
        : null,
    delivery_after: stageCount ? gateValue : null,
    items: rows.map(({ key: _, auto: _a, ...r }) => r),
  });

  const [preview, setPreview] = useState(false);
  useEffect(() => {
    if (!preview) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setPreview(false);
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [preview]);

  /** Invoice sementara dari isi form, untuk pratinjau sebelum disimpan. */
  const draft = (): InvoiceFull => ({
    ...(initial ?? ({ id: "preview", invoice_number: null, events: [], webhooks: [] } as unknown as InvoiceFull)),
    status: initial?.status ?? "draft",
    customer_id: isNew ? null : customerId || null,
    pic_id: null,
    ...info,
    pic_name: info.pic_name || null,
    email: info.email || null,
    phone: info.phone || null,
    billing_address: info.billing_address || null,
    npwp: info.npwp || null,
    ...meta,
    notes: meta.notes || null,
    term_of_payment: meta.term_of_payment || null,
    payment_info: meta.payment_info || null,
    payable_label: isDp ? `DP ${meta.payable_percent}%` : isTermin ? `Termin 1 (${meta.payable_percent}%)` : meta.payable_label || null,
    payable_percent: Number(meta.payable_percent) || null,
    subtotal: totals.subtotal,
    tax_amount: totals.tax_amount,
    total: totals.total,
    items: rows.map((r, i) => ({
      id: String(r.key),
      invoice_id: initial?.id ?? "preview",
      position: i + 1,
      sku: r.sku || null,
      product: r.product || "—",
      quantity: Number(r.quantity) || 0,
      uom: r.uom || "Pcs",
      unit_price: Number(r.unit_price) || 0,
      customization: r.customization,
      notes: r.notes || null,
      line_total: totals.lines[i] ?? 0,
    })),
  });


  return (
    <form action={action} className="fgrid" onInvalidCapture={() => setPreview(false)}>
      <input type="hidden" name="payload" value={payload} />
      {initial && <input type="hidden" name="id" value={initial.id} />}

      <div>
        {state?.error && <div className="err">{state.error}</div>}

        <div className="panel">
          <h3>
            <Icon n="bld" /> Customer
            {!initial && (
              <span className="seg" style={{ marginLeft: "auto" }}>
                <button type="button" className={!isNew ? "on" : ""} onClick={() => pickMode(false)} disabled={!customers.length}>
                  Existing
                </button>
                <button type="button" className={isNew ? "on" : ""} onClick={() => pickMode(true)}>
                  Customer baru
                </button>
              </span>
            )}
          </h3>
          {isNew ? (
            <div className="two">
              <div className="f" style={{ gridColumn: "1 / -1" }}>
                <label>
                  Perusahaan <i>*</i>
                </label>
                <input
                  value={info.company_name}
                  onChange={(e) => setInfo({ ...info, company_name: e.target.value })}
                  placeholder="PT …"
                  required
                />
              </div>
              <div className="f">
                <label>
                  Nama PIC <i>*</i>
                </label>
                <input value={info.pic_name} onChange={(e) => setInfo({ ...info, pic_name: e.target.value })} required />
              </div>
              <div className="f">
                <label>Jabatan PIC</label>
                <input value={picPosition} onChange={(e) => setPicPosition(e.target.value)} placeholder="mis. Retail Business" />
              </div>
            </div>
          ) : (
            <div className="two">
              <div className="f">
                <label>
                  Perusahaan <i>*</i>
                </label>
                <select value={customerId} onChange={(e) => pickCustomer(e.target.value)} required>
                  <option value="">Pilih customer tersimpan…</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.company_name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="f">
                <label>PIC</label>
                <select value={picId} onChange={(e) => pickPic(e.target.value)} disabled={!customer}>
                  <option value="">—</option>
                  {customer?.pics.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                      {p.position ? ` · ${p.position}` : ""}
                    </option>
                  ))}
                  {customer && <option value={NEW_PIC}>+ Tambah PIC baru…</option>}
                </select>
              </div>
            </div>
          )}
          {!isNew && picId === NEW_PIC && (
            <>
              <div className="two">
                <div className="f">
                  <label>
                    Nama PIC baru <i>*</i>
                  </label>
                  <input
                    value={info.pic_name}
                    onChange={(e) => setInfo({ ...info, pic_name: e.target.value })}
                    placeholder="Nama lengkap PIC"
                    required
                    autoFocus
                  />
                </div>
                <div className="f">
                  <label>Jabatan</label>
                  <input value={picPosition} onChange={(e) => setPicPosition(e.target.value)} placeholder="mis. Retail Business" />
                </div>
              </div>
              <span className="hint" style={{ marginTop: -8, marginBottom: 14 }}>
                PIC ini otomatis ditambahkan ke data customer saat invoice disimpan, beserta email & telepon di bawah.
              </span>
            </>
          )}
          {(customer || isNew) && (
            <>
              <div className="two">
                <div className="f">
                  <label>
                    Email penerima <i>*</i>
                  </label>
                  <input type="email" value={info.email} onChange={(e) => setInfo({ ...info, email: e.target.value })} required />
                </div>
                <div className="f">
                  <label>Telepon</label>
                  <input value={info.phone} onChange={(e) => setInfo({ ...info, phone: e.target.value })} />
                </div>
              </div>
              <div className="two">
                <div className="f">
                  <label>
                    Billing address <i>*</i>
                  </label>
                  <textarea
                    value={info.billing_address}
                    onChange={(e) => setInfo({ ...info, billing_address: e.target.value })}
                    required
                  />
                </div>
                <div className="f">
                  <label>NPWP</label>
                  <input value={info.npwp} onChange={(e) => setInfo({ ...info, npwp: e.target.value })} />
                  <span className="hint" style={{ marginTop: 4 }}>
                    {isNew
                      ? "Customer & PIC otomatis disimpan ke master customer saat invoice disimpan."
                      : "Data disalin ke invoice (snapshot). Perubahan di sini tidak mengubah master customer."}
                  </span>
                </div>
              </div>
            </>
          )}
        </div>

        <div className="panel">
          <h3>
            <Icon n="file" /> Informasi invoice
          </h3>
          <div className="f">
            <label>
              Diterbitkan oleh <i>*</i>
            </label>
            <div className="seg" style={{ alignSelf: "start" }}>
              {(Object.keys(ENTITIES) as Entity[]).map((k) => (
                <button type="button" key={k} className={meta.entity === k ? "on" : ""} onClick={() => pickEntity(k)}>
                  {ENTITIES[k].name}
                </button>
              ))}
            </div>
          </div>
          <div className="three">
            <div className="f">
              <label>
                Invoice date <i>*</i>
              </label>
              <input
                type="date"
                value={meta.invoice_date}
                onChange={(e) => setMeta({ ...meta, invoice_date: e.target.value })}
                required
              />
            </div>
            <div className="f">
              <label>
                Due date <i>*</i>
              </label>
              <input
                type="date"
                value={meta.due_date}
                min={meta.invoice_date}
                onChange={(e) => setMeta({ ...meta, due_date: e.target.value })}
                required
              />
            </div>
            <div className="f">
              <label>
                Payment type <i>*</i>
              </label>
              <select
                value={meta.payment_type}
                onChange={(e) => pickPayment(e.target.value as PaymentType)}
                disabled={grouped}
                title={grouped ? "Grup DP / Termin — payment type tidak bisa diganti" : undefined}
              >
                {Object.entries(PAYMENT_TYPES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v.code} — {v.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          {isDp && (
            <>
              <div className="three">
                <div className="f">
                  <label>
                    DP (%) <i>*</i>
                  </label>
                  <input
                    type="number"
                    {...noSpin}
                    min="1"
                    max="99"
                    value={meta.payable_percent}
                    onChange={(e) => setMeta({ ...meta, payable_percent: e.target.value })}
                    required
                  />
                </div>
                <div className="f">
                  <label>Pelunasan (%)</label>
                  <input value={meta.payable_percent ? String(100 - Number(meta.payable_percent)) : ""} disabled readOnly />
                </div>
                <div className="f">
                  <label>
                    Due date pelunasan <i>*</i>
                  </label>
                  <input
                    type="date"
                    value={meta.final_due_date}
                    min={meta.invoice_date}
                    onChange={(e) => setMeta({ ...meta, final_due_date: e.target.value })}
                    required
                  />
                </div>
              </div>
              <p className="hint" style={{ marginTop: -6 }}>
                Sistem membuat 2 invoice dalam satu grup — DP & Pelunasan — dengan nomor berurutan. Due date di atas
                untuk invoice DP.
              </p>
            </>
          )}
          {isTermin && (
            <div className="f">
              <label>
                Tahap termin <i>*</i>
              </label>
              <div className="terms">
                <div className="term">
                  <b>Termin 1</b>
                  <input
                    type="number"
                    {...noSpin}
                    min="1"
                    max="99"
                    value={meta.payable_percent}
                    onChange={(e) => setMeta({ ...meta, payable_percent: e.target.value })}
                    aria-label="Persen Termin 1"
                    required
                  />
                  <span className="mut">%</span>
                  <span className="hint" style={{ margin: 0 }}>Due date = due date di atas</span>
                </div>
                {terms.map((t, i) => (
                  <div className="term" key={i}>
                    <b>Termin {i + 2}</b>
                    <input
                      type="number"
                      {...noSpin}
                      min="1"
                      max="99"
                      value={t.percent}
                      onChange={(e) => setTerms(terms.map((x, j) => (j === i ? { ...x, percent: e.target.value } : x)))}
                      aria-label={`Persen Termin ${i + 2}`}
                      required
                    />
                    <span className="mut">%</span>
                    <input
                      type="date"
                      value={t.due_date}
                      min={meta.invoice_date}
                      onChange={(e) => setTerms(terms.map((x, j) => (j === i ? { ...x, due_date: e.target.value } : x)))}
                      aria-label={`Due date Termin ${i + 2}`}
                      required
                    />
                    {terms.length > 1 && (
                      <button type="button" className="ib" title="Hapus termin" onClick={() => setTerms(terms.filter((_, j) => j !== i))}>
                        <Icon n="trash" s={14} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
                <button
                  type="button"
                  className="btn sm"
                  onClick={() => setTerms([...terms, { percent: "", due_date: terms.at(-1)?.due_date ?? meta.due_date }])}
                  disabled={terms.length >= 11}
                >
                  <Icon n="plus" /> Tambah termin
                </button>
                <span className={`hint${terminSum === 100 ? "" : " warn"}`} style={{ margin: 0 }}>
                  Total {terminSum}%{terminSum === 100 ? "" : " — harus 100%"}
                </span>
              </div>
            </div>
          )}
          {stageCount > 0 && (
            <div className="f" style={{ marginBottom: 0 }}>
              <label>Surat Jalan bisa dicetak setelah</label>
              <select value={gateValue} onChange={(e) => setGate(Number(e.target.value))}>
                {Array.from({ length: stageCount }, (_, k) => k + 1).map((n) => (
                  <option key={n} value={n}>
                    {stageName(n)} dibayar{n > 1 ? " (beserta tahap sebelumnya)" : ""}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="panel">
          <h3>
            Item <span className="mut">{rows.length} item</span>
          </h3>
          <div className="items">
            {rows.map((r, idx) => (
              <div className="item" key={r.key}>
                <div className="item-h">
                  <b>Item {idx + 1}</b>
                  <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    <span className="num">
                      {rupiah(totals.lines[idx] ?? 0)}
                    </span>
                    {rows.length > 1 && (
                      <button
                        type="button"
                        className="ib"
                        title="Hapus item"
                        onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}
                      >
                        <Icon n="trash" />
                      </button>
                    )}
                  </span>
                </div>
                <div className="item-row1">
                  <div className="f">
                    <label>SKU</label>
                    <ProductPicker
                      value={r.sku}
                      onChange={(sku) => setRow(r.key, { sku })}
                      onPick={(p) => setRow(r.key, { sku: p.sku, product: productLabel(p), auto: true })}
                      placeholder="Cari SKU…"
                    />
                  </div>
                  <div className="f">
                    <label>
                      Product <i>*</i>
                    </label>
                    <ProductPicker
                      value={r.product}
                      onChange={(product) => setRow(r.key, { product })}
                      onPick={(p) => setRow(r.key, { sku: p.sku, product: productLabel(p), auto: true })}
                      placeholder="Cari nama / varian, mis. classic 500 black"
                      required
                    />
                  </div>
                  <div className="f">
                    <label>Customization</label>
                    <select
                      value={r.customization}
                      onChange={(e) => setRow(r.key, { customization: e.target.value as Customization })}
                    >
                      {Object.entries(CUSTOMIZATION_LABEL).map(([k, v]) => (
                        <option key={k} value={k}>
                          {v}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="item-row2">
                  <div className="f">
                    <label>
                      Qty <i>*</i>
                    </label>
                    <input
                      type="number"
                      {...noSpin}
                      min="1"
                      step="1"
                      inputMode="numeric"
                      value={r.quantity}
                      onChange={(e) => setRow(r.key, { quantity: e.target.value })}
                      required
                    />
                  </div>
                  <div className="f">
                    <label>
                      UoM <i>*</i>
                    </label>
                    <input list="uom-list" value={r.uom} onChange={(e) => setRow(r.key, { uom: e.target.value })} required />
                  </div>
                  <div className="f">
                    <label>
                      Unit price (Rp) <i>*</i>
                    </label>
                    <input
                      type="number"
                      {...noSpin}
                      min="0"
                      step="1"
                      inputMode="numeric"
                      value={r.unit_price}
                      onChange={(e) => setRow(r.key, { unit_price: e.target.value, auto: false })}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div className="f">
                    <label>Catatan item (opsional)</label>
                    <input
                      value={r.notes}
                      onChange={(e) => setRow(r.key, { notes: e.target.value })}
                      placeholder="Contoh: engrave logo di sisi kanan"
                    />
                  </div>
                </div>
                <PriceHint row={r} list={pricelist} onApply={(unit_price) => setRow(r.key, { unit_price, auto: true })} />
              </div>
            ))}
          </div>
          <datalist id="uom-list">
            {UOM_OPTIONS.map((u) => (
              <option key={u} value={u} />
            ))}
          </datalist>
          <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
            <button type="button" className="btn sm" onClick={() => setRows((rs) => [...rs, blank()])}>
              <Icon n="plus" /> Tambah item
            </button>
            <button
              type="button"
              className="btn sm"
              onClick={() => setRows((rs) => [...rs, { ...blank(), product: "Biaya Pengiriman", uom: "Rit" }])}
            >
              <Icon n="plus" /> Biaya pengiriman
            </button>
          </div>
        </div>

        <div className="panel">
          <h3>Isi dokumen</h3>
          <div className="f">
            <label>Remarks</label>
            <RemarksEditor value={meta.notes} onChange={(notes) => setMeta((m) => ({ ...m, notes }))} />
          </div>
          <div className="f">
            <label>Term of payment</label>
            <textarea
              rows={2}
              style={{ height: "auto" }}
              value={meta.term_of_payment}
              onChange={(e) => setMeta({ ...meta, term_of_payment: e.target.value })}
              placeholder="Kosongkan bila tidak perlu ditampilkan"
            />
          </div>
          <div className="f">
            <label>Pembayaran</label>
            <PaymentEditor value={meta.payment_info} onChange={(payment_info) => setMeta((m) => ({ ...m, payment_info }))} />
          </div>
          {!stageCount && (
          <div className="two" style={{ gridTemplateColumns: "1fr 140px" }}>
            <div className="f" style={{ marginBottom: 0 }}>
              <label>Baris tagihan parsial (opsional)</label>
              <input
                value={meta.payable_label}
                onChange={(e) => setMeta({ ...meta, payable_label: e.target.value })}
                placeholder="DP 50% / Total Termin 3"
              />
            </div>
            <div className="f" style={{ marginBottom: 0 }}>
              <label>Persentase (%)</label>
              <input
                type="number"
                {...noSpin}
                min="1"
                max="100"
                value={meta.payable_percent}
                onChange={(e) => setMeta({ ...meta, payable_percent: e.target.value })}
                placeholder="—"
              />
            </div>
          </div>
          )}
        </div>
      </div>

      <div className="sticky">
        <div className="panel sum">
          <h3>Ringkasan</h3>
          <div className="row">
            <span className="mut">Penerbit</span>
            <span style={{ textAlign: "right" }}>{ENTITIES[meta.entity].short}</span>
          </div>
          <div className="row">
            <span className="mut">Customer</span>
            <span style={{ textAlign: "right" }}>{info.company_name || "—"}</span>
          </div>
          <div className="row">
            <span className="mut">Subtotal</span>
            <span className="num">{rupiah(totals.subtotal)}</span>
          </div>
          <div className="row" style={{ alignItems: "center" }}>
            <span className="mut">PPN</span>
            <span className="seg">
              {[0, 11].map((t) => (
                <button type="button" key={t} className={meta.tax_rate === t ? "on" : ""} onClick={() => setMeta({ ...meta, tax_rate: t })}>
                  {t === 0 ? "Tanpa" : `${t}%`}
                </button>
              ))}
            </span>
          </div>
          {meta.tax_rate > 0 && (
            <div className="row">
              <span className="mut">PPN {meta.tax_rate}%</span>
              <span className="num">{rupiah(totals.tax_amount)}</span>
            </div>
          )}
          <div className="row total">
            <span>Total</span>
            <b className="num">{rupiah(totals.total)}</b>
          </div>
          {isTermin ? (
            [Number(meta.payable_percent) || 0, ...terms.map((t) => Number(t.percent) || 0)].map((p, i) => (
              <div className="row" key={i}>
                <span className="mut">
                  Invoice Termin {i + 1} ({p}%)
                </span>
                <b className="num">{rupiah(Math.round((totals.total * p) / 100))}</b>
              </div>
            ))
          ) : isDp && totals.payable != null ? (
            <>
              <div className="row">
                <span className="mut">Invoice DP {meta.payable_percent}%</span>
                <b className="num">{rupiah(totals.payable)}</b>
              </div>
              <div className="row">
                <span className="mut">Invoice Pelunasan {100 - Number(meta.payable_percent)}%</span>
                <b className="num">{rupiah(totals.total - totals.payable)}</b>
              </div>
            </>
          ) : (
            totals.payable != null && (
              <div className="row">
                <span className="mut">{meta.payable_label || "Tagihan"}</span>
                <b className="num">{rupiah(totals.payable)}</b>
              </div>
            )
          )}
          <p className="hint">Total final dihitung ulang oleh sistem saat disimpan.</p>
          <div className="actions">
            <button type="button" className="btn block" onClick={() => setPreview(true)}>
              <Icon n="file" /> Pratinjau invoice
            </button>
            <button className="btn pri block" name="intent" value="submit" disabled={pending || (!isNew && !customerId)}>
              <Icon n="send" /> {pending ? "Menyimpan…" : "Ajukan ke Finance"}
            </button>
            <button className="btn block" name="intent" value="draft" disabled={pending || (!isNew && !customerId)}>
              Simpan sebagai draft
            </button>
            <Link href={initial ? `/invoices/${initial.id}` : "/invoices"} className="btn ghost block">
              Batal
            </Link>
          </div>
        </div>
      </div>

      {preview && (
        <div className="pv-back" onClick={() => setPreview(false)}>
          <div className="pv" role="dialog" aria-modal="true" aria-label="Pratinjau invoice" onClick={(e) => e.stopPropagation()}>
            <div className="pv-h">
              <b>Pratinjau invoice</b>
              <span className="mut">Belum disimpan · nomor invoice terbit saat diajukan ke Finance</span>
              <button type="button" className="ib" title="Tutup" onClick={() => setPreview(false)} style={{ marginLeft: "auto" }}>
                <Icon n="x" />
              </button>
            </div>
            <InvoicePaper inv={draft()} />
            <div className="pv-f">
              <button type="button" className="btn" onClick={() => setPreview(false)}>
                <Icon n="edit" /> Kembali edit
              </button>
              <button className="btn" name="intent" value="draft" disabled={pending || (!isNew && !customerId)}>
                Simpan sebagai draft
              </button>
              <button className="btn pri" name="intent" value="submit" disabled={pending || (!isNew && !customerId)}>
                <Icon n="send" /> {pending ? "Menyimpan…" : "Ajukan ke Finance"}
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}

function PriceHint({ row, list, onApply }: { row: Row; list: Pricelist; onApply: (price: string) => void }) {
  const q = quoteOf(row, list);
  if (!q) return null;
  const price = Number(row.unit_price);
  const below = row.unit_price !== "" && price < q.min;
  return (
    <div className={`price-hint${below ? " warn" : ""}`}>
      <span>
        Pricelist {q.series} · {q.tier}
        {row.customization === "uv_print" ? " · dasar non-engrave, biaya UV menyusul" : ""}:{" "}
        <b className="num">{rupiah(q.normal)}</b> normal · <b className="num">{rupiah(q.min)}</b> min
        {below && " — di bawah harga minimum"}
      </span>
      {price !== q.normal && (
        <button type="button" className="link" onClick={() => onApply(String(q.normal))}>
          Pakai harga normal
        </button>
      )}
    </div>
  );
}

type PayRow = { key: number; kind: "rek" | "link"; bank: string; no: string; name: string; link: string };

let payKey = 0;
const blankPay = (p: Partial<PayRow> = {}): PayRow => ({ key: ++payKey, kind: "rek", bank: "", no: "", name: "", link: "", ...p });

/** "BCA\t123\nPT X\nhttps://…" → baris rekening / link. */
function parsePayment(text: string): PayRow[] {
  const rows: PayRow[] = [];
  for (const raw of text.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    const last = rows[rows.length - 1];
    if (/^https?:\/\//.test(line)) rows.push(blankPay({ kind: "link", link: line }));
    else if (raw.includes("\t")) {
      const [bank, ...rest] = raw.split("\t");
      rows.push(blankPay({ bank: bank.trim(), no: rest.join(" ").trim() }));
    } else if (last?.kind === "rek" && !last.name) last.name = line;
    else rows.push(blankPay({ name: line }));
  }
  return rows.length ? rows : [blankPay()];
}

function serializePayment(rows: PayRow[]): string {
  return rows
    .flatMap((r) => {
      if (r.kind === "link") return r.link.trim() ? [r.link.trim()] : [];
      const out: string[] = [];
      if (r.bank.trim() || r.no.trim()) out.push(`${r.bank.trim()}\t${r.no.trim()}`);
      if (r.name.trim()) out.push(r.name.trim());
      return out;
    })
    .join("\n");
}

/** Rekening per kolom (Bank / No. rekening / Atas nama), tetap disimpan sebagai teks multi-baris. */
function PaymentEditor({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [rows, setRows] = useState(() => parsePayment(value));
  const emitted = useRef(value);
  // Sinkron ulang bila nilai diganti dari luar (mis. ganti entitas).
  if (value !== emitted.current) {
    emitted.current = value;
    setRows(parsePayment(value));
  }

  function commit(next: PayRow[]) {
    setRows(next);
    emitted.current = serializePayment(next);
    onChange(emitted.current);
  }
  const set = (key: number, patch: Partial<PayRow>) => commit(rows.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  return (
    <>
      <div style={{ display: "grid", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.key} style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {r.kind === "link" ? (
              <input
                style={{ flex: 1, minWidth: 0 }}
                value={r.link}
                onChange={(e) => set(r.key, { link: e.target.value })}
                placeholder="https://…"
              />
            ) : (
              <>
                <input style={{ width: 100 }} value={r.bank} onChange={(e) => set(r.key, { bank: e.target.value })} placeholder="Bank" />
                <input
                  style={{ flex: 1, minWidth: 0 }}
                  value={r.no}
                  inputMode="numeric"
                  onChange={(e) => set(r.key, { no: e.target.value })}
                  placeholder="No. rekening"
                />
                <input
                  style={{ flex: 1.4, minWidth: 0 }}
                  value={r.name}
                  onChange={(e) => set(r.key, { name: e.target.value })}
                  placeholder="Atas nama"
                />
              </>
            )}
            <button
              type="button"
              className="ib"
              title="Hapus"
              onClick={() => commit(rows.length > 1 ? rows.filter((x) => x.key !== r.key) : [blankPay()])}
            >
              <Icon n="trash" />
            </button>
          </div>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap" }}>
        <button type="button" className="btn sm" onClick={() => setRows((rs) => [...rs, blankPay()])}>
          <Icon n="plus" /> Rekening
        </button>
        <button type="button" className="btn sm" onClick={() => setRows((rs) => [...rs, blankPay({ kind: "link" })])}>
          <Icon n="plus" /> Link pembayaran
        </button>
      </div>
    </>
  );
}
