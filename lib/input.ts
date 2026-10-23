import type { InputHTMLAttributes } from "react";

/** Untuk <input type="number">: scroll & tombol ↑/↓ tidak boleh mengubah angka (Qty, harga). */
export const noSpin: Pick<InputHTMLAttributes<HTMLInputElement>, "onWheel" | "onKeyDown"> = {
  onWheel: (e) => e.currentTarget.blur(),
  onKeyDown: (e) => {
    if (e.key === "ArrowUp" || e.key === "ArrowDown") e.preventDefault();
  },
};
