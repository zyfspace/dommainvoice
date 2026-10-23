import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { repo } from "./repo";
import type { Profile } from "./types";

export const getProfile = cache(() => repo.currentProfile());
export const getSessionUser = cache(() => repo.currentUser());

export async function requireProfile() {
  const p = await getProfile();
  // Sudah login tapi belum punya profil → wajib onboarding dulu.
  if (!p) redirect((await getSessionUser()) ? "/onboarding" : "/login");
  return p;
}

// Server-only: domain tidak boleh ikut ke bundle client atau ditampilkan di UI.
const SIGNUP_DOMAIN = "withdomma.com";

export function canSignUp(email: string) {
  const m = /^[^\s@]+@([^\s@]+)$/.exec(email.trim().toLowerCase());
  return m?.[1] === SIGNUP_DOMAIN;
}

// Hanya label. Hak akses tetap mengikuti `role`, sama dengan akun admin/finance lain.
const SUPER_LABEL: Record<string, string> = {
  "admin@withdomma.com": "Super Admin",
  "finance@withdomma.com": "Super Finance",
};

export function roleLabel(p: Profile) {
  return SUPER_LABEL[p.email.toLowerCase()] ?? (p.role === "admin" ? "Admin" : "Finance");
}
