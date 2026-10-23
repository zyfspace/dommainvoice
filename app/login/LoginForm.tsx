"use client";

import { useActionState } from "react";
import { loginAction } from "../actions";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAction, undefined);
  return (
    <form action={action}>
      <h1>Masuk</h1>
      <p className="sub">Gunakan akun internal yang diberikan administrator.</p>
      {state?.error && <div className="err">{state.error}</div>}
      <div className="f">
        <label htmlFor="email">Email</label>
        <input id="email" name="email" type="email" autoComplete="username" placeholder="nama@withdomma.com" required autoFocus />
      </div>
      <div className="f">
        <label htmlFor="password">Password</label>
        <input id="password" name="password" type="password" autoComplete="current-password" required />
      </div>
      <button className="btn pri block" disabled={pending} style={{ height: 40, marginTop: 6 }}>
        {pending ? "Memproses…" : "Masuk"}
      </button>
    </form>
  );
}
