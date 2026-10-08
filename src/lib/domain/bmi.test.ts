import { describe, expect, it } from "vitest";
import { bmiCategory, calculateBmi } from "./bmi";

describe("calculateBmi", () => {
  it("calculates BMI from kilograms and centimeters", () => {
    expect(calculateBmi(80, 180)).toBeCloseTo(24.6914, 4);
  });

  it("returns null for missing, non-finite, or non-positive measurements", () => {
    expect(calculateBmi(0, 180)).toBeNull();
    expect(calculateBmi(80, 0)).toBeNull();
    expect(calculateBmi(Number.NaN, 180)).toBeNull();
    expect(calculateBmi(80, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("bmiCategory", () => {
  it("classifies the standard BMI ranges at their boundaries", () => {
    expect(bmiCategory(18.4)).toBe("underweight");
    expect(bmiCategory(18.5)).toBe("normal");
    expect(bmiCategory(24.9)).toBe("normal");
    expect(bmiCategory(25)).toBe("overweight");
    expect(bmiCategory(29.9)).toBe("overweight");
    expect(bmiCategory(30)).toBe("obese");
  });

  it("returns null for invalid BMI values", () => {
    expect(bmiCategory(Number.NaN)).toBeNull();
    expect(bmiCategory(0)).toBeNull();
  });
});
