import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getProfile } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage() {
  if (await getProfile()) redirect("/");
  return (
    <div className="login">
      <section className="login-art">
        <div className="brand" style={{ padding: 0 }}>
          <div>
          <img className="brand-logo" src="/brand/domma.png" alt="Domma" width={180} height={38} />
          <small>Invoice Management</small>
        </div>
        </div>
        <div>
          <h2>Invoice B2B, dari request sampai terbit.</h2>
          <p>Admin menyiapkan invoice, Finance memeriksa dan menyetujui. PDF, email, dan data produksi diproses otomatis.</p>
          <div className="flow">
            <span>Draft</span><i>→</i><span>On Check</span><i>→</i><span>Approved</span><i>→</i><span>Issued</span>
          </div>
        </div>
        <small style={{ color: "var(--navy-mut)" }}>Akses internal Domma</small>
      </section>
      <section className="login-form">
        <LoginForm />
      </section>
    </div>
  );
}
