import { describe, expect, it } from "vitest";
import { MCG_PER_MG, formatAmountInUnit, toMcg, toMg } from "./units";

describe("unit conversions", () => {
  it("converts mg to mcg exactly (1 mg = 1000 mcg)", () => {
    expect(toMcg(5, "mg")).toBe(5000);
    expect(toMcg(0.25, "mg")).toBe(250);
    expect(toMcg(1234, "mcg")).toBe(1234);
  });

  it("converts mcg to mg", () => {
    expect(toMg(5000, "mcg")).toBe(5);
    expect(toMg(250, "mcg")).toBe(0.25);
    expect(toMg(2.5, "mg")).toBe(2.5);
  });

  it("stays exact across the 1 mg threshold where float precision matters", () => {
    // 0.1 mg of peptide = 100 mcg; converting there-and-back must not drift.
    expect(toMcg(0.1, "mg")).toBeCloseTo(100, 12);
    expect(toMg(toMcg(0.1, "mg"), "mcg")).toBeCloseTo(0.1, 12);
  });

  it("formats a mcg value in the requested unit", () => {
    expect(formatAmountInUnit(5000, "mg")).toBe(5);
    expect(formatAmountInUnit(250, "mcg")).toBe(250);
    expect(formatAmountInUnit(750, "mg")).toBe(0.75);
  });

  it("exposes the canonical conversion constant", () => {
    expect(MCG_PER_MG).toBe(1000);
  });
});
