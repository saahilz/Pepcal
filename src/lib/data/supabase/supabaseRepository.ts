/**
 * Supabase (Postgres + RLS) repository.
 *
 * Only active when NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
 * are set (see src/lib/data/index.ts). Maps rows to the domain entities under
 * src/lib/data/types.ts using the snake_case schema defined in
 * supabase/migrations/*.sql — the two files must stay in lockstep.
 *
 * Not exercised in this session (no live Supabase project); each method is a
 * thin, typed mapping over supabase-js and row-level security means Postgres
 * itself enforces that a user only ever reads/writes their own rows.
 */

import { getSupabase } from "./client";
import type {
  InjectionInput,
  InjectionLog,
  Repository,
  UserRef,
  UserSettings,
  Vial,
  VialInput,
  WeightEntry,
  WeightInput,
} from "../repository";
import type { BodySite, Schedule, TravelPreference } from "../types";

/* ----------------------------- row types ----------------------------- */

interface DbVial {
  id: string;
  user_id: string;
  name: string;
  notes: string | null;
  vial_amount: number | null;
  vial_unit: "mg" | "mcg";
  diluent_ml: number | null;
  concentration_mcg_per_ml: number | null;
  concentration_mg_per_ml: number | null;
  reconstituted_at: string | null;
  beyond_use_date: string | null;
  created_at: string;
  updated_at: string;
  demo: boolean;
}

interface DbInjectionLog {
  id: string;
  user_id: string;
  vial_id: string | null;
  vial_name_snapshot: string | null;
  concentration_mcg_per_ml: number | null;
  concentration_mg_per_ml: number | null;
  amount: number | null;
  amount_unit: "mg" | "mcg";
  volume_ml: number | null;
  administered_at: string;
  scheduled_time_utc: string | null;
  schedule_id: string | null;
  location: BodySite | null;
  notes: string | null;
  created_at: string;
  demo: boolean;
}

interface DbSchedule {
  id: string;
  user_id: string;
  vial_id: string | null;
  vial_name_snapshot: string | null;
  amount: number | null;
  amount_unit: "mg" | "mcg";
  pattern: Schedule["pattern"];
  start_date: string;
  end_date: string | null;
  time_zone: string;
  travel: TravelPreference;
  enabled: boolean;
  created_at: string;
  updated_at: string;
  demo: boolean;
}

interface DbWeightEntry {
  id: string;
  user_id: string;
  weight_kg: number | null;
  recorded_at: string;
  notes: string | null;
  created_at: string;
  demo: boolean;
}

interface DbSettings {
  user_id: string;
  time_zone: string | null;
  travel: TravelPreference;
  reminders_enabled: boolean;
  updated_at: string;
}

/* ----------------------------- helpers ------------------------------- */

const num = (v: number | null | undefined): number | null => (v == null ? null : Number(v));
const nullable = <T,>(v: T | null): T | null => (v == null ? null : v);

async function requireUser(): Promise<string | null> {
  const {
    data: { user },
  } = await getSupabase().auth.getUser();
  return user?.id ?? null;
}

function toVial(r: DbVial): Vial {
  return {
    id: r.id,
    userId: r.user_id,
    name: r.name,
    notes: r.notes,
    vialAmount: num(r.vial_amount) ?? 0,
    vialUnit: r.vial_unit,
    diluentMl: num(r.diluent_ml),
    concentrationMcgPerMl: num(r.concentration_mcg_per_ml),
    concentrationMgPerMl: num(r.concentration_mg_per_ml),
    reconstitutedAt: r.reconstituted_at,
    beyondUseDate: r.beyond_use_date,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    demo: r.demo,
  };
}

function toInjection(r: DbInjectionLog): InjectionLog {
  return {
    id: r.id,
    userId: r.user_id,
    vialId: r.vial_id,
    vialNameSnapshot: r.vial_name_snapshot,
    concentrationMcgPerMl: num(r.concentration_mcg_per_ml),
    concentrationMgPerMl: num(r.concentration_mg_per_ml),
    amount: num(r.amount) ?? 0,
    amountUnit: r.amount_unit,
    volumeMl: num(r.volume_ml),
    administeredAt: r.administered_at,
    scheduledTimeUtc: r.scheduled_time_utc,
    scheduleId: r.schedule_id,
    location: r.location,
    notes: r.notes,
    createdAt: r.created_at,
    demo: r.demo,
  };
}

function toSchedule(r: DbSchedule): Schedule {
  return {
    id: r.id,
    userId: r.user_id,
    vialId: r.vial_id,
    vialNameSnapshot: r.vial_name_snapshot,
    amount: num(r.amount) ?? 0,
    amountUnit: r.amount_unit,
    pattern: r.pattern,
    startDate: r.start_date,
    endDate: r.end_date,
    timeZone: r.time_zone,
    travel: r.travel,
    enabled: r.enabled,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    demo: r.demo,
  };
}

