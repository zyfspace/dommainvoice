"use client";

import { useEffect } from "react";
import { fmtPrinted } from "@/lib/domain";

/** Pop-up konfirmasi cetak ulang invoice yang sudah dicetak admin lain. */
export function PrintConfirm({
  name,
  at,
  busy,
  onYes,
  onNo,
}: {
  name: string;
  at: string;
  busy?: boolean;
  onYes: () => void;
  onNo: () => void;
}) {
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onNo();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onNo]);

  return (
    <div className="pv-back cfm-back noprint" onClick={onNo}>
      <div className="cfm" role="alertdialog" aria-modal="true" aria-labelledby="cfm-t" onClick={(e) => e.stopPropagation()}>
        <h3 id="cfm-t">Invoice sudah dicetak</h3>
        <p>
          Invoice ini sudah dicetak oleh <b>{name}</b> pada {fmtPrinted(at)}. Yakin ingin mencetak lagi?
        </p>
        <div className="cfm-f">
          <button type="button" className="btn" onClick={onNo} autoFocus>
            Tidak
          </button>
          <button type="button" className="btn pri" onClick={onYes} disabled={busy}>
            {busy ? "Memproses…" : "Ya, cetak lagi"}
          </button>
        </div>
      </div>
    </div>
  );
}
