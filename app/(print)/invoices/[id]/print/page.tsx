import { notFound } from "next/navigation";
import { InvoicePaper } from "@/components/InvoicePaper";
import { PrintButton } from "@/components/PrintButton";
import { PrintedNote } from "@/components/Status";
import { invoiceFileName } from "@/lib/company";
import { requireProfile } from "@/lib/auth";
import { verifyPrintToken } from "@/lib/n8n";
import { repo } from "@/lib/repo";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const inv = await repo.getInvoice((await params).id);
  return { title: inv ? invoiceFileName(inv) : "Invoice" };
}

export default async function PrintPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string; reprint?: string }>;
}) {
  const { id } = await params;
  const { token, reprint } = await searchParams;
  // n8n merender halaman ini jadi PDF memakai token sementara dari GET /api/n8n/invoices/{id}.
  if (!verifyPrintToken(id, token)) await requireProfile();
  const inv = await repo.getInvoice(id);
  if (!inv) notFound();
  return (
    <div className="print-wrap">
      <div className="print-bar">
        <PrintButton id={inv.id} confirmed={reprint === "1"} />
      </div>
      {inv.printed_at && (
        <div className="print-bar noprint">
          <PrintedNote name={inv.printed_by_name} at={inv.printed_at} />
        </div>
      )}
      <InvoicePaper inv={inv} />
    </div>
  );
}