function toWeight(r: DbWeightEntry): WeightEntry {
  return {
    id: r.id,
    userId: r.user_id,
    weightKg: num(r.weight_kg) ?? 0,
    recordedAt: r.recorded_at,
    notes: r.notes,
    createdAt: r.created_at,
    demo: r.demo,
  };
}

function errorOrThrow(error: unknown): never {
  throw error instanceof Error ? error : new Error(String(error));
}

/* ----------------------------- repository ---------------------------- */

export const supabaseRepository: Repository = {
  kind: "supabase",

  async currentUser(): Promise<UserRef | null> {
    const {
      data: { user },
    } = await getSupabase().auth.getUser();
    if (!user) return null;
    return {
      id: user.id,
      name: user.email ?? user.user_metadata?.name ?? "Account",
      isDemo: false,
    };
  },

  async signOut(): Promise<void> {
    await getSupabase().auth.signOut();
  },

  async signInWithGoogle(): Promise<void> {
    const { error } = await getSupabase().auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    if (error) errorOrThrow(error);
  },

  /* ---- vials ---- */

  async listVials(): Promise<Vial[]> {
    const userId = await requireUser();
    if (!userId) return [];
    const { data, error } = await getSupabase()
      .from("vials")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) errorOrThrow(error);
    return (data as DbVial[]).map(toVial);
  },

  async getVial(id: string): Promise<Vial | null> {
    const { data, error } = await getSupabase().from("vials").select("*").eq("id", id).maybeSingle();
    if (error) errorOrThrow(error);
    return data ? toVial(data as DbVial) : null;
  },

  async saveVial(input: VialInput & { id?: string }): Promise<Vial> {
    const userId = await requireUser();
    if (!userId) throw new Error("Authentication required.");
    const supabase = getSupabase();
    const base = {
      name: input.name,
      notes: nullable(input.notes),
      vial_amount: input.vialAmount,
      vial_unit: input.vialUnit,
      diluent_ml: nullable(input.diluentMl),
      concentration_mcg_per_ml: nullable(input.concentrationMcgPerMl),
      concentration_mg_per_ml: nullable(input.concentrationMgPerMl),
      reconstituted_at: nullable(input.reconstitutedAt),
      beyond_use_date: nullable(input.beyondUseDate),
      demo: input.demo ?? false,
    };
    if (input.id) {
      const { data, error } = await supabase
        .from("vials")
        .update({ ...base, updated_at: new Date().toISOString() })
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) errorOrThrow(error);
      return toVial(data as DbVial);
    }
    const { data, error } = await supabase
      .from("vials")
      .insert({ ...base, user_id: userId })
      .select("*")
      .single();
    if (error) errorOrThrow(error);
    return toVial(data as DbVial);
  },

  async deleteVial(id: string): Promise<void> {
    const { error } = await getSupabase().from("vials").delete().eq("id", id);
    if (error) errorOrThrow(error);
  },

  /* ---- injection logs ---- */

  async listInjections(opts: { limit?: number; vialId?: string } = {}): Promise<InjectionLog[]> {
    const userId = await requireUser();
    if (!userId) return [];
    let q = getSupabase()
      .from("injection_logs")
      .select("*")
      .eq("user_id", userId)
      .order("administered_at", { ascending: false });
    if (opts.vialId) q = q.eq("vial_id", opts.vialId);
    if (opts.limit) q = q.limit(opts.limit);
    const { data, error } = await q;
    if (error) errorOrThrow(error);
    return (data as DbInjectionLog[]).map(toInjection);
  },

  async saveInjection(input: InjectionInput & { id?: string }): Promise<InjectionLog> {
    const userId = await requireUser();
    if (!userId) throw new Error("Authentication required.");
    const supabase = getSupabase();
    const base = {
      vial_id: nullable(input.vialId),
      vial_name_snapshot: nullable(input.vialNameSnapshot),
      concentration_mcg_per_ml: nullable(input.concentrationMcgPerMl),
      concentration_mg_per_ml: nullable(input.concentrationMgPerMl),
      amount: input.amount,
      amount_unit: input.amountUnit,
      volume_ml: nullable(input.volumeMl),
      administered_at: input.administeredAt,
      scheduled_time_utc: nullable(input.scheduledTimeUtc),
      schedule_id: nullable(input.scheduleId),
      location: input.location,
      notes: nullable(input.notes),
      demo: input.demo ?? false,
    };
    if (input.id) {
      const { data, error } = await supabase
        .from("injection_logs")
        .update(base)
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) errorOrThrow(error);
      return toInjection(data as DbInjectionLog);
    }
    const { data, error } = await supabase
      .from("injection_logs")
      .insert({ ...base, user_id: userId })
      .select("*")
      .single();
    if (error) errorOrThrow(error);
    return toInjection(data as DbInjectionLog);
  },

  async deleteInjection(id: string): Promise<void> {
    const { error } = await getSupabase().from("injection_logs").delete().eq("id", id);
    if (error) errorOrThrow(error);
  },

  /* ---- weight entries ---- */

  async listWeights(): Promise<WeightEntry[]> {
    const userId = await requireUser();
    if (!userId) return [];
    const { data, error } = await getSupabase()
      .from("weight_entries")
      .select("*")
      .eq("user_id", userId)
      .order("recorded_at", { ascending: true });
    if (error) errorOrThrow(error);
    return (data as DbWeightEntry[]).map(toWeight);
  },

  async saveWeight(input: WeightInput & { id?: string }): Promise<WeightEntry> {
    const userId = await requireUser();
    if (!userId) throw new Error("Authentication required.");
    const supabase = getSupabase();
    const base = {
      weight_kg: input.weightKg,
      recorded_at: input.recordedAt,
      notes: nullable(input.notes),
      demo: input.demo ?? false,
    };
    if (input.id) {
      const { data, error } = await supabase
        .from("weight_entries")
        .update(base)
        .eq("id", input.id)
        .select("*")
        .single();
      if (error) errorOrThrow(error);
      return toWeight(data as DbWeightEntry);
    }
    const { data, error } = await supabase
      .from("weight_entries")
      .insert({ ...base, user_id: userId })
      .select("*")
      .single();
    if (error) errorOrThrow(error);
    return toWeight(data as DbWeightEntry);
  },

  async deleteWeight(id: string): Promise<void> {
    const { error } = await getSupabase().from("weight_entries").delete().eq("id", id);
    if (error) errorOrThrow(error);
  },

  /* ---- settings ---- */

  async getSettings(): Promise<UserSettings> {
    const userId = await requireUser();
    const now = new Date().toISOString();
    if (!userId) {
      return { userId: "", timeZone: null, travel: "homeTimeZone", remindersEnabled: false, updatedAt: now };
    }
    const { data, error } = await getSupabase()
      .from("user_settings")
      .select("*")
      .eq("user_id", userId)
      .maybeSingle();
    if (error) errorOrThrow(error);
    const row = data as DbSettings | null;
    if (!row) {
      return {
        userId,
        timeZone: null,
        travel: "homeTimeZone",
        remindersEnabled: false,
        updatedAt: now,
      };
    }
    return {
      userId: row.user_id,
      timeZone: row.time_zone,
      travel: row.travel,
      remindersEnabled: row.reminders_enabled,
      updatedAt: row.updated_at,
    };
  },

  async updateSettings(
    patch: Partial<Pick<UserSettings, "timeZone" | "travel" | "remindersEnabled">>
  ): Promise<UserSettings> {
    const userId = await requireUser();
    if (!userId) throw new Error("Authentication required.");
    const existing = await this.getSettings();
    const merged = {
      time_zone: patch.timeZone !== undefined ? patch.timeZone : existing.timeZone,
      travel: patch.travel ?? existing.travel,
      reminders_enabled: patch.remindersEnabled ?? existing.remindersEnabled,
      updated_at: new Date().toISOString(),
    };
    const { data, error } = await getSupabase()
      .from("user_settings")
      .upsert({ user_id: userId, ...merged }, { onConflict: "user_id" })
      .select("*")
      .single();
    if (error) errorOrThrow(error);
    const row = data as DbSettings;
    return {
      userId: row.user_id,
      timeZone: row.time_zone,
      travel: row.travel,
      remindersEnabled: row.reminders_enabled,
      updatedAt: row.updated_at,
    };
  },

  /* ---- schedules (read; phase 2 wires writes + occurrences) ---- */

  async listSchedules(): Promise<Schedule[]> {
    const userId = await requireUser();
    if (!userId) return [];
    const { data, error } = await getSupabase()
      .from("schedules")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });
    if (error) errorOrThrow(error);
    return (data as DbSchedule[]).map(toSchedule);
  },

  /* ---- demo-data lifecycle ---- */

  async resetToDemoData(): Promise<void> {
    throw new Error(
      "Demo data only exists in demo mode; this account is connected to Supabase."
    );
  },

  async deleteAllUserData(): Promise<void> {
    const userId = await requireUser();
    if (!userId) throw new Error("Authentication required.");
    const supabase = getSupabase();
    for (const table of [
      "notification_deliveries",
      "push_subscriptions",
      "occurrences",
      "schedules",
      "injection_logs",
      "weight_entries",
      "body_sites",
      "vials",
      "user_settings",
    ]) {
      const { error } = await supabase.from(table).delete().eq("user_id", userId);
      if (error) errorOrThrow(error);
    }
  },
};
