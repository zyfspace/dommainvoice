import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getProfile, getSessionUser } from "@/lib/auth";
import { LoginForm } from "./LoginForm";

export const metadata: Metadata = { title: "Masuk" };

export default async function LoginPage() {
  if (await getProfile()) redirect("/");
  if (await getSessionUser()) redirect("/onboarding");
  return (
    <AuthShell>
      <LoginForm />
    </AuthShell>
  );
}
