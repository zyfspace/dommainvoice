import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Icon } from "@/components/Icon";
import { StatusPair } from "@/components/Status";
import { SuratJalanForm } from "@/components/SuratJalanForm";
import { requireProfile } from "@/lib/auth";
import { SURAT_JALAN_ROLES, suratJalanReady, todayJakarta } from "@/lib/domain";
import { PRODUCTS } from "@/lib/products";
import { repo } from "@/lib/repo";
import { getPreparers } from "@/lib/service";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const inv = await repo.getInvoice((await params).id);
  return { title: inv ? `Surat Jalan - ${inv.company_name}` : "Surat Jalan" };
}

export default async function SuratJalanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const me = await requireProfile();
  const inv = await repo.getInvoice(id);
  if (!inv) notFound();
  // Surat Jalan hanya untuk invoice yang sudah dibayar (grup DP: Pelunasan, setelah semua Paid).
  const group = inv.group_id ? await repo.listGroup(inv.group_id) : [inv];
  if (!suratJalanReady(inv, group) || !SURAT_JALAN_ROLES.includes(me.role)) redirect(`/invoices/${id}`);

  const [customer, preparers] = await Promise.all([
    inv.customer_id ? repo.getCustomer(inv.customer_id) : null,
    getPreparers(),
  ]);
  const pic = customer?.pics.find((p) => p.id === inv.pic_id);
  const phone = customer?.phone || inv.phone;
  const picLine = [pic?.name ?? inv.pic_name, pic?.position, pic?.phone].filter(Boolean).join(" - ");
  const customerInfo = [
    inv.company_name,
    ...(inv.billing_address ?? "").split(/\r?\n/),
    phone ? `T : ${phone}` : "",
    picLine,
  ]
    .map((l) => l.trim())
    .filter(Boolean)
    .join("\n");

  const rows = inv.items.map((it) => {
    const p = it.sku ? PRODUCTS.find((x) => x.sku === it.sku) : undefined;
    return {
      sku: it.sku ?? "",
      product: p?.name ?? it.product,
      variant: p?.variant ?? "",
      quantity: it.quantity,
      uom: it.uom || "Pcs",
      remarks: "",
    };
  });

  return (
    <>
      <Link href={`/invoices/${id}`} className="crumb noprint">
        <Icon n="back" s={14} /> Detail invoice
      </Link>
      <div className="top noprint">
        <div style={{ marginRight: "auto", minWidth: 0 }}>
          <h1>Cetak Surat Jalan</h1>
          <div className="sub">
            {inv.invoice_number} · {inv.company_name}
          </div>
        </div>
        <StatusPair inv={inv} lg />
      </div>
      <SuratJalanForm
        preparers={preparers}
        initial={{ customer: customerInfo, sales_no: inv.invoice_number ?? "", date: todayJakarta(), rows }}
      />
    </>
  );
}
