/**
 * Repository contract between the UI and a storage backend.
 *
 * Two implementations exist:
 *  - {@link localDemoRepository} (src/lib/data/local) — a localStorage-backed
 *    demo store seeded with clearly-labelled fictional data. No network, no
 *    account, runnable offline. This is the default.
 *  - {@link supabaseRepository} (src/lib/data/supabase) — a real Supabase
 *    Postgres backend with auth + row-level security. Active whenever
 *    `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are set.
 *
 * The UI only ever talks to the interface below, so switching backends (or
 * testing) never touches component code. All methods are async even where the
 * local store is synchronous under the hood, so the two backends stay
 * drop-in interchangeable.
 */

import type { AmountUnit } from "@/lib/domain/units";
import type {
  BodySite,
  InjectionLog,
  IsoDate,
  IsoUtc,
  Schedule,
  UserRef,
  UserSettings,
  Vial,
  WeightEntry,
} from "./types";

export type RepoKind = "demo" | "supabase";

export type {
  BodySite,
  InjectionLog,
  IsoDate,
  IsoUtc,
  Schedule,
  UserRef,
  UserSettings,
  Vial,
  WeightEntry,
} from "./types";

export interface VialInput {
  name: string;
  notes: string | null;
  vialAmount: number;
  vialUnit: AmountUnit;
  diluentMl: number | null;
  concentrationMcgPerMl: number | null;
  concentrationMgPerMl: number | null;
  reconstitutedAt: IsoUtc | null;
  beyondUseDate: IsoDate | null;
  /** Omit/`false` for user data; only the demo seeder sets this. */
  demo?: boolean;
}

export interface InjectionInput {
  vialId: string | null;
  vialNameSnapshot: string | null;
  concentrationMcgPerMl: number | null;
  concentrationMgPerMl: number | null;
  amount: number;
  amountUnit: AmountUnit;
  volumeMl: number | null;
  administeredAt: IsoUtc;
  scheduledTimeUtc: IsoUtc | null;
  scheduleId: string | null;
  location: BodySite | null;
  notes: string | null;
  demo?: boolean;
}

export interface WeightInput {
  /** Canonical kilograms; the form converts from the user's chosen unit. */
  weightKg: number;
  recordedAt: IsoUtc;
  notes: string | null;
  /** Omit/`false` for user data; only the demo seeder sets this. */
  demo?: boolean;
}

export interface Repository {
  readonly kind: RepoKind;

  /** The signed-in identity (demo identity in local mode), if any. */
  currentUser(): Promise<UserRef | null>;
  /** Sign out (no-op in demo mode). */
  signOut(): Promise<void>;
  /** Start Google OAuth; resolves after Supabase accepts the redirect request. */
  signInWithGoogle(): Promise<void>;
  /** Sign in with an existing email/password account. */
  signInWithEmail(email: string, password: string): Promise<void>;
  /** Register an email/password account and report whether confirmation is needed. */
  signUpWithEmail(email: string, password: string): Promise<"signed-in" | "confirmation-required">;

  /* ---- Vials ---- */
  listVials(): Promise<Vial[]>;
  getVial(id: string): Promise<Vial | null>;
  /** Insert when no `id` is given, otherwise update that row. */
  saveVial(input: VialInput & { id?: string }): Promise<Vial>;
  deleteVial(id: string): Promise<void>;

  /* ---- Injection logs ---- */
  /** Most-recent-first; pass `limit` to bound results. */
  listInjections(opts?: { limit?: number; vialId?: string }): Promise<InjectionLog[]>;
  saveInjection(input: InjectionInput & { id?: string }): Promise<InjectionLog>;
  deleteInjection(id: string): Promise<void>;

  /* ---- Weight entries ---- */
  /** Chronological, oldest first — the order a time series wants. */
  listWeights(): Promise<WeightEntry[]>;
  saveWeight(input: WeightInput & { id?: string }): Promise<WeightEntry>;
  deleteWeight(id: string): Promise<void>;

  /* ---- Settings ---- */
  getSettings(): Promise<UserSettings>;
  updateSettings(patch: Partial<Pick<UserSettings, "timeZone" | "travel" | "remindersEnabled">>): Promise<UserSettings>;

  /* ---- Demo data lifecycle ---- */
  /** Delete everything and reseed fictional demo data (demo repo only). */
  resetToDemoData(): Promise<void>;
  /** Delete all rows for the current user (demo repo only; real deletion in settings). */
  deleteAllUserData(): Promise<void>;

  /* ---- Scheduling — reserved for phase 2 ---- */
  listSchedules(): Promise<Schedule[]>;
}
