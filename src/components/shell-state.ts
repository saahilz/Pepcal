import type { RepoKind } from "@/lib/data/repository";
import type { UserRef } from "@/lib/data/types";

type AppStatus = "loading" | "ready" | "error";

export function isPublicRoute(pathname: string): boolean {
  return pathname === "/" || pathname === "/login" || pathname === "/register";
}

export function shouldShowSupabaseSignInGate(
  repoKind: RepoKind,
  user: UserRef | null,
  status: AppStatus
): boolean {
  return repoKind === "supabase" && !user && status !== "error";
}
