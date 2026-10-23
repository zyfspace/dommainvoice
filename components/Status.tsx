import { STATUS_LABEL } from "@/lib/domain";
import type { Invoice, InvoiceStatus } from "@/lib/types";

export function Status({ s, lg }: { s: InvoiceStatus; lg?: boolean }) {
  return <span className={`st ${s}${lg ? " lg" : ""}`}>{STATUS_LABEL[s]}</span>;
}

/**
 * Status approval + status pembayaran, mis. "Approved | Paid".
 * Paid menggantikan Approved/Issued di database, jadi tahap approval-nya diturunkan dari issued_at.
 */
export function StatusPair({ inv, lg }: { inv: Pick<Invoice, "status" | "issued_at">; lg?: boolean }) {
  const approval: InvoiceStatus = inv.status === "paid" ? (inv.issued_at ? "issued" : "approved") : inv.status;
  const billed = inv.status === "approved" || inv.status === "issued" || inv.status === "paid";
  return (
    <span className={`st-pair${lg ? " lg" : ""}`}>
      <Status s={approval} lg={lg} />
      {billed && (
        <>
          <span className="st-sep">|</span>
          {inv.status === "paid" ? (
            <Status s="paid" lg={lg} />
          ) : (
            <span className={`st unpaid${lg ? " lg" : ""}`}>Unpaid</span>
          )}
        </>
      )}
    </span>
  );
}
