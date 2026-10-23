import Link from "next/link";
import { deliveryGate, fmtDate, installmentLabel, invoiceDue, rupiah } from "@/lib/domain";
import type { Invoice } from "@/lib/types";
import { StatusPair } from "./Status";

/** Panel grup DP / Termin: semua tahap berdampingan supaya tidak membingungkan. */
export function InvoiceGroup({ current, group }: { current: Invoice; group: Invoice[] }) {
  if (!current.group_id || group.length < 2) return null;
  const gate = deliveryGate(group);
  return (
    <div className="panel">
      <h3>
        {current.payment_type === "dp" ? "Grup DP" : "Grup Termin"} <span className="mut">{group.length} invoice</span>
      </h3>
      <ul className="grp">
        {group.map((g) => {
          const body = (
            <>
              <span className="grp-top">
                <span className="grp-k">
                  {installmentLabel(g) ?? "—"}
                  {g.payable_percent != null && <em className="num">{g.payable_percent}%</em>}
                  {g.id === gate?.id && <span className="tag">Syarat kirim</span>}
                </span>
                <StatusPair inv={g} />
              </span>
              <b className="grp-no num">{g.invoice_number ?? "Belum bernomor"}</b>
              <span className="grp-meta">
                <span className="num">{rupiah(invoiceDue(g))}</span>
                <span>Due {fmtDate(g.due_date)}</span>
              </span>
            </>
          );
          return (
            <li key={g.id} className={g.id === current.id ? "on" : ""}>
              {g.id === current.id ? <div>{body}</div> : <Link href={`/invoices/${g.id}`}>{body}</Link>}
            </li>
          );
        })}
      </ul>
      <p className="hint" style={{ marginBottom: 0 }}>
        Semua tahap diajukan dan di-approve bersamaan, bukti bayar diupload per invoice. Surat Jalan dicetak dari tahap{" "}
        <b>{gate ? installmentLabel(gate) : "terakhir"}</b> setelah tahap itu dan sebelumnya Paid.
      </p>
    </div>
  );
}
