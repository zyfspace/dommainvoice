import { AccountForm } from "@/components/AccountForm";
import { requireProfile, roleLabel } from "@/lib/auth";

export const metadata = { title: "Akun" };

const PERMS = {
  admin: [
    "Membuat & mengedit invoice (Draft / Revision Requested)",
    "Mengelola customer & PIC",
    "Mengubah harga pricelist per tier",
    "Mengajukan invoice ke Finance",
  ],
  finance: [
    "Approve, reject, atau minta revisi invoice On Check",
    "Membatalkan invoice",
    "Menerima notifikasi email saat ada invoice baru diajukan",
  ],
};

export default async function AccountPage() {
  const me = await requireProfile();
  return (
    <>
      <div className="top">
        <div style={{ marginRight: "auto" }}>
          <h1>Akun</h1>
          <div className="sub">Profil dan hak akses kamu.</div>
        </div>
      </div>
      <div className="cols even">
        <AccountForm me={me} />
        <div className="panel">
          <h3>
            Hak akses <span className="mut role-tag" style={{ color: "var(--navy)", borderColor: "var(--line)" }}>{roleLabel(me)}</span>
          </h3>
          <ul style={{ paddingLeft: 18, display: "grid", gap: 6 }}>
            {PERMS[me.role].map((p) => (
              <li key={p}>{p}</li>
            ))}
          </ul>
        </div>
      </div>
    </>
  );
}
