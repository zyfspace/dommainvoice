import "server-only";
import { cache } from "react";
import { localRepo } from "./local";
import { supabaseRepo } from "./supabase";

export const isSupabase = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);

export const repo = isSupabase ? supabaseRepo : localRepo;

/** getInvoice yang dibagi generateMetadata & page dalam satu request (1 query, bukan 2). Hanya untuk render. */
export const getInvoiceCached = cache((id: string) => repo.getInvoice(id));
