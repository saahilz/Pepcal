/**
 * Dose titration markers for the weight chart.
 *
 * Pure: turns logged doses + the weight series into the one number the
 * tooltip needs — the change in the line's weight since the dose *before*
 * this one (interpolated, so an uneven weighing cadence cannot skew it).
 * First dose has no previous; doses before or between readings still get a
 * value as far as the line exists, and null where it does not.
 */

import { weightAtTime, type WeightPoint } from "./weight";

export interface DoseMarker {
  /** Signed kg change since the previous dose's line value. Null when the
   * line does not cover either instant; `isFirst` tells the two apart. */
  deltaKg: number | null;
  /** True for the earliest dose shown — there is nothing to compare against. */
  isFirst: boolean;
}

/** The payload's own fields are carried through, so callers can attach labels. */
export function doseMarkers<T extends { at: number }>(
  doses: T[],
  points: WeightPoint[]
): (T & DoseMarker)[] {
  const sorted = [...doses].sort((a, b) => a.at - b.at);
  return sorted.map((dose, i) => {
    if (i === 0) return { ...dose, deltaKg: null, isFirst: true };
    const now = weightAtTime(points, dose.at);
    const prev = weightAtTime(points, sorted[i - 1].at);
    return { ...dose, deltaKg: now === null || prev === null ? null : now - prev, isFirst: false };
  });
}
