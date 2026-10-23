"use client";

import { Icon } from "./Icon";

export function PrintButton() {
  return (
    <button className="btn pri" onClick={() => window.print()}>
      <Icon n="printer" /> Cetak / Simpan PDF
    </button>
  );
}
