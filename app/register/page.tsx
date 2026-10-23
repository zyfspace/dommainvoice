import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getProfile, getSessionUser } from "@/lib/auth";
import { RegisterForm } from "./RegisterForm";

export const metadata: Metadata = { title: "Daftar" };

export default async function RegisterPage() {
  if (await getProfile()) redirect("/");
  if (await getSessionUser()) redirect("/onboarding");
  return (
    <AuthShell>
      <RegisterForm />
    </AuthShell>
  );
}
