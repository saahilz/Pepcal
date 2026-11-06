/**
 * Protein & hydration companion maths: a day's logged grams / millilitres
 * measured against the user's own targets.
 *
 * Record-keeping only. The defaults below are the starting value of the
 * Settings fields the user edits — they are not a recommendation of how much
 * to eat or drink (that question belongs with a clinician).
 */

/** What the Settings fields fall back to when the user has not chosen values. */
export const DEFAULT_PROTEIN_TARGET_G = 100;
export const DEFAULT_WATER_TARGET_ML = 2500;

export interface IntakeTargets {
  proteinG: number;
  waterMl: number;
}

/** Settings win; null/invalid stored values fall back to the app defaults. */
export function resolveTargets(settings: {
  proteinTargetG: number | null;
  waterTargetMl: number | null;
}): IntakeTargets {
  return {
    proteinG: positiveOrNull(settings.proteinTargetG) ?? DEFAULT_PROTEIN_TARGET_G,
    waterMl: positiveOrNull(settings.waterTargetMl) ?? DEFAULT_WATER_TARGET_ML,
  };
}

function positiveOrNull(v: number | null | undefined): number | null {
  return typeof v === "number" && Number.isFinite(v) && v > 0 ? v : null;
}

/**
 * Progress toward a target, clamped to 0..1 so the bar never overflows;
 * unreadable inputs (NaN, negatives, missing target) read as empty.
 */
export function intakeFraction(value: number, target: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(target) || target <= 0) return 0;
  if (value <= 0) return 0;
  return Math.min(1, value / target);
}

/** "110 / 100 g" — a logged amount against a target, one line, no verdict. */
export function intakeLabel(value: number, target: number, unit: string): string {
  const v = Number.isFinite(value) ? value : 0;
  return `${Math.round(v)} / ${Math.round(target)} ${unit}`;
}
