"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/Icon";
import { fmtDateTime } from "@/lib/domain";

type Step = { label: string; at: string | null };

const POLL_MS = 5000;
const POLL_LIMIT_MS = 10 * 60 * 1000;

/**
 * Progres penerbitan otomatis setelah invoice di-approve.
 * Selama ada tahap yang belum selesai, halaman di-refresh berkala supaya hasil callback langsung tampil.
 */
export function IssueProgress({ steps, failed }: { steps: Step[]; failed: string | null }) {
  const router = useRouter();
  const done = steps.every((s) => s.at);
  // Sudah lengkap sejak halaman dibuka → tidak perlu banner sama sekali.
  const [watched] = useState(!done);
  const [stale, setStale] = useState(false);

  useEffect(() => {
    if (done || failed) return;
    const started = Date.now();
    const t = setInterval(() => {
      if (document.hidden) return;
      if (Date.now() - started > POLL_LIMIT_MS) {
        clearInterval(t);
        setStale(true);
        return;
      }
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [done, failed, router]);

  if (!watched) return null;

  const title = done
    ? "Invoice sudah terbit"
    : failed
      ? "Penerbitan otomatis terhenti"
      : "Invoice sedang diterbitkan";
  const desc = done
    ? "PDF sudah jadi, email sudah dikirim ke customer, dan data sudah tercatat di Google Sheets."
    : failed
      ? `Ada tahap yang gagal: ${failed}. Hubungi admin sistem atau terbitkan manual.`
      : stale
        ? "Prosesnya lebih lama dari biasanya. Muat ulang halaman untuk cek lagi."
        : "Halaman ini akan ter-update sendiri begitu tiap tahap selesai.";

  return (
    <div className={`banner issue${failed && !done ? " dark" : ""}`}>
      <Icon n={done ? "check" : failed ? "alert" : "refresh"} s={18} />
      <div className="rev-body">
        <b>{title}</b>
        {desc}
        <ol className="issue-steps">
          {steps.map((s) => (
            <li key={s.label} className={s.at ? "done" : failed ? "" : "wait"}>
              <span className="dot">{s.at && <Icon n="check" s={11} />}</span>
              <span>{s.label}</span>
              <small>{s.at ? fmtDateTime(s.at) : failed ? "Belum" : "Menunggu"}</small>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
