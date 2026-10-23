"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions";
import type { Profile } from "@/lib/types";
import { Icon, type IconName } from "./Icon";

const NAV: { href: string; label: string; icon: IconName }[] = [
  { href: "/", label: "Overview", icon: "home" },
  { href: "/invoices", label: "Invoices", icon: "file" },
  { href: "/customers", label: "Customers", icon: "users" },
  { href: "/pricelist", label: "Pricelist", icon: "file" },
  { href: "/account", label: "Akun", icon: "user" },
];

export function Sidebar({ me, pending }: { me: Profile; pending: number }) {
  const path = usePathname();
  const on = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <aside className="side">
      <Link href="/" className="brand">
        <div>
          <img className="brand-logo" src="/brand/domma.png" alt="Domma" width={180} height={38} />
          <small>Invoice Management</small>
        </div>
      </Link>
      <nav className="tabs" aria-label="Menu utama">
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className={`nav${on(n.href) ? " on" : ""}`} title={n.label} aria-current={on(n.href) ? "page" : undefined}>
            <Icon n={n.icon} />
            <span>{n.label}</span>
            {n.href === "/invoices" && pending > 0 && <em>{pending}</em>}
          </Link>
        ))}
      </nav>
      <div className="side-foot">
        <div className="who">
          <b>{me.full_name ?? me.email}</b>
          <span>{me.email}</span>
          <div style={{ marginTop: 6 }}>
            <span className="role-tag">{me.role}</span>
          </div>
        </div>
        <form action={logoutAction}>
          <button className="logout" title="Keluar">
            <Icon n="logout" /> <span>Keluar</span>
          </button>
        </form>
      </div>
    </aside>
  );
}
