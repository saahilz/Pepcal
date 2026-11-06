/**
 * Vial depletion & reconstitution freshness arithmetic (pure).
 *
 * Volume used is the sum of `volumeMl` on injection logs linked to the vial.
 * The vial row is never mutated — depletion is derived, so deleting or fixing
 * a log corrects the estimate and nothing can double-count. `perDoseMl` comes
 * from the most recent logged draw (the best signal of the user's actual
 * dose); without one there is no dose size to divide by and the app says so
 * rather than inventing one.
 *
 * The freshness window is the standard 28-day bacteriostatic-water window —
 * a calendar count against a constant stated to the user, NOT a beyond-use
 * date. The user-entered `beyondUseDate` stays the product-specific answer;
 * nothing here endorses storage.
 */

export const BACTERIOSTATIC_WINDOW_DAYS = 28;
const MS_PER_DAY = 86_400_000;

interface StockVial {
  diluentMl: number | null;
  reconstitutedAt: string | null;
}

interface StockLog {
  volumeMl: number | null;
  administeredAt: string;
}

export interface VialStock {
  remainingMl: number;
  /** Most recent logged draw (mL), null when no linked injection has one. */
  perDoseMl: number | null;
  /** ⌊remaining ÷ perDose⌋, null when there is no known dose size. */
  dosesRemaining: number | null;
}

/** Derived stock for a reconstituted vial; null while `diluentMl` is unset. */
export function vialStock(vial: StockVial, logs: StockLog[]): VialStock | null {
  if (vial.diluentMl === null) return null;
  const used = logs.reduce((sum, l) => sum + (l.volumeMl ?? 0), 0);
  const remainingMl = Math.max(0, vial.diluentMl - used);
  const withVolume = [...logs]
    .filter((l) => l.volumeMl !== null && l.volumeMl > 0)
    .sort((a, b) => b.administeredAt.localeCompare(a.administeredAt));
  const perDoseMl = withVolume[0]?.volumeMl ?? null;
  return {
    remainingMl,
    perDoseMl,
    dosesRemaining: perDoseMl === null ? null : Math.floor(remainingMl / perDoseMl),
  };
}

export interface Freshness {
  elapsedDays: number;
  /** 0..1 against the 28-day window (clamped). */
  fraction: number;
  expired: boolean;
}

/** Days since reconstitution vs the 28-day window; null until reconstituted. */
export function vialFreshness(
  vial: { reconstitutedAt: string | null },
  now: Date = new Date()
): Freshness | null {
  if (!vial.reconstitutedAt) return null;
  const ms = Date.parse(vial.reconstitutedAt);
  if (!Number.isFinite(ms)) return null;
  const elapsedDays = Math.max(0, Math.floor((now.getTime() - ms) / MS_PER_DAY));
  const fraction = Math.min(1, elapsedDays / BACTERIOSTATIC_WINDOW_DAYS);
  return { elapsedDays, fraction, expired: elapsedDays >= BACTERIOSTATIC_WINDOW_DAYS };
}
