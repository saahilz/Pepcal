/**
 * U-100 insulin syringe scale.
 *
 * A U-100 syringe is labelled for insulin where "100 units" fills the syringe
 * to its total capacity. Because the scale is a VOLUME scale, the markings can
 * be reused for any solution: on a U-100 syringe, 1 unit ≡ 0.01 mL.
 *
 * The unit numbers printed on the barrel are NOT units of peptide potency and
 * are NOT international units (IU) of the reconstituted drug — they are simply
 * a volume scale. The UI restates this wherever the scale is shown.
 */

export interface U100Syringe {
  kind: "u100";
  /** Total barrel capacity in mL: typically 0.3, 0.5 or 1.0. */
  capacityMl: number;
  /**
   * Size of one printed graduation in insulin "units" (0.01 mL per unit).
   * Common values: 1 (whole units), 0.5 (half-unit syringes), 2 (widely
   * spaced 2-unit marks). Chosen by the user to match the syringe they hold.
   */
  tickUnits: number;
  /** Optional display name, e.g. "U-100 0.5 mL". */
  label?: string;
}

export const U100_UNITS_PER_ML = 100;

/** Volume (mL) → number printed on a U-100 barrel. */
export function u100UnitsForVolume(volumeMl: number): number {
  return volumeMl * U100_UNITS_PER_ML;
}

/** Printed U-100 units → volume in mL. */
export function volumeForU100Units(units: number): number {
  return units / U100_UNITS_PER_ML;
}

/** Smallest volume the syringe can distinguish, in mL. */
export function smallestGraduationMl(syringe: U100Syringe): number {
  return volumeForU100Units(syringe.tickUnits);
}

export type SyringeIssueCode =
  | "exceedsCapacity" // dose volume is larger than the barrel can hold
  | "betweenGraduations" // lands between two printed ticks
  | "belowSmallestGraduation"; // smaller than one full tick

export interface SyringeIssue {
  code: SyringeIssueCode;
  message: string;
}

export interface SyringeMeasurement {
  syringe: U100Syringe;
  /** Exact dose volume in mL (full precision). */
  volumeMl: number;
  /** Exact equivalent on the U-100 scale (units). */
  units: number;
  /** Total capacity expressed in U-100 units. */
  capacityUnits: number;
  /** True when the dose volume is ≤ barrel capacity. */
  fits: boolean;
  /** True when the dose lands exactly on a printed graduation. */
  onGraduation: boolean;
  /** Volume snapped to the nearest drawable graduation, in mL. */
  nearestVolumeMl: number;
  /** The snapped volume expressed in U-100 units. */
  nearestUnits: number;
  issues: SyringeIssue[];
}

const GRADUATION_TOLERANCE_ML = 1e-6;

/**
 * Check whether a dose volume can be drawn on a specific U-100 syringe.
 * Always returns a full measurement; capacity/graduation problems are reported
 * as {@link SyringeIssue} entries rather than exceptions so the UI can show
 * partial results (the mL volume is still correct) alongside the warnings.
 */
export function measureWithU100(
  syringe: U100Syringe,
  volumeMl: number
): SyringeMeasurement {
  const units = u100UnitsForVolume(volumeMl);
  const capacityUnits = u100UnitsForVolume(syringe.capacityMl);
  const smallestMl = smallestGraduationMl(syringe);

  const nearestUnits = Math.round(units / syringe.tickUnits) * syringe.tickUnits;
  const nearestVolumeMl = volumeForU100Units(nearestUnits);
  const onGraduation = Math.abs(nearestVolumeMl - volumeMl) <= GRADUATION_TOLERANCE_ML;

  const issues: SyringeIssue[] = [];
  const fits = volumeMl <= syringe.capacityMl + GRADUATION_TOLERANCE_ML;

  if (!fits) {
    issues.push({
      code: "exceedsCapacity",
      message:
        `Dose volume (${volumeMl.toFixed(3)} mL = ${roundUnits(units)} units) exceeds the ` +
        `${syringe.capacityMl} mL syringe capacity (${roundUnits(capacityUnits)} units).`,
    });
  } else if (volumeMl < smallestMl - GRADUATION_TOLERANCE_ML) {
    issues.push({
      code: "belowSmallestGraduation",
      message:
        `Dose volume (${volumeMl.toFixed(3)} mL) is smaller than the syringe's smallest ` +
        `graduation of ${syringe.tickUnits} unit${syringe.tickUnits === 1 ? "" : "s"} ` +
        `(${smallestMl.toFixed(3)} mL) and cannot be measured on this syringe.`,
    });
  } else if (!onGraduation) {
    issues.push({
      code: "betweenGraduations",
      message:
        `Dose volume (${volumeMl.toFixed(3)} mL = ${roundUnits(units)} units) falls between the syringe's ` +
        `${syringe.tickUnits}-unit graduations. The closest drawable volume is ` +
        `${roundUnits(nearestUnits)} units (${nearestVolumeMl.toFixed(3)} mL).`,
    });
  }

  return {
    syringe,
    volumeMl,
    units,
    capacityUnits,
    fits,
    onGraduation,
    nearestVolumeMl,
    nearestUnits,
    issues,
  };
}

/** Round U-100 units for display without trailing float noise. */
function roundUnits(units: number): string {
  return Number.isInteger(units) ? String(units) : units.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}
