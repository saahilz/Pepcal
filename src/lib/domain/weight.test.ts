import { describe, expect, it } from "vitest";
import {
  KG_PER_LB,
  buildWeightChart,
  convertWeight,
  fromKg,
  nearestPointIndex,
  niceStep,
  summarizeWeight,
  toKg,
  toWeightPoints,
  weightDeltaLabel,
  weightLabel,
  type WeightPoint,
} from "./weight";

const point = (id: string, day: number, kg: number): WeightPoint => ({
  id,
  at: new Date(Date.UTC(2026, 0, day)).getTime(),
  kg,
});

describe("weight unit conversions", () => {
  it("stores kilograms unchanged", () => {
    expect(toKg(82.4, "kg")).toBe(82.4);
    expect(fromKg(82.4, "kg")).toBe(82.4);
  });

  it("converts pounds with the exact avoirdupois factor", () => {
    expect(KG_PER_LB).toBe(0.45359237);
    expect(toKg(150, "lb")).toBeCloseTo(68.0388555, 6);
    expect(fromKg(68.0388555, "lb")).toBeCloseTo(150, 8);
  });

  it("round-trips a lb-entered reading without drift", () => {
    const entered = 172.5;
    expect(convertWeight(convertWeight(entered, "lb", "kg"), "kg", "lb")).toBeCloseTo(entered, 10);
  });

  it("is a no-op when the units match", () => {
    expect(convertWeight(80, "kg", "kg")).toBe(80);
    expect(convertWeight(80, "lb", "lb")).toBe(80);
  });
});

describe("display labels", () => {
  it("shows a reading in the chosen unit", () => {
    expect(weightLabel(82.1, "kg")).toBe("82.1 kg");
    expect(weightLabel(toKg(181, "lb"), "lb")).toBe("181.0 lb");
  });

  it("signs a change and carries the unit", () => {
    expect(weightDeltaLabel(-6.3, "kg")).toBe("−6.3 kg");
    expect(weightDeltaLabel(1.2, "kg")).toBe("+1.2 kg");
    expect(weightDeltaLabel(0, "kg")).toBe("0");
    expect(weightDeltaLabel(0.01, "kg")).toBe("0");
  });

  it("has nothing to show until there are two readings", () => {
    expect(weightDeltaLabel(null, "kg")).toBe("—");
  });
});

describe("toWeightPoints", () => {
  it("sorts ascending by time regardless of input order", () => {
    const points = toWeightPoints([
      { id: "c", recordedAt: "2026-01-03T07:00:00.000Z", weightKg: 80 },
      { id: "a", recordedAt: "2026-01-01T07:00:00.000Z", weightKg: 82 },
      { id: "b", recordedAt: "2026-01-02T07:00:00.000Z", weightKg: 81 },
    ]);
    expect(points.map((p) => p.id)).toEqual(["a", "b", "c"]);
  });

  it("drops unparseable rows rather than plotting NaN", () => {
    const points = toWeightPoints([
      { id: "bad", recordedAt: "not-a-date", weightKg: 80 },
      { id: "good", recordedAt: "2026-01-01T07:00:00.000Z", weightKg: 80 },
    ]);
    expect(points.map((p) => p.id)).toEqual(["good"]);
  });
});

describe("summarizeWeight", () => {
  it("returns nulls for an empty series", () => {
    expect(summarizeWeight([])).toEqual({
      count: 0,
      firstKg: null,
      latestKg: null,
      changeKg: null,
      minKg: null,
      maxKg: null,
    });
  });

  it("reports no change figure until there are two readings", () => {
    const summary = summarizeWeight([point("a", 1, 80)]);
    expect(summary.count).toBe(1);
    expect(summary.latestKg).toBe(80);
    expect(summary.changeKg).toBeNull();
  });

  it("computes the signed change from first to latest", () => {
    const summary = summarizeWeight([point("a", 1, 88.4), point("b", 2, 87), point("c", 3, 84.4)]);
    expect(summary.latestKg).toBe(84.4);
    expect(summary.changeKg).toBeCloseTo(-4, 10);
    expect(summary.minKg).toBe(84.4);
    expect(summary.maxKg).toBe(88.4);
  });

  it("reports a gain as a positive change without judging it", () => {
    const summary = summarizeWeight([point("a", 1, 70), point("b", 2, 71.2)]);
    expect(summary.changeKg).toBeCloseTo(1.2, 10);
  });
});

