import { describe, expect, it } from "vitest";
import { doseMarkers } from "./dose-markers";
import type { WeightPoint } from "./weight";

const day = (d: number): number => new Date(Date.UTC(2026, 0, d)).getTime();
const p = (id: string, d: number, kg: number): WeightPoint => ({ id, at: day(d), kg });

describe("doseMarkers", () => {
  const points = [p("a", 1, 88), p("b", 5, 86), p("c", 9, 84)];

  it("leaves the earliest dose flagged, with no delta to show", () => {
    const markers = doseMarkers([{ at: day(1), label: "x" }], points);
    expect(markers[0].deltaKg).toBeNull();
    expect(markers[0].isFirst).toBe(true);
  });

  it("measures the line's change since the previous dose", () => {
    // Line: day 2 → 87.5, day 8 → 84.5 ⇒ change since previous dose −3.
    const markers = doseMarkers(
      [
        { at: day(8), label: "second" },
        { at: day(2), label: "first" },
      ],
      points
    );
    expect(markers.map((m) => m.label)).toEqual(["first", "second"]); // time-sorted, not input order
    expect(markers[1].deltaKg).toBeCloseTo(-3, 6);
    expect(markers[1].isFirst).toBe(false);
  });

  it("is null where the line does not exist yet", () => {
    const markers = doseMarkers([{ at: day(0) }, { at: day(-5) }], points);
    expect(markers[0].deltaKg).toBeNull();
    expect(markers[1].deltaKg).toBeNull();
  });

  it("handles no weight readings at all", () => {
    const markers = doseMarkers([{ at: day(3) }, { at: day(9) }], []);
    expect(markers.map((m) => m.deltaKg)).toEqual([null, null]);
  });
});
