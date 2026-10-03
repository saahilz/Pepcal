import { describe, expect, it } from "vitest";
import {
  measureWithU100,
  smallestGraduationMl,
  u100UnitsForVolume,
  U100_UNITS_PER_ML,
  volumeForU100Units,
  type U100Syringe,
} from "./syringe";

const oneMlSyringe = (tickUnits = 1): U100Syringe => ({
  kind: "u100",
  capacityMl: 1,
  tickUnits,
});

describe("U-100 scale conversion", () => {
  it("maps 100 units to 1 mL and back", () => {
    expect(U100_UNITS_PER_ML).toBe(100);
    expect(u100UnitsForVolume(0.1)).toBe(10);
    expect(u100UnitsForVolume(1)).toBe(100);
    expect(volumeForU100Units(25)).toBe(0.25);
    expect(volumeForU100Units(100)).toBe(1);
  });
});

describe("graduation math", () => {
  it("knows the smallest graduation volume", () => {
    expect(smallestGraduationMl(oneMlSyringe(1))).toBe(0.01);
    expect(smallestGraduationMl(oneMlSyringe(0.5))).toBe(0.005);
    expect(smallestGraduationMl(oneMlSyringe(2))).toBe(0.02);
  });
});

describe("measureWithU100", () => {
  it("measures a dose that lands exactly on a graduation", () => {
    // 0.25 mL = 25 units on a 1-unit syringe
    const m = measureWithU100(oneMlSyringe(1), 0.25);
    expect(m.units).toBe(25);
    expect(m.onGraduation).toBe(true);
    expect(m.fits).toBe(true);
    expect(m.issues).toEqual([]);
  });

  it("snaps to the nearest graduation when the dose falls between ticks", () => {
    // 12.5 units cannot be drawn on a 1-unit syringe → nearest is 13 units.
    const m = measureWithU100(oneMlSyringe(1), 0.125);
    expect(m.onGraduation).toBe(false);
    expect(m.nearestUnits).toBe(13);
    expect(m.nearestVolumeMl).toBe(0.13);
    expect(m.issues.some((i) => i.code === "betweenGraduations")).toBe(true);
  });

  it("sends an exact half-unit boundary to the higher graduation", () => {
    // 12.5 units on 1-unit ticks: equidistant; Math.round → 13 units.
    const m = measureWithU100(oneMlSyringe(1), 0.125);
    expect(m.nearestUnits).toBe(13);
  });

  it("accepts half-unit graduations for a 0.5-unit syringe", () => {
    // 0.125 mL = 12.5 units is drawable when ticks are 0.5 units apart.
    const m = measureWithU100(oneMlSyringe(0.5), 0.125);
    expect(m.onGraduation).toBe(true);
    expect(m.nearestUnits).toBe(12.5);
    expect(m.issues).toEqual([]);
  });

  it("flags a dose larger than the barrel capacity", () => {
    const m = measureWithU100(oneMlSyringe(1), 1.25);
    expect(m.fits).toBe(false);
    expect(m.issues.some((i) => i.code === "exceedsCapacity")).toBe(true);
  });

  it("flags a dose smaller than the smallest graduation", () => {
    const m = measureWithU100(oneMlSyringe(1), 0.004);
    expect(m.issues.some((i) => i.code === "belowSmallestGraduation")).toBe(true);
  });

  it("flags an oversize dose against a 0.3 mL syringe", () => {
    const small: U100Syringe = { kind: "u100", capacityMl: 0.3, tickUnits: 1 };
    const m = measureWithU100(small, 0.5);
    expect(m.capacityUnits).toBe(30);
    expect(m.issues.some((i) => i.code === "exceedsCapacity")).toBe(true);
  });

  it("is tolerant of float representation error on exact ticks", () => {
    // 0.3 mL is not exactly representable in binary; must still count as on-tick.
    const m = measureWithU100(oneMlSyringe(1), 0.3);
    expect(m.onGraduation).toBe(true);
    expect(m.issues).toEqual([]);
  });
});
