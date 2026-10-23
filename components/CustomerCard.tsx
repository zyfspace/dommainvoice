"use client";

import Link from "next/link";
import { useState } from "react";
import type { Customer } from "@/lib/types";
import { Icon } from "./Icon";

export function CustomerCard({ c, invoiceCount, billed }: { c: Customer; invoiceCount: number; billed: string }) {
  const [open, setOpen] = useState(false);
  const [first, ...rest] = c.pics;

  return (
    <div className={`card cust${open ? " open" : ""}`}>
      <button type="button" className="cust-head" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        <div style={{ minWidth: 0 }}>
          <h3>{c.company_name}</h3>
          <div className="mut cust-pic">
            <Icon n="user" s={13} /> {first?.name ?? "Belum ada PIC"}
            {rest.length > 0 && <span className="tag">+{rest.length} PIC</span>}
          </div>
        </div>
        <span className="cust-chev" aria-hidden>
          ▾
        </span>
      </button>

      {open && (
        <div className="cust-pics">
          <div className="mut" style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 0.4 }}>
            {c.pics.length > 1 ? `${c.pics.length} PIC` : "PIC"}
          </div>
          {c.pics.map((p) => (
            <div className="cust-pic-item" key={p.id}>
              <b>{p.name}</b>
              {p.position && <span className="mut"> · {p.position}</span>}
              {(p.email || p.phone) && <div className="mut">{[p.email, p.phone].filter(Boolean).join(" · ")}</div>}
            </div>
          ))}
          <Link href={`/customers/${c.id}`} className="btn sm" style={{ alignSelf: "flex-start" }}>
            Lihat detail
          </Link>
        </div>
      )}

      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, borderTop: "1px solid var(--line)", paddingTop: 10 }}>
        <span className="mut">{invoiceCount} invoice</span>
        <span className="num">{billed}</span>
      </div>
    </div>
  );
}
