"use client";

import { useEffect, useRef, useState } from "react";
import { printInvoiceAction } from "@/app/actions";
import { Icon } from "./Icon";
import { PrintConfirm } from "./PrintConfirm";

/**
 * Tombol cetak invoice: dialog print dibuka di halaman yang sama, tanpa tab baru.
 * Sebelum dialog dibuka, cetak dicatat di server; kalau admin lain sudah mencetak duluan,
 * muncul konfirmasi dulu. `confirmed`: cetak ulang sudah dikonfirmasi (?reprint=1).
 */
export function PrintButton({
  id,
  confirmed = false,
  small = false,
}: {
  id: string;
  confirmed?: boolean;
  small?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [conflict, setConflict] = useState<{ name: string; at: string } | null>(null);
  const viaButton = useRef(false);

  // Ctrl+P / menu browser tetap tercatat (tanpa konfirmasi, dialog print sudah terbuka).
  useEffect(() => {
    const before = () => {
      if (viaButton.current) return;
      void printInvoiceAction(id, true);
    };
    window.addEventListener("beforeprint", before);
    return () => window.removeEventListener("beforeprint", before);
  }, [id]);

  async function run(force: boolean) {
    setBusy(true);
    setErr(null);
    try {
      const res = await printInvoiceAction(id, force);
      if ("error" in res) return setErr(res.error);
      if ("conflict" in res) return setConflict(res.conflict);
      setConflict(null);
      viaButton.current = true;
      window.print();
      viaButton.current = false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        className={small ? "btn sm" : "btn pri"}
        style={small ? { flex: 1 } : undefined}
        onClick={() => run(confirmed)}
        disabled={busy}
      >
        <Icon n="printer" s={small ? 14 : undefined} /> {busy ? "Memproses…" : small ? "Cetak" : "Cetak / Simpan PDF"}
      </button>
      {err && <span className="err" style={{ margin: 0 }}>{err}</span>}
      {conflict && (
        <PrintConfirm {...conflict} busy={busy} onYes={() => run(true)} onNo={() => setConflict(null)} />
      )}
    </>
  );
}
