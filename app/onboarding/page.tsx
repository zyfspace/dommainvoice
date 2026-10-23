import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/AuthShell";
import { getProfile, getSessionUser } from "@/lib/auth";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = { title: "Lengkapi Akun" };

export default async function OnboardingPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (await getProfile()) redirect("/");
  return (
    <AuthShell>
      <OnboardingForm email={user.email} />
    </AuthShell>
  );
}
