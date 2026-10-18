import { describe, expect, it } from "vitest";
import { addMonths, buildMonthGrid } from "./calendar";

describe("buildMonthGrid", () => {
  it("always returns 42 cells starting on the month's first Sunday", () => {
    const grid = buildMonthGrid(2026, 9); // October 2026 starts on Thursday
    expect(grid).toHaveLength(42);
    expect(grid[0].date.getDay()).toBe(0);
    expect(grid[0].date.getDate()).toBe(27); // Sep 27 2026 is the prior Sunday
  });

  it("marks only the visible month's days as in-month", () => {
    const grid = buildMonthGrid(2026, 9);
    const inMonth = grid.filter((c) => c.inMonth).map((c) => c.date.getDate());
    expect(inMonth).toHaveLength(31);
  });

  it("handles a 28-day February with no leading gaps needed", () => {
    // Feb 2027 starts on Monday: 1 leading cell, 6 rows still cover it.
    const grid = buildMonthGrid(2027, 1);
    expect(grid).toHaveLength(42);
    expect(grid.filter((c) => c.inMonth)).toHaveLength(28);
    expect(grid[0].date.getDate()).toBe(31); // Jan 31 2027 is a Sunday
  });
});

describe("addMonths", () => {
  it("rolls over year boundaries in both directions", () => {
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, month: 0 });
    expect(addMonths(2027, 0, -1)).toEqual({ year: 2026, month: 11 });
  });

  it("clamps month-ends without skipping months (Jan 31 + 1 month)", () => {
    expect(addMonths(2026, 0, 1)).toEqual({ year: 2026, month: 1 });
  });
});
