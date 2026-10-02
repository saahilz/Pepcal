"use client";

/**
 * Single data context for the whole app. Loads the active repository (demo or
 * Supabase), exposes the signed-in user, and wraps every mutation so the UI
 * just calls `saveVial(...)` etc. and the context refreshes afterwards.
 *
 * Nothing here knows or cares whether the backend is localStorage or Postgres
 * — that choice lives in src/lib/data/index.ts.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { loadRepository } from "@/lib/data";
import type {
  InjectionInput,
  InjectionLog,
  RepoKind,
  Repository,
  Vial,
  VialInput,
  WeightEntry,
  WeightInput,
} from "@/lib/data/repository";
import type { UserRef, UserSettings } from "@/lib/data/types";

type Status = "loading" | "ready" | "error";

interface DataContextValue {
  status: Status;
  error: string | null;
  repoKind: RepoKind;
  user: UserRef | null;
  vials: Vial[];
  injections: InjectionLog[];
  /** Chronological, oldest first. */
  weights: WeightEntry[];
  settings: UserSettings;

  saveVial: (input: VialInput & { id?: string }) => Promise<Vial>;
  deleteVial: (id: string) => Promise<void>;
  saveInjection: (input: InjectionInput & { id?: string }) => Promise<InjectionLog>;
  deleteInjection: (id: string) => Promise<void>;
  saveWeight: (input: WeightInput & { id?: string }) => Promise<WeightEntry>;
  deleteWeight: (id: string) => Promise<void>;
  updateSettings: (patch: Parameters<Repository["updateSettings"]>[0]) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  resetDemoData: () => Promise<void>;
  deleteAllUserData: () => Promise<void>;
}

const emptySettings: UserSettings = {
  userId: "",
  timeZone: null,
  travel: "homeTimeZone",
  remindersEnabled: false,
  updatedAt: "",
};

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({ children }: { children: ReactNode }) {
  const repoRef = useRef<Repository | null>(null);
  const [status, setStatus] = useState<Status>("loading");
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<UserRef | null>(null);
  const [repoKind, setRepoKind] = useState<RepoKind>("demo");
  const [vials, setVials] = useState<Vial[]>([]);
  const [injections, setInjections] = useState<InjectionLog[]>([]);
  const [weights, setWeights] = useState<WeightEntry[]>([]);
  const [settings, setSettings] = useState<UserSettings>(emptySettings);
  const mountedRef = useRef(true);

  const refresh = useCallback(async () => {
    const repo = repoRef.current;
    if (!repo) return;
    const [nextUser, nextVials, nextInjections, nextWeights, nextSettings] = await Promise.all([
      repo.currentUser(),
      repo.listVials(),
      repo.listInjections(),
      repo.listWeights(),
      repo.getSettings(),
    ]);
    if (!mountedRef.current) return;
    setUser(nextUser);
    setVials(nextVials);
    setInjections(nextInjections);
    setWeights(nextWeights);
    setSettings(nextSettings);
  }, []);

  useEffect(() => {
    let cancelled = false;
    let unsubscribe: (() => void) | undefined;
    mountedRef.current = true;

    (async () => {
      try {
        const repo = await loadRepository();
        if (cancelled) return;
        repoRef.current = repo;
        setRepoKind(repo.kind);
        await refresh();
        if (cancelled) return;
        setStatus("ready");

        if (repo.kind === "supabase") {
          const [{ getSupabase }, { createSupabaseAuthHandler, subscribeToSupabaseAuth }] = await Promise.all([
            import("@/lib/data/supabase/client"),
            import("./app-provider-auth"),
          ]);
          if (cancelled) return;
          const handleAuthEvent = createSupabaseAuthHandler({
            isMounted: () => !cancelled && mountedRef.current,
            refresh,
            markReady: () => setStatus("ready"),
            clearRecords: () => {
              setUser(null);
              setVials([]);
              setInjections([]);
              setWeights([]);
              setSettings(emptySettings);
            },
            setError: (authError) => {
              setError(authError instanceof Error ? authError.message : String(authError));
              setStatus("error");
            },
          });
          unsubscribe = subscribeToSupabaseAuth(getSupabase(), handleAuthEvent);
        }
      } catch (err) {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : String(err));
        setStatus("error");
      }
    })();

    return () => {
      cancelled = true;
      mountedRef.current = false;
      unsubscribe?.();
    };
  }, [refresh]);

  /* Every mutation: run on the repo, then reload. Errors propagate to the
     caller so a form can show a message. */
  const saveVial = useCallback(
    async (input: VialInput & { id?: string }) => {
      const saved = await repoRef.current!.saveVial(input);
      await refresh();
      return saved;
    },
    [refresh]
  );

  const deleteVial = useCallback(
    async (id: string) => {
      await repoRef.current!.deleteVial(id);
      await refresh();
    },
    [refresh]
  );

  const saveInjection = useCallback(
    async (input: InjectionInput & { id?: string }) => {
      const saved = await repoRef.current!.saveInjection(input);
      await refresh();
      return saved;
    },
    [refresh]
  );

  const deleteInjection = useCallback(
    async (id: string) => {
      await repoRef.current!.deleteInjection(id);
      await refresh();
    },
    [refresh]
  );

  const saveWeight = useCallback(
    async (input: WeightInput & { id?: string }) => {
      const saved = await repoRef.current!.saveWeight(input);
      await refresh();
      return saved;
    },
    [refresh]
  );

  const deleteWeight = useCallback(
    async (id: string) => {
      await repoRef.current!.deleteWeight(id);
      await refresh();
    },
    [refresh]
  );

  const updateSettings = useCallback(
    async (patch: Parameters<Repository["updateSettings"]>[0]) => {
      await repoRef.current!.updateSettings(patch);
      await refresh();
    },
    [refresh]
  );

  const signInWithGoogle = useCallback(async () => {
    const repo = repoRef.current;
    if (!repo) throw new Error("The data store is still loading.");
    setError(null);
    await repo.signInWithGoogle();
  }, []);

  const signOut = useCallback(async () => {
    await repoRef.current!.signOut();
    setUser(null);
    setVials([]);
    setInjections([]);
    setWeights([]);
    setSettings(emptySettings);
  }, []);

  const resetDemoData = useCallback(async () => {
    await repoRef.current!.resetToDemoData();
    await refresh();
  }, [refresh]);

  const deleteAllUserData = useCallback(async () => {
    await repoRef.current!.deleteAllUserData();
    await refresh();
  }, [refresh]);

  return (
    <DataContext.Provider
      value={{
        status,
        error,
        repoKind,
        user,
        vials,
        injections,
        weights,
        settings,
        saveVial,
        deleteVial,
        saveInjection,
        deleteInjection,
        saveWeight,
        deleteWeight,
        updateSettings,
        signInWithGoogle,
        signOut,
        resetDemoData,
        deleteAllUserData,
      }}
    >
      {children}
    </DataContext.Provider>
  );
}

export function useData(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error("useData must be used inside <DataProvider>");
  return ctx;
}
