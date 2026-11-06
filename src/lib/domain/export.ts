/**
 * Clinical export: a doctor/telehealth-ready CSV of the injection record.
 *
 * Pure and browser-safe; the UI builds the input, this returns a string. Two
 * timestamps per row on purpose (spec): UTC for the record itself, wall-clock
 * local for reading "the day it happened" back in clinic — the zone name is
 * carried in a trailing comment. Body weight matches by local calendar day.
 *
 * Record-keeping only — the file carries what was logged, nothing inferred.
 */

import type { InjectionLog, Vial, WeightEntry } from "../data/types";
import { toMcg } from "./units";
import { trimNumber } from "../format";

export interface ExportInput {
  injections: InjectionLog[];
  vials: Vial[];
  weights: WeightEntry[];
}

/** RFC 4180: quote when needed, double inner quotes. */
export function csvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function csvRow(fields: (string | number | null | undefined)[]): string {
  return fields.map((f) => csvField(f == null ? "" : String(f))).join(",");
}

/** Wall-clock stamp in a named zone, "yyyy-mm-ddTHH:mm:ss". */
export function localStamp(iso: string, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const pick = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  return `${pick("year")}-${pick("month")}-${pick("day")}T${pick("hour")}:${pick("minute")}:${pick("second")}`;
}

/** Local calendar day ("yyyy-mm-dd") of an instant, in the viewer's zone. */
function localDay(iso: string): string {
  const d = new Date(iso);
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

export function buildMedicalLogCsv({ injections, vials, weights }: ExportInput): string {
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone ?? "UTC";
  const vialsById = new Map(vials.map((v) => [v.id, v]));

  // Last reading per local day — the weight "that date" means.
  const weightByDay = new Map<string, number>();
  for (const w of [...weights].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt))) {
    weightByDay.set(localDay(w.recordedAt), w.weightKg);
  }

  /* Chronological: a clinician reads a timeline top-down, and it matches the
     print table. */
  const rows = [...injections]
    .sort((a, b) => a.administeredAt.localeCompare(b.administeredAt))
    .map((i) => {
      const vial = i.vialId ? vialsById.get(i.vialId) : undefined;
      const mcg = toMcg(i.amount, i.amountUnit);
      // Draw volume: the logged figure wins; else recompute from the stored
      // concentration; else blank (an amount with no concentration has no mL).
      const volumeMl =
        i.volumeMl ??
        (i.concentrationMcgPerMl != null && i.concentrationMcgPerMl > 0
          ? mcg / i.concentrationMcgPerMl
          : null);
      const weightKg = weightByDay.get(localDay(i.administeredAt));
      return [
        i.administeredAt,
        localStamp(i.administeredAt, tz),
        `${trimNumber(i.amount)} ${i.amountUnit}`,
        i.vialNameSnapshot ?? vial?.name ?? "",
        vial?.notes ?? "",
        volumeMl !== null && volumeMl !== undefined ? trimNumber(volumeMl, 4) : "",
        volumeMl !== null && volumeMl !== undefined ? trimNumber(volumeMl * 100, 2) : "",
        i.location?.label ?? "",
        weightKg !== undefined ? trimNumber(weightKg, 2) : "",
        i.notes ?? "",
      ];
    });

  const header = csvRow([
    "Date & time (UTC)",
    `Date & time (local, ${tz})`,
    "Dose administered (mg/mcg as logged)",
    "Compound / vial (name at time of dosing)",
    "Batch / product notes (from vial record)",
    "Draw volume (mL)",
    "Draw volume (U-100 units)",
    "Injection site",
    "Body weight that local day (kg)",
    "Notes / side effects",
  ]);
  return (
    [header, ...rows.map(csvRow)].join("\r\n") +
    "\r\n# Weight column: last reading recorded on the same local calendar day.\r\n"
  );
}

/* --------------------------- summaries ----------------------------- */

export interface ExportSummary {
  count: number;
  from: string | null;
  to: string | null;
  avgDaysBetween: number | null;
  /** kg difference between the last reading at/before the first dose and the
   * last reading at/before the final dose — the trend across the logged span. */
  netWeightKg: number | null;
}

export function summarizeExports(
  injections: InjectionLog[],
  weights: WeightEntry[]
): ExportSummary {
  const sorted = [...injections].sort((a, b) => a.administeredAt.localeCompare(b.administeredAt));
  const count = sorted.length;
  if (count === 0) return { count: 0, from: null, to: null, avgDaysBetween: null, netWeightKg: null };
  const from = sorted[0].administeredAt;
  const to = sorted[count - 1].administeredAt;
  const avgDaysBetween =
    count > 1 ? (Date.parse(to) - Date.parse(from)) / 86_400_000 / (count - 1) : null;

  const atOrBefore = (iso: string) =>
    [...weights]
      .toSorted((a, b) => a.recordedAt.localeCompare(b.recordedAt))
      .toReversed()
      .find((w) => w.recordedAt <= iso) ?? null;
  const firstW = atOrBefore(from);
  const lastW = atOrBefore(to);

  return {
    count,
    from,
    to,
    avgDaysBetween,
    netWeightKg: firstW && lastW ? lastW.weightKg - firstW.weightKg : null,
  };
}
