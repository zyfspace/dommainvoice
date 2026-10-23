"use client";

import { useActionState, useState } from "react";
import { Icon } from "@/components/Icon";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  const [show, setShow] = useState(false);
  return (
    <form action={action}>
      <h1>Masuk</h1>
      <p className="sub">Gunakan akun internal yang diberikan administrator.</p>
      {state?.error && <div className="err">{state.error}</div>}
      <div className="f">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" placeholder="email@perusahaan.com" required autoFocus />
      </div>
      <div className="f">
        <label htmlFor="password">Password</label>
        <div className="pw">
          <input id="password" name="password" type={show ? "text" : "password"} autoComplete="current-password" required />
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
      <button className="btn pri block" disabled={pending} style={{ height: 40, marginTop: 6 }}>
        {pending ? "Memproses…" : "Masuk"}
      </button>
    </form>
  );
}
