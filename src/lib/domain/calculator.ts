/**
 * Reconstitution concentration calculator.
 *
 * Everything in this module is pure and unit-testable. It encodes the exact
 * formulas from the product spec and deliberately does NOT make any clinical
 * recommendation: no dose, diluent, storage condition, or beyond-use date is
 * ever chosen for the user.
 *
 * Central assumption, stated to the user by the UI:
 *   final solution volume == entered diluent volume
 * (i.e. the peptide powder's own volume contribution and any handling losses
 * are ignored). This is why `fullDoses` is labelled "theoretical".
 */

import { MCG_PER_MG, toMcg, type AmountUnit } from "./units";

export interface ReconstitutionInput {
  /** Total peptide amount declared on the vial, in `vialUnit`. */
  vialAmount: number;
  vialUnit: AmountUnit;
  /** Diluent (solvent) volume added, in mL. */
  diluentMl: number;
  /** Desired amount per injection, in `desiredUnit`. */
  desiredAmount: number;
  desiredUnit: AmountUnit;
}

export type CalcField = "vialAmount" | "diluentMl" | "desiredAmount";

export type CalcIssueCode =
  | "missing" // field was left blank
  | "nonnumeric" // text did not parse as a finite number
  | "notPositive" // parsed to zero or a negative number
  | "desiredExceedsVial" // a single dose is larger than the whole vial
  | "vialUnitMismatchGuard"; // internal safety, not surfaced to users

export interface CalcIssue {
  field: CalcField;
  code: CalcIssueCode;
  message: string;
}

export interface ReconstitutionResult {
  totalMg: number;
  totalMcg: number;
  /** mcg of peptide per 1 mL of final solution. */
  concentrationMcgPerMl: number;
  /** mg of peptide per 1 mL of final solution. */
  concentrationMgPerMl: number;
  /** The dose the user entered, in mcg (internal canonical unit). */
  desiredMcg: number;
  /** mL of solution to draw for one dose (full precision, pre-rounding). */
  injectionVolumeMl: number;
  /** floor(totalMcg / desiredMcg): theoretical number of complete doses. */
  fullDoses: number;
  /** leftover peptide after `fullDoses` complete doses, in mcg. */
  remainderMcg: number;
}

/** `true` when a user-entered amount is a usable, strictly positive number. */
export function isPositiveFinite(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

/**
 * Parse a raw text field into a finite number.
 * Returns `null` when the field is blank or does not parse as a number, so a
 * single code path rejects "missing" and "nonnumeric" inputs together.
 */
export function parseDecimal(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === "") return null;
  // Accept a comma as the decimal separator (common outside the US).
  const normalized = trimmed.replace(",", ".");
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/**
 * Validate a fully-typed input. Each returned issue carries the field it
 * belongs to so the form can render an inline error, and the message is
 * written for humans. Empty array means the input is computable.
 */
export function validateReconstitution(input: ReconstitutionInput): CalcIssue[] {
  const issues: CalcIssue[] = [];

  if (!isPositiveFinite(input.vialAmount)) {
    issues.push({
      field: "vialAmount",
      code: "notPositive",
      message: "Vial amount must be a number greater than zero.",
    });
  }
  if (!isPositiveFinite(input.diluentMl)) {
    issues.push({
      field: "diluentMl",
      code: "notPositive",
      message: "Diluent volume must be greater than zero mL.",
    });
  }
  if (!isPositiveFinite(input.desiredAmount)) {
    issues.push({
      field: "desiredAmount",
      code: "notPositive",
      message: "Desired amount must be a number greater than zero.",
    });
    return issues; // nothing else is meaningful without a dose
  }

  if (isPositiveFinite(input.vialAmount) && isPositiveFinite(input.diluentMl)) {
    const totalMcg = toMcg(input.vialAmount, input.vialUnit);
    const desiredMcg = toMcg(input.desiredAmount, input.desiredUnit);
    if (desiredMcg > totalMcg) {
      issues.push({
        field: "desiredAmount",
        code: "desiredExceedsVial",
        message: "Desired amount exceeds the total peptide in the vial.",
      });
    }
  }

  return issues;
}

/**
 * Compute concentration and dose-volume from a validated input.
 *
 * Throws when the input is invalid so callers cannot compute garbage; UI code
 * should run {@link validateReconstitution} first and only call this when it
 * returns an empty array.
 *
 * The returned numbers are full-precision floats. Display rounding is handled
 * separately and never feeds back into these values.
 */
export function computeReconstitution(
  input: ReconstitutionInput
): ReconstitutionResult {
  const issues = validateReconstitution(input);
  if (issues.length > 0) {
    throw new Error(`computeReconstitution called with invalid input: ${issues.map((i) => i.message).join("; ")}`);
  }

  const totalMcg = toMcg(input.vialAmount, input.vialUnit);
  const desiredMcg = toMcg(input.desiredAmount, input.desiredUnit);

  // total_mcg = total_mg × 1000                       (see units.ts)
  // concentration_mcg_per_mL = total_mcg ÷ diluent_mL
  const concentrationMcgPerMl = totalMcg / input.diluentMl;
  const concentrationMgPerMl = concentrationMcgPerMl / MCG_PER_MG;

  // injection_volume_mL = desired_amount_mcg ÷ concentration_mcg_per_mL
  const injectionVolumeMl = desiredMcg / concentrationMcgPerMl;

  // full_doses = floor(total_mcg ÷ desired_amount_mcg)
  const fullDoses = Math.floor(totalMcg / desiredMcg);

  return {
    totalMg: totalMcg / MCG_PER_MG,
    totalMcg,
    concentrationMcgPerMl,
    concentrationMgPerMl,
    desiredMcg,
    injectionVolumeMl,
    fullDoses,
    remainderMcg: totalMcg - fullDoses * desiredMcg,
  };
}
