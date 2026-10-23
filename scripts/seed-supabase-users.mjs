// Buat/perbarui 2 akun internal di Supabase via Admin API.
// Pakai: isi .env.local (URL + SERVICE_ROLE_KEY), lalu `npm run seed:supabase`.
import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

try {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
} catch {}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY wajib diisi.");
  process.exit(1);
}

const sb = createClient(url, key, { auth: { persistSession: false } });

const USERS = [
  { email: "admin@withdomma.com", password: "admindomma!", role: "admin", full_name: "Admin Domma" },
  { email: "finance@withdomma.com", password: "financedomma!", role: "finance", full_name: "Finance Domma" },
];

const { data: list, error: listErr } = await sb.auth.admin.listUsers({ perPage: 1000 });
if (listErr) throw listErr;

for (const u of USERS) {
  let user = list.users.find((x) => x.email === u.email);
  if (user) {
    const { error } = await sb.auth.admin.updateUserById(user.id, { password: u.password, email_confirm: true });
    if (error) throw error;
  } else {
    const { data, error } = await sb.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
      user_metadata: { full_name: u.full_name },
    });
    if (error) throw error;
    user = data.user;
  }
  const { error } = await sb
    .from("profiles")
    .upsert({ id: user.id, email: u.email, full_name: u.full_name, role: u.role }, { onConflict: "id" });
  if (error) throw error;
  console.log(`✓ ${u.email} (${u.role})`);
}
