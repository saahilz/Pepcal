/**
 * Backend selection.
 *
 * Supabase env vars present  → real Supabase repository (auth + Postgres + RLS)
 * otherwise                 → localStorage demo repository (fictional data)
 *
 * The supabase module is dynamically imported so the demo bundle never loads
 * the Supabase client when it is not configured.
 */

import type { Repository } from "./repository";

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  return url !== "" && key !== "";
}

export async function loadRepository(): Promise<Repository> {
  if (isSupabaseConfigured()) {
    const mod = await import("./supabase/supabaseRepository");
    return mod.supabaseRepository;
  }
  const mod = await import("./local/localRepository");
  return mod.localDemoRepository;
}
