"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_MS = 5000;
const POLL_LIMIT_MS = 10 * 60 * 1000;

/**
 * Refresh halaman berkala selama penerbitan otomatis masih berjalan,
 * supaya hasil callback (PDF, email, Sheets) langsung tampil tanpa reload manual.
 */
export function IssueWatcher({ pending }: { pending: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!pending) return;
    const started = Date.now();
    const t = setInterval(() => {
      if (document.hidden) return;
      if (Date.now() - started > POLL_LIMIT_MS) return clearInterval(t);
      router.refresh();
    }, POLL_MS);
    return () => clearInterval(t);
  }, [pending, router]);

  return null;
}
