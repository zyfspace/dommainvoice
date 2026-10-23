import { notFound } from "next/navigation";
import { InvoicePaper } from "@/components/InvoicePaper";
import { PrintButton } from "@/components/PrintButton";
import { invoiceFileName } from "@/lib/company";
import { requireProfile } from "@/lib/auth";
import { repo } from "@/lib/repo";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const inv = await repo.getInvoice((await params).id);
  return { title: inv ? invoiceFileName(inv) : "Invoice" };
}

export default async function PrintPage({ params }: { params: Promise<{ id: string }> }) {
  await requireProfile();
  const inv = await repo.getInvoice((await params).id);
  if (!inv) notFound();
  return (
    <div className="print-wrap">
      <div className="print-bar">
        <PrintButton />
      </div>
      <InvoicePaper inv={inv} />
    </div>
  );
}
