/**
 * Estimated active amount over time from logged doses (first-order decay).
 *
 * For a dose D administered at t_i with a half-life t½:
 *   Active(t) = D × 0.5^((t − t_i) ÷ t½)
 * and the total at any instant is the sum over every dose at or before t.
 *
 * What this IS: arithmetic on records the user already entered, using a
 * half-life *they* pick or type in — nothing more than a line on a graph.
 * What it deliberately IS NOT: a clinical claim, a pharmacokinetic fit, or a
 * real serum measurement. No volume of distribution, absorption phase, or
 * individual metabolism is modelled, and no half-life (or level) is endorsed.
 */

import { toMcg } from "./units";

/** A logged dose reduced to what the decay maths needs. */
export interface SerumDose {
  id: string;
  /** Epoch ms of administration. */
  at: number;
  /** Amount administered, in mcg (the app's canonical mass unit). */
  mcg: number;
}

/**
 * Convenience presets, hours. Display-only shortcuts into the custom-hours
 * field — the app never endorses a half-life for a user's product.
 */
export const HALF_LIFE_PRESETS: { name: string; hours: number }[] = [
  { name: "Semaglutide", hours: 168 },
  { name: "Tirzepatide", hours: 120 },
  { name: "Retatrutide", hours: 144 },
  { name: "BPC-157", hours: 4 },
];

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 86_400_000;

export const SERUM_PAST_DAYS = 30;
export const SERUM_FUTURE_DAYS = 7;

/** Injections → ascending doses; records that can't be placed are dropped. */
export function toSerumDoses(
  injections: { id: string; administeredAt: string; amount: number; amountUnit: "mg" | "mcg" }[]
): SerumDose[] {
  return injections
    .map((i) => ({
      id: i.id,
      at: Date.parse(i.administeredAt),
      mcg: toMcg(i.amount, i.amountUnit),
    }))
    .filter((d) => Number.isFinite(d.at) && Number.isFinite(d.mcg) && d.mcg > 0)
    .sort((a, b) => a.at - b.at);
}

/** One dose's remaining active amount at `t` (0 before the dose; bad half-life → 0). */
export function activeMcgAt(dose: SerumDose, t: number, halfLifeHours: number): number {
  if (!(halfLifeHours > 0) || t < dose.at) return 0;
  return dose.mcg * Math.pow(0.5, (t - dose.at) / (halfLifeHours * MS_PER_HOUR));
}

/** Σ of every dose's contribution at `t`. */
export function totalActiveMcg(doses: SerumDose[], t: number, halfLifeHours: number): number {
  let sum = 0;
  for (const d of doses) sum += activeMcgAt(d, t, halfLifeHours);
  return sum;
}

export interface SerumSample {
  at: number;
  mcg: number;
}

/** Even samples of the decay curve across [now − 30d, now + 7d]. */
export function buildSerumSeries(
  doses: SerumDose[],
  now: number,
  halfLifeHours: number,
  steps = 150
): SerumSample[] {
  const from = now - SERUM_PAST_DAYS * MS_PER_DAY;
  const to = now + SERUM_FUTURE_DAYS * MS_PER_DAY;
  const out: SerumSample[] = [];
  for (let i = 0; i <= steps; i++) {
    const at = from + ((to - from) * i) / steps;
    out.push({ at, mcg: totalActiveMcg(doses, at, halfLifeHours) });
  }
  return out;
}
