import "server-only";
import { redirect } from "next/navigation";
import { cache } from "react";
import { repo } from "./repo";

export const getProfile = cache(() => repo.currentProfile());

export async function requireProfile() {
  const p = await getProfile();
  if (!p) redirect("/login");
  return p;
}
