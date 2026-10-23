"use client";

import { useEffect, useRef, useState } from "react";
import { printInvoiceAction } from "@/app/actions";
import { downloadPdf } from "@/lib/pdf";
import { Icon } from "./Icon";
import { PrintConfirm } from "./PrintConfirm";

/** Download invoice: kertas di halaman ini dijadikan file PDF dan langsung terunduh (tanpa dialog print). */
export function DownloadButton({ fileName }: { fileName: string }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function run() {
    const el = document.querySelector<HTMLElement>("article.inv");
    if (!el) return;
    setBusy(true);
    setErr(null);
    try {
      await downloadPdf(el, fileName);
    } catch {
      setErr("Gagal membuat PDF, coba lagi.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        className="btn sm"
        onClick={run}
        disabled={busy}
        aria-label="Download invoice (PDF)"
        title="Download invoice (PDF)"
      >
        <Icon n="download" s={14} /> {busy ? "Memproses…" : "Invoice"}
      </button>
      {err && <span className="err" style={{ margin: 0 }}>{err}</span>}
    </>
  );
}

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
        onClick={() => run(confirmed)}
        disabled={busy}
        aria-label={small ? "Cetak invoice" : undefined}
        title={small ? "Cetak invoice" : undefined}
      >
        <Icon n="printer" s={small ? 14 : undefined} /> {busy ? "Memproses…" : small ? "Invoice" : "Cetak / Simpan PDF"}
      </button>
      {err && <span className="err" style={{ margin: 0 }}>{err}</span>}
      {conflict && (
        <PrintConfirm {...conflict} busy={busy} onYes={() => run(true)} onNo={() => setConflict(null)} />
      )}
    </>
  );
}
