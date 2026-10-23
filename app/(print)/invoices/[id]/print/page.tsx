import Link from "next/link";
import { notFound } from "next/navigation";
import { InvoicePaper } from "@/components/InvoicePaper";
import { PrintButton } from "@/components/PrintButton";
import { PrintedNote } from "@/components/Status";
import { invoiceFileName } from "@/lib/company";
import { PRINTABLE, STATUS_LABEL } from "@/lib/domain";
import { requireProfile } from "@/lib/auth";
import { verifyPrintToken } from "@/lib/n8n";
import { getInvoiceCached } from "@/lib/repo";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const inv = await getInvoiceCached((await params).id);
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
  const viaN8n = verifyPrintToken(id, token);
  if (!viaN8n) await requireProfile();
  const inv = await getInvoiceCached(id);
  if (!inv) notFound();
  if (!viaN8n && !PRINTABLE.includes(inv.status))
    return (
      <div className="print-wrap">
        <div className="empty">
          <b>Invoice belum bisa dicetak</b>
          Invoice berstatus {STATUS_LABEL[inv.status]}. Cetak tersedia setelah invoice di-approve Finance.
          <div style={{ marginTop: 14 }}>
            <Link href={`/invoices/${inv.id}`} className="btn sm">
              Kembali ke invoice
            </Link>
          </div>
        </div>
      </div>
    );
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
