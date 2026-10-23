"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { isOverdue } from "@/lib/domain";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { Icon } from "./Icon";
import { InvoiceTable } from "./InvoiceTable";

type Tab = { key: string; label: string; match: (i: Invoice) => boolean };

const PAGE = 25;

export function DashInvoices({ rows, todo }: { rows: Invoice[]; todo: InvoiceStatus[] }) {
  const tabs: Tab[] = useMemo(
    () => [
      { key: "todo", label: "Perlu tindakan", match: (i) => todo.includes(i.status) },
      { key: "all", label: "Semua", match: () => true },
      { key: "on_check", label: "On Check", match: (i) => i.status === "on_check" },
      { key: "approved", label: "Approved", match: (i) => i.status === "approved" },
      { key: "issued", label: "Issued", match: (i) => i.status === "issued" },
      { key: "paid", label: "Paid", match: (i) => i.status === "paid" },
      { key: "overdue", label: "Lewat due", match: (i) => isOverdue(i.due_date, i.status) },
    ],
    [todo],
  );
  const counts = useMemo(() => Object.fromEntries(tabs.map((t) => [t.key, rows.filter(t.match).length])), [tabs, rows]);
  const [tab, setTab] = useState(counts.todo ? "todo" : "all");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);

  const list = useMemo(() => {
    const t = tabs.find((x) => x.key === tab) ?? tabs[1];
    const s = q.trim().toLowerCase();
    return rows.filter(
      (i) =>
        t.match(i) &&
        (!s || [i.invoice_number, i.company_name, i.pic_name].some((v) => v?.toLowerCase().includes(s))),
    );
  }, [rows, tabs, tab, q]);

  const pages = Math.max(1, Math.ceil(list.length / PAGE));
  const cur = Math.min(page, pages);
  const from = list.length ? (cur - 1) * PAGE + 1 : 0;
  const to = Math.min(cur * PAGE, list.length);
  const nums = Array.from({ length: pages }, (_, k) => k + 1).filter((p) => p === 1 || p === pages || Math.abs(p - cur) <= 1);

  return (
    <section className="dash-list">
      <div className="dash-bar">
        <div className="dtabs" role="tablist">
          {tabs.map((t) => (
            <button key={t.key} role="tab" aria-selected={tab === t.key} className={tab === t.key ? "on" : ""} onClick={() => { setTab(t.key); setPage(1); }}>
              {t.label} <small className="num">{counts[t.key]}</small>
            </button>
          ))}
        </div>
        <label className="search sm">
          <Icon n="search" />
          <input value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} placeholder="Cari no. invoice / customer" />
        </label>
      </div>
      <InvoiceTable
        rows={list.slice((cur - 1) * PAGE, cur * PAGE)}
        empty={<div className="empty"><b>Tidak ada invoice</b>Tidak ada yang cocok dengan filter ini.</div>}
      />
      <div className="dash-foot">
        <span>
          <b className="num">{from}–{to}</b> dari <b className="num">{list.length}</b> invoice
        </span>
        <div className="pager">
          <button disabled={cur === 1} onClick={() => setPage(cur - 1)} aria-label="Sebelumnya">‹</button>
          {nums.map((p, k) => (
            <span key={p} style={{ display: "contents" }}>
              {k > 0 && p - nums[k - 1] > 1 && <em>…</em>}
              <button className={p === cur ? "on" : ""} onClick={() => setPage(p)}>{p}</button>
            </span>
          ))}
          <button disabled={cur === pages} onClick={() => setPage(cur + 1)} aria-label="Berikutnya">›</button>
        </div>
        <Link href="/invoices">Buka halaman Invoices →</Link>
      </div>
    </section>
  );
}
