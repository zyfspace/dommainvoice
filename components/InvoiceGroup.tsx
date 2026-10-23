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
              <span className="grp-k">{installmentLabel(g) ?? "—"}</span>
              <span className="grp-main">
                <b className="num">{g.invoice_number ?? "Belum bernomor"}</b>
                <small>
                  {g.payable_percent}% · {rupiah(invoiceDue(g))} · due {fmtDate(g.due_date)}
                  {g.id === gate?.id && " · syarat kirim"}
                </small>
              </span>
              <StatusPair inv={g} />
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
        Diajukan, disetujui & direvisi bersamaan. Bukti bayar diupload per invoice. Surat Jalan dicetak dari invoice{" "}
        <b>{gate ? installmentLabel(gate) : "terakhir"}</b> setelah tahap itu & sebelumnya Paid.
      </p>
    </div>
  );
}
