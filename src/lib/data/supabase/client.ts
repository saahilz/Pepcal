/**
 * Supabase client bootstrap.
 *
 * No network call and no global side effect happens at import time. The client
 * is created lazily on first use and only when the env vars exist, so the demo
 * (no env vars) never pulls a session or talks to a server.
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

export function supabaseUrl(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
}

export function supabaseAnonKey(): string {
  return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
}

/** True when the app should use the real Supabase backend. */
export function hasSupabaseEnv(): boolean {
  return supabaseUrl() !== "" && supabaseAnonKey() !== "";
}

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!hasSupabaseEnv()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY."
    );
  }
  if (!cached) {
    cached = createClient(supabaseUrl(), supabaseAnonKey(), {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    });
  }
  return cached;
}
