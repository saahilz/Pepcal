import { describe, expect, it } from "vitest";
import { nextOccurrence, occurrencesWithin, formatCountdown } from "./schedule";
import type { Schedule } from "@/lib/data/repository";

const monWedFri: Schedule = {
  id: "s1",
  userId: "u",
  vialId: null,
  vialNameSnapshot: null,
  amount: 10,
  amountUnit: "mcg",
  pattern: { kind: "weekdays", weekdays: [1, 3, 5], timeLocal: "09:00" },
  startDate: "2026-10-05",
  endDate: null,
  timeZone: "UTC",
  travel: "homeTimeZone",
  enabled: true,
  createdAt: "",
  updatedAt: "",
  demo: false,
};

const every3: Schedule = {
  ...monWedFri,
  id: "s2",
  pattern: { kind: "everyXDays", intervalDays: 3, timeLocal: "20:00" },
  startDate: "2026-10-02",
};

// 2026-10-18T17:25:00Z — Sunday, so the next weekday hit is Monday 09:00.
const ref = new Date("2026-10-18T17:25:00Z");

describe("nextOccurrence", () => {
  it("finds the next weekday hit after the reference instant", () => {
    const t = nextOccurrence(monWedFri, ref);
    expect(t).toEqual(new Date("2026-10-19T09:00:00Z"));
  });

  it("returns null for a disabled schedule", () => {
    expect(nextOccurrence({ ...monWedFri, enabled: false }, ref)).toBeNull();
  });

  it("respects an end date", () => {
    expect(nextOccurrence({ ...monWedFri, endDate: "2026-10-18" }, ref)).toBeNull();
  });

  it("respects a start date in the future", () => {
    const t = nextOccurrence({ ...monWedFri, startDate: "2026-10-26" }, ref);
    expect(t).toEqual(new Date("2026-10-26T09:00:00Z"));
  });

  it("advances past the current hit", () => {
    const first = nextOccurrence(monWedFri, ref)!;
    const second = nextOccurrence(monWedFri, first);
    expect(second).toEqual(new Date("2026-10-21T09:00:00Z"));
  });

  it("supports everyXDays patterns", () => {
    // Anchored at Oct 2 → hits every 3rd day: the 17th, the 20th… (not the 19th).
    const t = nextOccurrence(every3, ref);
    expect(t).toEqual(new Date("2026-10-20T20:00:00Z"));
  });
});

describe("occurrencesWithin", () => {
  it("merges schedules and sorts soonest first", () => {
    const out = occurrencesWithin([monWedFri, every3], ref, new Date("2026-10-22T23:59:00Z"));
    expect(out.map((o) => o.at.toISOString())).toEqual([
      "2026-10-19T09:00:00.000Z", // weekday schedule, Monday
      "2026-10-20T20:00:00.000Z", // every-3-days schedule, anchored at Oct 2
      "2026-10-21T09:00:00.000Z", // weekday schedule, Wednesday
    ]);
  });

  it("stops at the window end", () => {
    const out = occurrencesWithin([monWedFri], ref, new Date("2026-10-19T10:00:00Z"));
    expect(out).toHaveLength(1);
  });
});

describe("time-zone handling", () => {
  it("resolves wall-clock time in the schedule's zone, not the machine's", () => {
    // A Tokyo schedule at 09:00 local = 00:00 UTC.
    const tokyo: Schedule = { ...monWedFri, timeZone: "Asia/Tokyo" };
    const t = nextOccurrence(tokyo, new Date("2026-10-18T00:00:00Z"))!;
    expect(t.getUTCHours()).toBe(0);
  });

  it("keeps the local wall time — not the UTC instant — fixed across a DST boundary", () => {
    const london: Schedule = { ...monWedFri, timeZone: "Europe/London" };
    // BST ends 25 Oct 2026. 09:00 local is 08:00Z before, 09:00Z after:
    // the same wall clock, one hour apart in UTC.
    expect(nextOccurrence(london, new Date("2026-10-22T12:00:00Z")))
      .toEqual(new Date("2026-10-23T08:00:00Z")); // Fri 23, BST
    expect(nextOccurrence(london, new Date("2026-10-26T12:00:00Z")))
      .toEqual(new Date("2026-10-28T09:00:00Z")); // Wed 28, GMT
  });
});

describe("formatCountdown", () => {
  it("formats minutes, hours, and days", () => {
    const t = new Date("2026-10-19T09:00:00Z");
    expect(formatCountdown(t, new Date("2026-10-18T17:25:00Z"))).toBe("in 15h 35m");
    expect(formatCountdown(t, new Date("2026-10-19T08:00:00Z"))).toBe("in 1h");
    expect(formatCountdown(t, new Date("2026-10-19T08:50:00Z"))).toBe("in 10m");
    expect(formatCountdown(t, new Date("2026-10-19T09:00:00Z"))).toBe("due now");
    // 33h ahead = 1d 9h (Oct 18 00:00 → target 09:00 on the 19th).
    expect(formatCountdown(t, new Date("2026-10-18T00:00:00Z"))).toBe("in 1d 9h");
  });
});