/** Layout dua kolom untuk halaman masuk, daftar, dan onboarding. */
export function AuthShell({ children }: { children: React.ReactNode }) {
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
      <section className="login-form">{children}</section>
    </div>
  );
}
