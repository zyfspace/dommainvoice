import "server-only";
import { localRepo } from "./local";
import { supabaseRepo } from "./supabase";

export const isSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const repo = isSupabase ? supabaseRepo : localRepo;
