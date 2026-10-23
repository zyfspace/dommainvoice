import Link from "next/link";
import { notFound } from "next/navigation";
import { CustomerForm } from "@/components/CustomerForm";
import { Icon } from "@/components/Icon";
import { InvoiceTable } from "@/components/InvoiceTable";
import { requireProfile } from "@/lib/auth";
import { repo } from "@/lib/repo";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const c = await repo.getCustomer((await params).id);
  return { title: c?.company_name ?? "Customer" };
}

export default async function CustomerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireProfile();
  const [c, invoices] = await Promise.all([repo.getCustomer(id), repo.listInvoices()]);
  if (!c) notFound();
  const own = invoices.filter((i) => i.customer_id === id);
  return (
    <>
      <Link href="/customers" className="crumb">
        <Icon n="back" s={14} /> Customers
      </Link>
      <div className="top">
        <div style={{ marginRight: "auto" }}>
          <h1>{c.company_name}</h1>
          <div className="sub">{me.role === "admin" ? "Perubahan tidak mengubah invoice yang sudah dibuat." : "Hanya Admin yang dapat mengubah data customer."}</div>
        </div>
        {me.role === "admin" && (
          <Link href="/invoices/new" className="btn">
            <Icon n="plus" /> Invoice baru
          </Link>
        )}
      </div>
      <CustomerForm initial={c} readOnly={me.role !== "admin"} />
      <h3 style={{ margin: "30px 0 12px", fontSize: 14 }}>Histori invoice</h3>
      <InvoiceTable rows={own} />
    </>
  );
}
