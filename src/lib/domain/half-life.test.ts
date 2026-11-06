import { describe, expect, it } from "vitest";
import {
  HALF_LIFE_PRESETS,
  SERUM_FUTURE_DAYS,
  SERUM_PAST_DAYS,
  activeMcgAt,
  buildSerumSeries,
  toSerumDoses,
  totalActiveMcg,
} from "./half-life";

const H = 3_600_000;
const D = 24 * H;

const dose = (id: string, at: number, mcg: number) => ({ id, at, mcg });

describe("half-life decay", () => {
  it("halves the amount every half-life", () => {
    const d = dose("a", 0, 1000);
    expect(activeMcgAt(d, 0, 24)).toBe(1000);
    expect(activeMcgAt(d, 24 * H, 24)).toBeCloseTo(500, 9);
    expect(activeMcgAt(d, 48 * H, 24)).toBeCloseTo(250, 9);
    expect(activeMcgAt(d, 72 * H, 24)).toBeCloseTo(125, 9);
  });

  it("is zero at a time before the dose", () => {
    expect(activeMcgAt(dose("a", 10 * D, 500), 9 * D, 24)).toBe(0);
  });

  it("degrades safely for a bad half-life instead of producing a number", () => {
    const d = dose("a", 0, 1000);
    expect(activeMcgAt(d, D, 0)).toBe(0);
    expect(activeMcgAt(d, D, -5)).toBe(0);
    expect(activeMcgAt(d, D, NaN)).toBe(0);
  });

  it("sums overlapping doses (0.5^(t/48) + 0.5^(t/24) at t = 24h)", () => {
    const doses = [dose("a", 0, 1000), dose("b", 24 * H, 1000)];
    expect(totalActiveMcg(doses, 48 * H, 24)).toBeCloseTo(250 + 500, 9);
  });

  it("ignores doses administered after t", () => {
    const doses = [dose("a", 0, 1000), dose("b", 10 * D, 5000)];
    expect(totalActiveMcg(doses, D, 24)).toBeCloseTo(500, 9);
  });
});

describe("serum series window", () => {
  const now = 1_762_000_000_000; // pinned: 2025-11-01T16:26:40Z-ish

  it("spans 30 days back and 7 days forward from now", () => {
    const series = buildSerumSeries([dose("a", now - D, 1000)], now, 24);
    expect(series.length).toBe(151);
    expect(series[0].at).toBe(now - SERUM_PAST_DAYS * D);
    expect(series[series.length - 1].at).toBe(now + SERUM_FUTURE_DAYS * D);
  });

  it("drops to (≈) zero across 7 days when nothing is dosed in the future", () => {
    const series = buildSerumSeries([dose("a", now, 1000)], now, 1);
    expect(series[series.length - 1].mcg).toBeCloseTo(0, 20);
  });

  it("climbs to the dose's value at the sample nearest now and stays below after", () => {
    const series = buildSerumSeries([dose("a", now, 1000)], now, 24);
    // Samples don't land exactly on now; the curve's max is the first sample
    // after the dose, and it has already decayed a little by then.
    const max = Math.max(...series.map((s) => s.mcg));
    const afterIdx = series.findIndex((s) => s.at > now);
    expect(series[afterIdx - 1].mcg).toBe(0); // sample before the dose
    expect(max).toBe(series[afterIdx].mcg);
    expect(max).toBeLessThan(1000);
    expect(max).toBeGreaterThan(800); // first sample lands ~2h past the dose (150 steps over 37d)
  });
});

describe("injection records → doses", () => {
  it("converts to mcg and sorts ascending; junk records are dropped", () => {
    const doses = toSerumDoses([
      { id: "c", administeredAt: "2025-11-02T08:00:00.000Z", amount: 0.25, amountUnit: "mg" },
      { id: "a", administeredAt: "2025-11-01T08:00:00.000Z", amount: 250, amountUnit: "mcg" },
      { id: "b", administeredAt: "not a date", amount: 250, amountUnit: "mcg" },
      { id: "d", administeredAt: "2025-11-03T08:00:00.000Z", amount: 0, amountUnit: "mcg" },
    ]);
    expect(doses.map((d) => d.id)).toEqual(["a", "c"]);
    expect(doses[1].mcg).toBe(250);
  });
});

describe("presets", () => {
  it("carry the hour values the UI promises", () => {
    expect(HALF_LIFE_PRESETS.map((p) => `${p.name}:${p.hours}`)).toEqual([
      "Semaglutide:168",
      "Tirzepatide:120",
      "Retatrutide:144",
      "BPC-157:4",
    ]);
  });
});
