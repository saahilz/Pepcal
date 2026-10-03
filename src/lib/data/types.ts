/**
 * Entity types for the MVP data model (spec §9).
 *
 * Every timestamp that records an instant is stored as an ISO-8601 string in
 * UTC (trailing "Z"). Calendar dates that are *not* instants (beyond-use date)
 * are stored as plain "yyyy-mm-dd". Schedule entries retain their IANA time
 * zone name separately so an instant can always be recomputed after a
 * time-zone or DST change (spec §5).
 *
 * These shapes intentionally mirror the Supabase schema (see
 * supabase/migrations) so the demo repository and the database repository can
 * share one interface.
 */

import type { AmountUnit } from "@/lib/domain/units";

/** An instant, serialized as UTC ISO-8601 (e.g. "2026-09-06T21:30:00.000Z"). */
export type IsoUtc = string;
/** A plain calendar date without a time zone, "yyyy-mm-dd". */
export type IsoDate = string;

export interface UserRef {
  id: string;
  name: string;
  /** True for the built-in local demo identity (no real auth involved). */
  isDemo: boolean;
}

/** A peptide vial / reconstitution record ("vials"). */
export interface Vial {
  id: string;
  userId: string;
  /** User-entered name. The app never supplies a peptide list. */
  name: string;
  notes: string | null;

  /** Declared peptide amount in the vial, in `vialUnit`. */
  vialAmount: number;
  vialUnit: AmountUnit;

  /** Diluent volume added (mL) — set only when a reconstitution is recorded. */
  diluentMl: number | null;

  /**
   * Snapshot of the concentration computed at reconstitution time. Stored on
   * the vial so injection logs can copy it (and survive later vial edits).
   */
  concentrationMcgPerMl: number | null;
  concentrationMgPerMl: number | null;

  /** When the user recorded reconstitution, as UTC ISO. */
  reconstitutedAt: IsoUtc | null;

  /**
   * User-entered beyond-use date. NEVER computed by the app (spec §4) — the
   * user enters it from verified product / pharmacy instructions.
   */
  beyondUseDate: IsoDate | null;

  createdAt: IsoUtc;
  updatedAt: IsoUtc;

  /** True when this is seeded fictional demo data. */
  demo: boolean;
}

/** A body-map / typed location a user attached to an injection (spec §6). */
export interface BodySite {
  /** Which silhouette the marker is on; null when entered as free text. */
  view: "front" | "back" | null;
  /** Normalized coordinates 0..1 within the silhouette; null for text entry. */
  x: number | null;
  y: number | null;
  /** Optional short label (also the full record for the text alternative). */
  label: string | null;
}

/** A completed injection ("injection_logs"). */
export interface InjectionLog {
  id: string;
  userId: string;

  /** Linked vial, if the user chose one. May be null / later deleted. */
  vialId: string | null;
  /**
   * Snapshots taken at administration time so the record stays truthful even
   * if the linked vial is later edited or deleted (spec §9).
   */
  vialNameSnapshot: string | null;
  concentrationMcgPerMl: number | null;
  concentrationMgPerMl: number | null;

  /** Amount administered, in `amountUnit`. */
  amount: number;
  amountUnit: AmountUnit;
  /** Volume actually drawn (mL), computed from the amount + concentration. */
  volumeMl: number | null;

  /** Actual administration time (UTC). Stored separately from any schedule. */
  administeredAt: IsoUtc;
  /** The scheduled time this log fulfils, when it came from a schedule. */
  scheduledTimeUtc: IsoUtc | null;
  /** Source schedule id when this fulfilled a scheduled occurrence. */
  scheduleId: string | null;

  location: BodySite | null;
  notes: string | null;

  createdAt: IsoUtc;
  demo: boolean;
}

/**
 * A recorded body weight ("weight_entries").
 *
 * Record-keeping only: this is what the user measured, nothing more. There is
 * deliberately no goal, target, or direction field — the app never judges a
 * reading or sets a target. Stored canonically in kilograms so the trend line
 * never has to mix scales; kg/lb is a display choice (see domain/weight.ts).
 */
export interface WeightEntry {
  id: string;
  userId: string;
  /** The recorded weight, in kilograms. */
  weightKg: number;
  /** When the reading was taken, as UTC ISO. */
  recordedAt: IsoUtc;
  notes: string | null;
  createdAt: IsoUtc;
  /** True when this is seeded fictional demo data. */
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* Scheduling (spec §5) — shapes reserved now, wired in phase 2.      */
/* ------------------------------------------------------------------ */

export type SchedulePattern =
  | { kind: "weekdays"; weekdays: number[]; /** 0=Sun..6=Sat */ timeLocal: string; /** "HH:mm" */ }
  | { kind: "everyXDays"; intervalDays: number; timeLocal: string };

/**
 * When a schedule's home zone differs from where the user currently is.
 * "home" keeps instants anchored to the schedule's named home time zone;
 * "current" re-anchors them to wherever the user is now.
 */
export type TravelPreference = "homeTimeZone" | "currentTimeZone";

export interface Schedule {
  id: string;
  userId: string;
  vialId: string | null;
  vialNameSnapshot: string | null;
  amount: number;
  amountUnit: AmountUnit;
  pattern: SchedulePattern;
  /** First (start) date to generate occurrences from, "yyyy-mm-dd". */
  startDate: IsoDate;
  /** Optional inclusive last date, "yyyy-mm-dd". */
  endDate: IsoDate | null;
  /** IANA name of the schedule's home time zone, e.g. "Europe/London". */
  timeZone: string;
  travel: TravelPreference;
  enabled: boolean;
  createdAt: IsoUtc;
  updatedAt: IsoUtc;
  demo: boolean;
}

export type OccurrenceStatus =
  | "scheduled"
  | "taken"
  | "skipped"
  | "snoozed"
  | "dismissed";

/** A single scheduled injection occurrence generated from a Schedule. */
export interface Occurrence {
  id: string;
  userId: string;
  scheduleId: string;
  /** The instant this occurrence was scheduled for (UTC). */
  scheduledForUtc: IsoUtc;
  status: OccurrenceStatus;
  /** When a "Mark taken" completed it, the resulting InjectionLog id. */
  completionLogId: string | null;
  snoozedUntilUtc: IsoUtc | null;
  createdAt: IsoUtc;
  demo: boolean;
}

/** Per-user notification preferences. */
export interface UserSettings {
  userId: string;
  /** IANA time zone used to interpret plain dates/times for this user. */
  timeZone: string | null;
  travel: TravelPreference;
  /** Opt-in web-push state; the actual subscription is stored elsewhere. */
  remindersEnabled: boolean;
  updatedAt: IsoUtc;
}

/* ------------------------------------------------------------------ */
/* Notification plumbing (spec §5).                                    */
/* ------------------------------------------------------------------ */

export interface PushSubscriptionRow {
  id: string;
  userId: string;
  /** The serialized browser PushSubscription (JSON). */
  subscriptionJson: string;
  createdAt: IsoUtc;
}

export interface NotificationDelivery {
  id: string;
  userId: string;
  occurrenceId: string | null;
  channel: "push" | "email" | "inapp";
  deliveredAt: IsoUtc;
  ok: boolean;
  error: string | null;
}
