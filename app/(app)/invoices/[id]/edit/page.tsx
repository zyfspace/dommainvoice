import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { InvoiceForm } from "@/components/InvoiceForm";
import { Status } from "@/components/Status";
import { requireProfile } from "@/lib/auth";
import { EDITABLE, deliveryGate, todayJakarta } from "@/lib/domain";
import { repo } from "@/lib/repo";
import { getPricelist } from "@/lib/service";

export const metadata = { title: "Edit invoice" };

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireProfile();
  const inv = await repo.getInvoice(id);
  if (!inv) notFound();
  if (me.role !== "admin" || !EDITABLE.includes(inv.status)) redirect(`/invoices/${id}`);
  // Grup DP / Termin diedit dari tahap 1 (isi semua tahap sama).
  const group = inv.group_id ? await repo.listGroup(inv.group_id) : [];
  const first = group.find((g) => g.installment === 1);
  if (first && first.id !== id) redirect(`/invoices/${first.id}/edit`);
  const schedule = group.length
    ? group.map((g) => ({ percent: g.payable_percent ?? 0, due_date: g.due_date }))
    : undefined;
  const deliveryAfter = group.length ? (deliveryGate(group)?.installment ?? undefined) : undefined;
  const [customers, pricelist] = await Promise.all([repo.listCustomers(), getPricelist()]);
  return (
    <>
      <Link href={`/invoices/${id}`} className="crumb">
        <Icon n="back" s={14} /> Detail invoice
      </Link>
      <div className="top">
        <div style={{ marginRight: "auto" }}>
          <h1>Edit invoice</h1>
          <div className="sub">{inv.company_name}</div>
        </div>
        <Status s={inv.status} lg />
      </div>
      {inv.revision_notes && inv.status === "revision_requested" && (
        <div className="banner dark">
          <Icon n="alert" s={18} />
          <div>
            <b>Catatan revisi dari Finance</b>
            {inv.revision_notes}
          </div>
        </div>
      )}
      <InvoiceForm customers={customers} initial={inv} pricelist={pricelist} schedule={schedule} deliveryAfter={deliveryAfter} defaults={{ invoice_date: todayJakarta(), due_date: todayJakarta(14) }} />
    </>
  );
}
