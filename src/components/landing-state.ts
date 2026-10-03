import type { RepoKind } from "@/lib/data/repository";
import type { UserRef } from "@/lib/data/types";

type AppStatus = "loading" | "ready" | "error";

export function shouldRedirectAuthenticatedLanding(
  repoKind: RepoKind,
  user: UserRef | null,
  status: AppStatus
): boolean {
  return repoKind === "supabase" && user !== null && status === "ready";
}
