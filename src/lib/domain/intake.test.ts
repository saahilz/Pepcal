import { describe, expect, it } from "vitest";
import {
  DEFAULT_PROTEIN_TARGET_G,
  DEFAULT_WATER_TARGET_ML,
  intakeFraction,
  intakeLabel,
  resolveTargets,
} from "./intake";

describe("resolveTargets", () => {
  it("falls back to the defaults when nothing is configured", () => {
    expect(resolveTargets({ proteinTargetG: null, waterTargetMl: null })).toEqual({
      proteinG: DEFAULT_PROTEIN_TARGET_G,
      waterMl: DEFAULT_WATER_TARGET_ML,
    });
  });

  it("keeps user values and ignores garbage", () => {
    expect(resolveTargets({ proteinTargetG: 130, waterTargetMl: 3000 })).toEqual({
      proteinG: 130,
      waterMl: 3000,
    });
    expect(resolveTargets({ proteinTargetG: 0, waterTargetMl: NaN }).proteinG).toBe(
      DEFAULT_PROTEIN_TARGET_G
    );
    expect(resolveTargets({ proteinTargetG: -5, waterTargetMl: null }).waterMl).toBe(
      DEFAULT_WATER_TARGET_ML
    );
  });
});

describe("intakeFraction", () => {
  it("clamps to a full bar, never past it", () => {
    expect(intakeFraction(50, 100)).toBe(0.5);
    expect(intakeFraction(250, 100)).toBe(1);
    expect(intakeFraction(0, 100)).toBe(0);
    expect(intakeFraction(-10, 100)).toBe(0);
  });

  it("reads empty for junk inputs", () => {
    expect(intakeFraction(NaN, 100)).toBe(0);
    expect(intakeFraction(50, 0)).toBe(0);
  });
});

describe("intakeLabel", () => {
  it("rounds to whole units", () => {
    expect(intakeLabel(99.6, 100.4, "g")).toBe("100 / 100 g");
    expect(intakeLabel(0, 2500, "mL")).toBe("0 / 2500 mL");
  });
});
