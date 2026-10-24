import Link from "next/link";
import { DashInvoices } from "@/components/DashInvoices";
import { Icon } from "@/components/Icon";
import { RefreshButton } from "@/components/RefreshButton";
import { requireProfile } from "@/lib/auth";
import { invoiceAmount, rupiah, todayJakarta } from "@/lib/domain";
import { repo } from "@/lib/repo";
import type { InvoiceStatus } from "@/lib/types";

export const metadata = { title: "Overview" };

const N = 12; // jumlah bulan di chart
const compact = (n: number) => new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(n);

export default async function Overview() {
  const me = await requireProfile();
  const all = await repo.listInvoices();
  const month = todayJakarta().slice(0, 7);
  const ok = (s: InvoiceStatus) => s === "approved" || s === "issued" || s === "paid";
  const thisMonth = all.filter((i) => i.invoice_date.startsWith(month));
  const onCheck = all.filter((i) => i.status === "on_check");
  const drafts = all.filter((i) => i.status === "draft" || i.status === "revision_requested");
  const issued = thisMonth.filter((i) => i.status === "issued");

  const todo: InvoiceStatus[] = me.role === "finance" ? ["on_check"] : ["draft", "revision_requested"];

  // nilai approved + issued per bulan, N bulan terakhir
  const months = Array.from({ length: N }, (_, k) => {
    const d = new Date(`${month}-01T00:00:00Z`);
    d.setUTCMonth(d.getUTCMonth() - (N - 1 - k));
    return d.toISOString().slice(0, 7);
  });
  const vol = months.map((m) =>
    all.filter((i) => i.invoice_date.startsWith(m) && ok(i.status)).reduce((a, i) => a + invoiceAmount(i), 0),
  );
  const value = vol[N - 1];
  const prev = vol[N - 2];
  const delta = prev ? Math.round(((value - prev) / prev) * 100) : null;
  const max = Math.max(...vol, 1);
  const pts = vol.map((v, k) => [(k / (N - 1)) * 100, 100 - (v / max) * 88] as const);
  const line = pts.map(([x, y], k) => `${k ? "L" : "M"}${x},${y}`).join(" ");
  const area = `${line} L100,100 L0,100 Z`;
  const monthLabel = (m: string) =>
    new Intl.DateTimeFormat("id-ID", { month: "short" }).format(new Date(`${m}-01T00:00:00Z`));

  return (
    <div className="dash">
      <div className="top dash-top">
        <div style={{ marginRight: "auto" }}>
          <h1>Halo, {me.full_name?.split(" ")[0] ?? me.email}</h1>
          <div className="sub">
            {me.role === "finance"
              ? `${onCheck.length} invoice menunggu pemeriksaan Anda.`
              : "Siapkan invoice dan ajukan ke Finance untuk approval."}
          </div>
        </div>
        <RefreshButton />
        {me.role === "admin" && (
          <Link href="/invoices/new" className="btn pri">
            <Icon n="plus" /> Invoice baru
          </Link>
        )}
      </div>

      <div className="dash-sum">
        <div className="dash-stats">
          <Link href="/invoices?status=on_check" className={`dstat${me.role === "finance" ? " hl" : ""}`}>
            <span>Menunggu approval</span>
            <b className="num">{onCheck.length}</b>
          </Link>
          <Link href="/invoices?status=revision_requested" className={`dstat${me.role === "admin" ? " hl" : ""}`}>
            <span>Draft & revisi</span>
            <b className="num">{drafts.length}</b>
          </Link>
          <Link href="/invoices?status=issued" className="dstat">
            <span>Issued bulan ini</span>
            <b className="num">
              {issued.length}
              <small> / {thisMonth.length}</small>
            </b>
          </Link>
          <div className="dstat">
            <span>Disetujui bulan ini</span>
            <b className="num">{rupiah(value)}</b>
          </div>
        </div>

        <div className="chart">
          <div className="chart-h">
            <span>Nilai invoice disetujui</span>
            <small className="mut">{N} bulan terakhir</small>
            {delta !== null && (
              <small className="chart-d num">
                {delta >= 0 ? "▲" : "▼"} {Math.abs(delta)}% vs bulan lalu
              </small>
            )}
          </div>
          <div className="chart-plot">
            <div className="chart-y num">
              <span>{compact(max)}</span>
              <span>{compact(max / 2)}</span>
              <span>0</span>
            </div>
            <div className="chart-area">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
                <line x1="0" x2="100" y1="12" y2="12" />
                <line x1="0" x2="100" y1="56" y2="56" />
                <line x1="0" x2="100" y1="100" y2="100" />
                <path className="fill" d={area} />
                <path className="stroke" d={line} />
              </svg>
              {pts.map(([x, y], k) => (
                <div key={months[k]} className={`pt${k === N - 1 ? " on" : ""}`} style={{ left: `${x}%` }}>
                  <i style={{ top: `${y}%` }} />
                  <em className="num">
                    {monthLabel(months[k])} · {rupiah(vol[k])}
                  </em>
                </div>
              ))}
            </div>
          </div>
          <div className="chart-x">
            {months.map((m, k) => (
              <span key={m} className={k === N - 1 ? "on" : ""}>{monthLabel(m)}</span>
            ))}
          </div>
        </div>
      </div>

      <DashInvoices rows={all} todo={todo} />
    </div>
  );
}
