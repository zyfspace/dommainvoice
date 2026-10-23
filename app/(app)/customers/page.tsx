import Link from "next/link";
import { CustomerCard } from "@/components/CustomerCard";
import { Icon } from "@/components/Icon";
import { requireProfile } from "@/lib/auth";
import { invoiceAmount, rupiah } from "@/lib/domain";
import { repo } from "@/lib/repo";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const me = await requireProfile();
  const { q = "" } = await searchParams;
  const [customers, invoices] = await Promise.all([repo.listCustomers(), repo.listInvoices()]);
  const term = q.trim().toLowerCase();
  const rows = customers.filter(
    (c) =>
      !term ||
      c.company_name.toLowerCase().includes(term) ||
      c.pics.some((p) => p.name.toLowerCase().includes(term) || p.email?.toLowerCase().includes(term)),
  );

  return (
    <>
      <div className="top">
        <div style={{ marginRight: "auto" }}>
          <h1>Customers</h1>
          <div className="sub">Data perusahaan & PIC yang dipakai saat membuat invoice.</div>
        </div>
        <form className="search" action="/customers">
          <Icon n="search" />
          <input name="q" defaultValue={q} placeholder="Cari perusahaan atau PIC…" />
        </form>
        {me.role === "admin" && (
          <Link href="/customers/new" className="btn pri">
            <Icon n="plus" /> Customer baru
          </Link>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="tw">
          <div className="empty">
            <b>{term ? "Tidak ditemukan" : "Belum ada customer"}</b>
            {term ? "Coba kata kunci lain." : "Tambahkan customer untuk mulai membuat invoice."}
          </div>
        </div>
      ) : (
        <div className="grid cust-grid">
          {rows.map((c) => {
            const own = invoices.filter((i) => i.customer_id === c.id);
            const billed = own.filter((i) => ["approved", "issued", "paid"].includes(i.status)).reduce((a, i) => a + invoiceAmount(i), 0);
            return <CustomerCard key={c.id} c={c} invoiceCount={own.length} billed={rupiah(billed)} />;
          })}
        </div>
      )}
    </>
  );
}