describe("niceStep", () => {
  it("snaps to 1/2/5 × 10^n", () => {
    expect(niceStep(10, 5)).toBe(2);
    expect(niceStep(100, 4)).toBe(20);
    expect(niceStep(1, 4)).toBe(0.2);
    expect(niceStep(0.5, 4)).toBe(0.1);
  });

  it("falls back to 1 for a degenerate range", () => {
    expect(niceStep(0, 4)).toBe(1);
    expect(niceStep(10, 0)).toBe(1);
  });
});

describe("buildWeightChart", () => {
  const series = [point("a", 1, 88), point("b", 5, 86), point("c", 9, 84)];

  it("returns null when there is nothing to draw", () => {
    expect(buildWeightChart([], { width: 600, height: 240 })).toBeNull();
    expect(buildWeightChart(series, { width: 0, height: 240 })).toBeNull();
  });

  it("keeps every point inside the plot box", () => {
    const g = buildWeightChart(series, { width: 600, height: 240 })!;
    for (const p of g.points) {
      expect(p.x).toBeGreaterThanOrEqual(g.plot.left);
      expect(p.x).toBeLessThanOrEqual(g.plot.right);
      expect(p.y).toBeGreaterThanOrEqual(g.plot.top);
      expect(p.y).toBeLessThanOrEqual(g.plot.bottom);
    }
  });

  it("spaces x proportionally to elapsed time, not point index", () => {
    // Day 1→5 is 4 days; day 5→9 is 4 days: even spacing here.
    const even = buildWeightChart(series, { width: 600, height: 240 })!;
    const firstGap = even.points[1].x - even.points[0].x;
    const secondGap = even.points[2].x - even.points[1].x;
    expect(firstGap).toBeCloseTo(secondGap, 6);

    // A bunched series must not space evenly.
    const bunched = buildWeightChart(
      [point("a", 1, 88), point("b", 2, 87), point("c", 30, 84)],
      { width: 600, height: 240 }
    )!;
    expect(bunched.points[1].x - bunched.points[0].x).toBeLessThan(
      bunched.points[2].x - bunched.points[1].x
    );
  });

  it("emits a moveto-led line path and a closed area path", () => {
    const g = buildWeightChart(series, { width: 600, height: 240 })!;
    expect(g.linePath.startsWith("M")).toBe(true);
    expect(g.linePath).not.toContain("NaN");
    expect(g.areaPath.endsWith("Z")).toBe(true);
  });

  it("draws no area for a single reading", () => {
    const g = buildWeightChart([point("a", 1, 88)], { width: 600, height: 240 })!;
    expect(g.areaPath).toBe("");
    expect(g.points).toHaveLength(1);
    expect(g.xTicks).toHaveLength(1);
  });

  it("gives a flat series a window to draw in", () => {
    const g = buildWeightChart([point("a", 1, 80), point("b", 2, 80)], { width: 600, height: 240 })!;
    expect(g.minKg).toBeLessThan(80);
    expect(g.maxKg).toBeGreaterThan(80);
    expect(Number.isFinite(g.points[0].y)).toBe(true);
  });

  it("never places gridline ticks outside the plot", () => {
    const g = buildWeightChart(series, { width: 600, height: 240 })!;
    expect(g.yTicks.length).toBeGreaterThan(0);
    for (const t of g.yTicks) {
      expect(t.y).toBeGreaterThanOrEqual(g.plot.top - 0.001);
      expect(t.y).toBeLessThanOrEqual(g.plot.bottom + 0.001);
    }
  });
});

describe("nearestPointIndex", () => {
  it("snaps to the closest reading in either direction", () => {
    const points = [{ x: 0 }, { x: 100 }, { x: 200 }];
    expect(nearestPointIndex(points, 90)).toBe(1);
    expect(nearestPointIndex(points, 140)).toBe(1);
    expect(nearestPointIndex(points, 160)).toBe(2);
    expect(nearestPointIndex(points, -50)).toBe(0);
  });

  it("reports -1 for an empty series", () => {
    expect(nearestPointIndex([], 10)).toBe(-1);
  });
});
