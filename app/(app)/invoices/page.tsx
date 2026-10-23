import Link from "next/link";
import { Icon } from "@/components/Icon";
import { InvoiceTable } from "@/components/InvoiceTable";
import { requireProfile } from "@/lib/auth";
import { STATUS_LABEL, STATUS_ORDER } from "@/lib/domain";
import { repo } from "@/lib/repo";
import type { InvoiceStatus } from "@/lib/types";

export const metadata = { title: "Invoices" };

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  const me = await requireProfile();
  const { status, q = "" } = await searchParams;
  const all = await repo.listInvoices();
  const active = STATUS_ORDER.includes(status as InvoiceStatus) ? (status as InvoiceStatus) : null;
  const term = q.trim().toLowerCase();
  const rows = all.filter(
    (i) =>
      (!active || i.status === active) &&
      (!term ||
        [i.invoice_number, i.company_name, i.pic_name, i.email].some((v) => v?.toLowerCase().includes(term))),
  );
  const href = (s: string | null) => {
    const p = new URLSearchParams();
    if (s) p.set("status", s);
    if (q) p.set("q", q);
    const qs = p.toString();
    return qs ? `/invoices?${qs}` : "/invoices";
  };

  return (
    <>
      <div className="top">
        <div style={{ marginRight: "auto" }}>
          <h1>Invoices</h1>
          <div className="sub">Histori seluruh invoice beserta status approval.</div>
        </div>
        <form className="search" action="/invoices">
          <Icon n="search" />
          {active && <input type="hidden" name="status" value={active} />}
          <input name="q" defaultValue={q} placeholder="Cari nomor, customer, PIC…" />
        </form>
        {me.role === "admin" && (
          <Link href="/invoices/new" className="btn pri">
            <Icon n="plus" /> Invoice baru
          </Link>
        )}
      </div>
      <div className="chips filt">
        <Link href={href(null)} className={`chip${!active ? " on" : ""}`}>
          Semua <small>{all.length}</small>
        </Link>
        {STATUS_ORDER.map((s) => (
          <Link key={s} href={href(s)} className={`chip${active === s ? " on" : ""}`}>
            {STATUS_LABEL[s]} <small>{all.filter((i) => i.status === s).length}</small>
          </Link>
        ))}
      </div>
      <InvoiceTable
        rows={rows}
        empty={
          <div className="empty">
            <b>Tidak ada invoice</b>
            {term || active ? "Coba ubah filter atau kata kunci." : "Invoice yang dibuat Admin akan tampil di sini."}
          </div>
        }
      />
    </>
  );
}
