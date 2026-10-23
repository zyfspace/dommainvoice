"use client";

import { useId, useMemo, useRef, useState } from "react";
import { PRODUCTS, productLabel, type Product } from "@/lib/products";

const LIMIT = 60;

function search(q: string): Product[] {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return PRODUCTS.slice(0, LIMIT);
  const out: Product[] = [];
  for (const p of PRODUCTS) {
    const hay = `${p.sku} ${p.name} ${p.variant}`.toLowerCase();
    if (terms.every((t) => hay.includes(t))) out.push(p);
    if (out.length >= LIMIT) break;
  }
  return out;
}

/**
 * Input SKU / Product dengan dropdown pencarian dari master barang.
 * Memilih barang mengisi SKU & Product sekaligus; teks bebas tetap diizinkan (mis. biaya pengiriman).
 */
export function ProductPicker({
  value,
  onChange,
  onPick,
  placeholder,
  required,
}: {
  value: string;
  onChange: (v: string) => void;
  onPick: (p: Product) => void;
  placeholder?: string;
  required?: boolean;
}) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [query, setQuery] = useState("");
  const list = useRef<HTMLUListElement>(null);
  const results = useMemo(() => search(query), [query]);

  function show(q: string) {
    setQuery(q);
    setActive(0);
    setOpen(true);
  }

  function pick(p: Product) {
    onPick(p);
    setOpen(false);
  }

  function move(d: number) {
    if (!open) return show("");
    const n = (active + d + results.length) % Math.max(results.length, 1);
    setActive(n);
    list.current?.children[n]?.scrollIntoView({ block: "nearest" });
  }

  return (
    <div className="combo">
      <input
        value={value}
        placeholder={placeholder}
        required={required}
        role="combobox"
        aria-expanded={open}
        aria-controls={id}
        autoComplete="off"
        onFocus={() => show("")}
        onBlur={() => setOpen(false)}
        onChange={(e) => {
          onChange(e.target.value);
          show(e.target.value);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") (e.preventDefault(), move(1));
          else if (e.key === "ArrowUp") (e.preventDefault(), move(-1));
          else if (e.key === "Escape") setOpen(false);
          else if (e.key === "Enter" && open && results[active]) (e.preventDefault(), pick(results[active]));
        }}
      />
      {open && (
        <ul className="combo-list" id={id} role="listbox" ref={list} onMouseDown={(e) => e.preventDefault()}>
          {results.length === 0 ? (
            <li className="combo-empty">Tidak ada di master barang — teks diketik tetap dipakai.</li>
          ) : (
            results.map((p, i) => (
              <li
                key={p.sku}
                role="option"
                aria-selected={i === active}
                className={i === active ? "on" : ""}
                onMouseEnter={() => setActive(i)}
                onClick={() => pick(p)}
              >
                <span className="combo-sku">{p.sku}</span>
                <span className="combo-name">{productLabel(p)}</span>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
