"use client";

import { useActionState } from "react";
import { updateAccountAction } from "@/app/actions";
import type { Profile } from "@/lib/types";

export function AccountForm({ me }: { me: Profile }) {
  const [state, action, pending] = useActionState(updateAccountAction, undefined);
  return (
    <form action={action} className="panel">
      <h3>Profil</h3>
      {state?.error && <div className="err">{state.error}</div>}
      {state?.ok && <div className="ok">{state.ok}</div>}
      <div className="f">
        <label>Email</label>
        <input value={me.email} readOnly />
      </div>
      <div className="f">
        <label>Nama</label>
        <input name="full_name" defaultValue={me.full_name ?? ""} />
      </div>
      <button className="btn pri" disabled={pending}>
        {pending ? "Menyimpan…" : "Simpan"}
      </button>
    </form>
  );
}
