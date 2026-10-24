"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Icon } from "@/components/Icon";

/** Ambil ulang data server tanpa reload penuh, misal untuk cek perubahan status invoice. */
export function RefreshButton() {
  const router = useRouter();
  const [pending, start] = useTransition();

  return (
    <button
      type="button"
      className={`btn${pending ? " busy" : ""}`}
      onClick={() => start(() => router.refresh())}
      disabled={pending}
      aria-label="Muat ulang data"
      title="Muat ulang data"
    >
      <Icon n="refresh" /> {pending ? "Memuat…" : "Refresh"}
    </button>
  );
}
