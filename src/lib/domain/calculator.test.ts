import { describe, expect, it } from "vitest";
import {
  computeReconstitution,
  parseDecimal,
  validateReconstitution,
  type ReconstitutionInput,
} from "./calculator";

const valid = (over: Partial<ReconstitutionInput> = {}): ReconstitutionInput => ({
  vialAmount: 5,
  vialUnit: "mg",
  diluentMl: 2,
  desiredAmount: 250,
  desiredUnit: "mcg",
  ...over,
});

describe("text parsing", () => {
  it("rejects blank and nonnumeric input", () => {
    expect(parseDecimal("")).toBeNull();
    expect(parseDecimal("   ")).toBeNull();
    expect(parseDecimal("abc")).toBeNull();
    expect(parseDecimal("12abc")).toBeNull();
    expect(parseDecimal("--2")).toBeNull();
    expect(parseDecimal("Infinity")).toBeNull();
  });

  it("accepts finite decimal numbers and a comma decimal separator", () => {
    expect(parseDecimal("2")).toBe(2);
    expect(parseDecimal("1.5")).toBe(1.5);
    expect(parseDecimal("0,5")).toBe(0.5);
    expect(parseDecimal("-2")).toBe(-2); // parses; validation rejects it later
  });
});

describe("validation", () => {
  it("accepts a fully valid input", () => {
    expect(validateReconstitution(valid())).toEqual([]);
  });

  it("rejects zero and negative vial amounts", () => {
    for (const vialAmount of [0, -5]) {
      const issues = validateReconstitution(valid({ vialAmount }));
      expect(issues.some((i) => i.field === "vialAmount" && i.code === "notPositive")).toBe(true);
    }
  });

  it("rejects zero and negative diluent volumes", () => {
    for (const diluentMl of [0, -1]) {
      const issues = validateReconstitution(valid({ diluentMl }));
      expect(issues.some((i) => i.field === "diluentMl" && i.code === "notPositive")).toBe(true);
    }
  });

  it("rejects a zero or negative desired amount", () => {
    for (const desiredAmount of [0, -10]) {
      const issues = validateReconstitution(valid({ desiredAmount }));
      expect(issues.some((i) => i.field === "desiredAmount" && i.code === "notPositive")).toBe(true);
    }
  });

  it("flags a desired amount that exceeds the whole vial", () => {
    const issues = validateReconstitution(
      valid({ vialAmount: 1, vialUnit: "mg", desiredAmount: 1500, desiredUnit: "mcg" })
    );
    expect(issues.some((i) => i.code === "desiredExceedsVial")).toBe(true);
  });

  it("compares across mixed units when flagging over-vial amounts", () => {
    // 5 mcg dose against a 5 mg vial is fine; 6000 mcg vs 5 mg is not.
    expect(validateReconstitution(valid({ desiredAmount: 5, desiredUnit: "mcg" }))).toEqual([]);
    const issues = validateReconstitution(
      valid({ desiredAmount: 6000, desiredUnit: "mcg" })
    );
    expect(issues.some((i) => i.code === "desiredExceedsVial")).toBe(true);
  });
});

describe("formulas (spec §3)", () => {
  it("computes the canonical worked example", () => {
    // 5 mg vial + 2 mL diluent + 250 mcg dose
    const r = computeReconstitution(valid());
    expect(r.totalMcg).toBe(5000); // total_mcg = 5 × 1000
    expect(r.concentrationMcgPerMl).toBe(2500); // 5000 ÷ 2
    expect(r.concentrationMgPerMl).toBe(2.5);
    expect(r.injectionVolumeMl).toBe(0.1); // 250 ÷ 2500
    expect(r.fullDoses).toBe(20); // floor(5000 ÷ 250)
    expect(r.remainderMcg).toBe(0);
  });

  it("keeps mg and mcg dose entries equivalent", () => {
    const mgDose = computeReconstitution(valid({ desiredAmount: 0.25, desiredUnit: "mg" }));
    const mcgDose = computeReconstitution(valid({ desiredAmount: 250, desiredUnit: "mcg" }));
    expect(mgDose.injectionVolumeMl).toBeCloseTo(mcgDose.injectionVolumeMl, 12);
    expect(mgDose.desiredMcg).toBe(mcgDose.desiredMcg);
  });

  it("computes a whole-1 mL dose", () => {
    const r = computeReconstitution(
      valid({ vialAmount: 2.5, desiredAmount: 2500, desiredUnit: "mcg", diluentMl: 1 })
    );
    expect(r.concentrationMcgPerMl).toBe(2500);
    expect(r.injectionVolumeMl).toBe(1);
  });

  it("reports leftover peptide after complete doses", () => {
    // 5000 mcg ÷ 300 mcg = 16.66 → 16 full doses, 200 mcg leftover
    const r = computeReconstitution(valid({ desiredAmount: 300, desiredUnit: "mcg" }));
    expect(r.fullDoses).toBe(16);
    expect(r.remainderMcg).toBe(200);
  });

  it("computes a single full-vial dose", () => {
    const r = computeReconstitution(
      valid({ vialAmount: 1, vialUnit: "mg", diluentMl: 1, desiredAmount: 1, desiredUnit: "mg" })
    );
    expect(r.fullDoses).toBe(1);
    expect(r.injectionVolumeMl).toBe(1);
  });
});

describe("compute precondition", () => {
  it("throws rather than computing on an invalid input", () => {
    expect(() => computeReconstitution(valid({ diluentMl: 0 }))).toThrow();
    expect(() => computeReconstitution(valid({ desiredAmount: 999999, desiredUnit: "mcg" }))).toThrow();
  });
});
