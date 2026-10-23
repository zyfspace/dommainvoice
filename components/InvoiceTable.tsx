import Link from "next/link";
import { fmtDate, installmentLabel, invoiceAmount, isOverdue, rupiah } from "@/lib/domain";
import type { Invoice } from "@/lib/types";
import { StatusPair } from "./Status";

export function InvoiceTable({ rows, empty }: { rows: Invoice[]; empty?: React.ReactNode }) {
  if (!rows.length)
    return <div className="tw">{empty ?? <div className="empty"><b>Belum ada invoice</b>Invoice yang dibuat akan tampil di sini.</div>}</div>;
  return (
    <div className="tw">
      <table className="t">
        <thead>
          <tr>
            <th>No. Invoice</th>
            <th>Customer</th>
            <th>Tanggal</th>
            <th>Due date</th>
            <th>Penerbit</th>
            <th>Total</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((i) => (
            <tr key={i.id}>
              <td>
                <Link className="row-link num" href={`/invoices/${i.id}`}>
                  {i.invoice_number ?? <span className="mut">Belum bernomor</span>}
                </Link>
                {i.installment && <span className="tag" style={{ marginLeft: 6 }}>{installmentLabel(i)}</span>}
              </td>
              <td>
                <Link href={`/invoices/${i.id}`}>
                  {i.company_name}
                  {i.pic_name && <div className="mut" style={{ fontSize: 12 }}>{i.pic_name}</div>}
                </Link>
              </td>
              <td className="mut">{fmtDate(i.invoice_date)}</td>
              <td className={isOverdue(i.due_date, i.status) ? "" : "mut"}>
                {fmtDate(i.due_date)}
                {isOverdue(i.due_date, i.status) && <span className="tag" style={{ marginLeft: 6 }}>Lewat</span>}
              </td>
              <td className="mut">{(i.entity ?? "dts").toUpperCase()}</td>
              <td className="num">{rupiah(invoiceAmount(i))}</td>
              <td><StatusPair inv={i} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
