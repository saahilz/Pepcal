import type { AuthChangeEvent } from "@supabase/supabase-js";

export type SupabaseAuthEvent = Extract<
  AuthChangeEvent,
  "INITIAL_SESSION" | "SIGNED_IN" | "SIGNED_OUT" | "TOKEN_REFRESHED" | "USER_UPDATED"
>;

type AuthLifecycle = {
  isMounted: () => boolean;
  refresh: () => Promise<void>;
  markReady: () => void;
  clearRecords: () => void;
  setError: (error: unknown) => void;
};

export function createSupabaseAuthHandler({
  isMounted,
  refresh,
  markReady,
  clearRecords,
  setError,
}: AuthLifecycle): (event: SupabaseAuthEvent) => Promise<void> {
  return async (event) => {
    if (!isMounted()) return;
    if (event === "SIGNED_OUT") {
      clearRecords();
      if (isMounted()) markReady();
      return;
    }
    if (!["INITIAL_SESSION", "SIGNED_IN", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event)) return;

    try {
      await refresh();
      if (isMounted()) markReady();
    } catch (error) {
      if (isMounted()) setError(error);
    }
  };
}

type AuthClient = {
  auth: {
    onAuthStateChange: (
      callback: (event: AuthChangeEvent) => void
    ) => { data?: { subscription?: { unsubscribe: () => void } } };
  };
};

function isHandledAuthEvent(event: AuthChangeEvent): event is SupabaseAuthEvent {
  return ["INITIAL_SESSION", "SIGNED_IN", "SIGNED_OUT", "TOKEN_REFRESHED", "USER_UPDATED"].includes(event);
}

export function subscribeToSupabaseAuth(
  client: AuthClient,
  handler: (event: SupabaseAuthEvent) => Promise<void>
): () => void {
  const result = client.auth.onAuthStateChange((event) => {
    if (isHandledAuthEvent(event)) void handler(event);
  });
  return () => result.data?.subscription?.unsubscribe();
}
