"use client";

import { useActionState, useState } from "react";
import type { Role } from "@/lib/types";
import { logoutAction, onboardingAction } from "../actions";

const ROLES: { value: Role; label: string; desc: string }[] = [
  { value: "admin", label: "Admin", desc: "Menyiapkan invoice, mengelola customer, dan mengajukan ke Finance." },
  { value: "finance", label: "Finance", desc: "Memeriksa, menyetujui, atau meminta revisi invoice yang diajukan." },
];

const STEPS = ["Isi nama", "Pilih role", "Konfirmasi"];

export function OnboardingForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(onboardingAction, undefined);
  const [step, setStep] = useState(0);
  const [name, setName] = useState("");
  const [role, setRole] = useState<Role | null>(null);
  const roleName = ROLES.find((r) => r.value === role)?.label;

  return (
    <div className="onb">
      <form
        action={action}
        onSubmit={(e) => {
          // Enter di langkah awal = lanjut, bukan kirim.
          if (step < 2) {
            e.preventDefault();
            if (step === 0 && name.trim()) setStep(1);
            else if (step === 1 && role) setStep(2);
          }
        }}
      >
        <p className="step">
          Langkah {step + 1} dari {STEPS.length}: {STEPS[step]}
        </p>
        <div className="steps" aria-hidden>
          {STEPS.map((s, i) => (
            <i key={s} className={i <= step ? "on" : undefined} />
          ))}
        </div>
        <input type="hidden" name="full_name" value={name.trim()} />
        <input type="hidden" name="role" value={role ?? ""} />

        {step === 0 && (
          <>
            <h1>Silakan isi nama</h1>
            <p className="sub">Nama ini tampil di invoice dan riwayat aktivitas.</p>
            <div className="f">
              <label htmlFor="name">Nama lengkap</label>
              <input id="name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" required autoFocus />
            </div>
            <button type="button" className="btn pri block" disabled={!name.trim()} onClick={() => setStep(1)} style={{ height: 40 }}>
              Lanjut
            </button>
          </>
        )}

        {step === 1 && (
          <>
            <h1>Pilih role</h1>
            <p className="sub">Role menentukan tugas kamu di alur invoice.</p>
            <div className="opts" role="radiogroup">
              {ROLES.map((r) => (
                <label key={r.value} className={`opt${role === r.value ? " on" : ""}`}>
                  <input type="radio" name="role_pick" checked={role === r.value} onChange={() => setRole(r.value)} />
                  <div>
                    <b>{r.label}</b>
                    <span>{r.desc}</span>
                  </div>
                </label>
              ))}
            </div>
            <div className="row2">
              <button type="button" className="btn" onClick={() => setStep(0)} style={{ height: 40 }}>
                Kembali
              </button>
              <button type="button" className="btn pri block" disabled={!role} onClick={() => setStep(2)} style={{ height: 40 }}>
                Lanjut
              </button>
            </div>
          </>
        )}

        {step === 2 && (
          <>
            <h1>Konfirmasi</h1>
            <p className="sub">Pastikan data berikut sudah benar.</p>
            {state?.error && <div className="err">{state.error}</div>}
            <dl className="sum">
              <div>
                <dt>Nama</dt>
                <dd>{name.trim()}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>{email}</dd>
              </div>
              <div>
                <dt>Role</dt>
                <dd>{roleName}</dd>
              </div>
            </dl>
            <div className="row2">
              <button type="button" className="btn" onClick={() => setStep(1)} disabled={pending} style={{ height: 40 }}>
                Kembali
              </button>
              <button className="btn pri block" disabled={pending} style={{ height: 40 }}>
                {pending ? "Menyimpan…" : "Konfirmasi"}
              </button>
            </div>
          </>
        )}
      </form>
      <form action={logoutAction} className="alt">
        Bukan akun kamu? <button>Keluar</button>
      </form>
    </div>
  );
}
