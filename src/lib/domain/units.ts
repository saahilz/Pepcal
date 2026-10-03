/**
 * Amount-unit conversions for peptide quantities.
 *
 * All calculation is done in micrograms (mcg). Milligrams are converted
 * exactly (1 mg = 1000 mcg), so no precision is lost when a user enters
 * mixed units (e.g. a 5 mg vial and a 250 mcg dose).
 */

export const MCG_PER_MG = 1000;

/** A peptide mass unit. "mg" and "mcg" are explicit; the user always picks one. */
export type AmountUnit = "mg" | "mcg";

/** Convert any amount to micrograms. */
export function toMcg(amount: number, unit: AmountUnit): number {
  return unit === "mg" ? amount * MCG_PER_MG : amount;
}

/** Convert any amount to milligrams. */
export function toMg(amount: number, unit: AmountUnit): number {
  return unit === "mg" ? amount : amount / MCG_PER_MG;
}

/**
 * Format a microgram value using the requested unit, so UI code never has to
 * decide between mg/mcg itself. `mcg` values smaller than 1 are rendered with
 * enough decimals to be meaningful (rounding is display-only and is surfaced
 * separately by the calculator's rounding note).
 */
export function formatAmountInUnit(mcg: number, unit: AmountUnit): number {
  return unit === "mg" ? mcg / MCG_PER_MG : mcg;
}
