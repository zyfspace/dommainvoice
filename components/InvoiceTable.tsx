"use client";

import Link from "next/link";
import { Fragment, useState } from "react";
import { PRINTABLE, fmtDate, groupInvoices, installmentLabel, invoiceAmount, isOverdue, rupiah } from "@/lib/domain";
import type { Invoice } from "@/lib/types";
import { Icon } from "./Icon";
import { PrintStatus, StatusPair } from "./Status";

/** Tahap yang sedang berjalan: tahap pertama yang belum Paid (semua Paid → tahap terakhir). */
const currentStage = (items: Invoice[]) =>
  items.find((i) => i.status !== "paid" && i.status !== "cancelled") ?? items[items.length - 1];

function Row({ i, child }: { i: Invoice; child?: boolean }) {
  return (
    <tr className={child ? "t-child" : undefined}>
      <td>
        <Link className="row-link num" href={`/invoices/${i.id}`}>
          {i.invoice_number ?? <span className="mut">Belum bernomor</span>}
        </Link>
        {i.installment && <span className="tag" style={{ marginLeft: 6 }}>{installmentLabel(i)}</span>}
      </td>
      <td>
        {child ? (
          <span className="mut">{i.payable_percent}% dari total</span>
        ) : (
          <Link href={`/invoices/${i.id}`}>
            {i.company_name}
            {i.pic_name && <div className="mut" style={{ fontSize: 12 }}>{i.pic_name}</div>}
          </Link>
        )}
      </td>
      <td className="mut">{fmtDate(i.invoice_date)}</td>
      <td className={isOverdue(i.due_date, i.status) ? "" : "mut"}>
        {fmtDate(i.due_date)}
        {isOverdue(i.due_date, i.status) && <span className="tag" style={{ marginLeft: 6 }}>Lewat</span>}
      </td>
      <td className="mut">{(i.entity ?? "dts").toUpperCase()}</td>
      <td className="num">{rupiah(invoiceAmount(i))}</td>
      <td><StatusPair inv={i} /></td>
      <td><PrintStatus inv={i} /></td>
    </tr>
  );
}

function GroupRow({ items, open, onToggle }: { items: Invoice[]; open: boolean; onToggle: () => void }) {
  const head = items[0];
  const cur = currentStage(items);
  const printable = items.filter((i) => PRINTABLE.includes(i.status));
  // Cetak grup: belum lengkap bila ada tahap yang sudah boleh dicetak tapi belum dicetak.
  const printInv = printable.find((i) => !i.printed_at) ?? printable[0] ?? cur;
  const overdue = items.some((i) => isOverdue(i.due_date, i.status));
  return (
    <tr className={`t-group${open ? " open" : ""}`} onClick={onToggle}>
      <td>
        <button
          type="button"
          className="t-toggle"
          aria-expanded={open}
          onClick={(e) => {
            e.stopPropagation();
            onToggle();
          }}
        >
          <Icon n="chevron" s={14} />
          <span>{head.payment_type === "dp" ? "Grup DP" : "Grup Termin"}</span>
          <span className="tag">{items.length} invoice</span>
        </button>
      </td>
      <td>
        {head.company_name}
        {head.pic_name && <div className="mut" style={{ fontSize: 12 }}>{head.pic_name}</div>}
      </td>
      <td className="mut">{fmtDate(head.invoice_date)}</td>
      <td className={overdue ? "" : "mut"}>
        {fmtDate(cur.due_date)}
        {overdue && <span className="tag" style={{ marginLeft: 6 }}>Lewat</span>}
      </td>
      <td className="mut">{(head.entity ?? "dts").toUpperCase()}</td>
      <td className="num">{rupiah(head.total)}</td>
      <td><StatusPair inv={cur} /></td>
      <td><PrintStatus inv={printInv} /></td>
    </tr>
  );
}

export function InvoiceTable({ rows, empty }: { rows: Invoice[]; empty?: React.ReactNode }) {
  const [open, setOpen] = useState<Set<string>>(new Set());
  if (!rows.length)
    return <div className="tw">{empty ?? <div className="empty"><b>Belum ada invoice</b>Invoice yang dibuat akan tampil di sini.</div>}</div>;
  const toggle = (id: string) =>
    setOpen((s) => {
      const n = new Set(s);
      if (!n.delete(id)) n.add(id);
      return n;
    });
  return (
    <div className="tw">
      <table className="t t-inv">
        <thead>
          <tr>
            <th>No. Invoice</th>
            <th>Customer</th>
            <th>Tanggal</th>
            <th>Due date</th>
            <th>Penerbit</th>
            <th>Total</th>
            <th>Status</th>
            <th>Cetak</th>
          </tr>
        </thead>
        <tbody>
          {groupInvoices(rows).map((e) =>
            e.kind === "single" ? (
              <Row key={e.inv.id} i={e.inv} />
            ) : (
              <Fragment key={e.id}>
                <GroupRow items={e.items} open={open.has(e.id)} onToggle={() => toggle(e.id)} />
                {open.has(e.id) && e.items.map((i) => <Row key={i.id} i={i} child />)}
              </Fragment>
            ),
          )}
        </tbody>
      </table>
    </div>
  );
}
