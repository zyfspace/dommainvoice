import { PRINT_TRACKED, STATUS_LABEL, fmtPrinted } from "@/lib/domain";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { Icon } from "./Icon";

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

/** Status cetak invoice yang sudah di-approve. Status lain: "—". */
export function PrintStatus({ inv }: { inv: Pick<Invoice, "status" | "printed_at" | "printed_by_name"> }) {
  if (!PRINT_TRACKED.includes(inv.status)) return <span className="mut">—</span>;
  if (!inv.printed_at) return <span className="pst">Belum dicetak</span>;
  return (
    <span className="pst done" title={`Dicetak oleh ${inv.printed_by_name ?? "—"}, ${fmtPrinted(inv.printed_at)}`}>
      <Icon n="check" s={12} /> Sudah dicetak
    </span>
  );
}

/** "Invoice ini sudah dicetak oleh … pada …". */
export function PrintedNote({ name, at }: { name: string | null; at: string }) {
  return (
    <p className="printed-note">
      <Icon n="check" s={14} />
      <span>
        Invoice ini sudah dicetak oleh <b>{name ?? "—"}</b> pada {fmtPrinted(at)}
      </span>
    </p>
  );
}
