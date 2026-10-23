import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { InvoiceForm } from "@/components/InvoiceForm";
import { requireProfile } from "@/lib/auth";
import { DEFAULT_REMARKS, DEFAULT_REMARKS_KEY } from "@/lib/company";
import { todayJakarta } from "@/lib/domain";
import { repo } from "@/lib/repo";
import { getPricelist } from "@/lib/service";

export const metadata = { title: "Invoice baru" };

export default async function NewInvoicePage() {
  const me = await requireProfile();
  if (me.role !== "admin") redirect("/invoices");
  const [customers, savedRemarks, pricelist] = await Promise.all([
    repo.listCustomers(),
    repo.getSetting(DEFAULT_REMARKS_KEY),
    getPricelist(),
  ]);
  return (
    <>
      <Link href="/invoices" className="crumb">
        <Icon n="back" s={14} /> Invoices
      </Link>
      <div className="top">
        <div style={{ marginRight: "auto" }}>
          <h1>Invoice baru</h1>
          <div className="sub">Nomor invoice dibuat otomatis setelah disetujui Finance.</div>
        </div>
      </div>
      <InvoiceForm
        customers={customers}
        defaults={{ invoice_date: todayJakarta(), due_date: todayJakarta(14) }}
        defaultRemarks={savedRemarks ?? DEFAULT_REMARKS}
        pricelist={pricelist}
      />
    </>
  );
}
