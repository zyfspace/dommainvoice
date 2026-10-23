"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Icon } from "@/components/Icon";
import { registerAction } from "../actions";

export function RegisterForm() {
  const [state, action, pending] = useActionState(registerAction, undefined);
  const [show, setShow] = useState(false);
  return (
    <form action={action}>
      <h1>Daftar</h1>
      <p className="sub">Buat akun untuk mulai bekerja di Domma Invoice.</p>
      {state?.error && <div className="err">{state.error}</div>}
      <div className="f">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" required autoFocus />
      </div>
      <div className="f">
        <label htmlFor="password">Password</label>
        <div className="pw">
          <input id="password" name="password" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} required />
          <button
            type="button"
            className="ib"
            onClick={() => setShow((v) => !v)}
            aria-label={show ? "Sembunyikan password" : "Tampilkan password"}
            aria-pressed={show}
          >
            <Icon n={show ? "eyeOff" : "eye"} />
          </button>
        </div>
      </div>
      <div className="f">
        <label htmlFor="confirm">Ulangi password</label>
        <input id="confirm" name="confirm" type={show ? "text" : "password"} autoComplete="new-password" minLength={8} required />
      </div>
      <button className="btn pri block" disabled={pending} style={{ height: 40, marginTop: 6 }}>
        {pending ? "Memproses…" : "Daftar"}
      </button>
      <p className="alt">
        Sudah punya akun? <Link href="/login">Masuk</Link>
      </p>
    </form>
  );
}
