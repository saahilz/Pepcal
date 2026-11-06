import { describe, expect, it } from "vitest";
import { buildMedicalLogCsv, csvField, localStamp, summarizeExports } from "./export";
import type { InjectionLog, Vial, WeightEntry } from "@/lib/data/types";

const vial = (over: Partial<Vial> = {}): Vial => ({
  id: "v1",
  userId: "u",
  name: "BPC-157",
  notes: "Lot 4471",
  vialAmount: 5,
  vialUnit: "mg",
  diluentMl: 2,
  concentrationMcgPerMl: 2500,
  concentrationMgPerMl: 2.5,
  reconstitutedAt: "2026-01-01T00:00:00.000Z",
  beyondUseDate: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
  demo: false,
  ...over,
});

const inj = (over: Partial<InjectionLog> = {}): InjectionLog => ({
  id: "i1",
  userId: "u",
  vialId: "v1",
  vialNameSnapshot: "BPC-157",
  concentrationMcgPerMl: 2500,
  concentrationMgPerMl: 2.5,
  amount: 500,
  amountUnit: "mcg",
  volumeMl: 0.2,
  administeredAt: "2026-03-02T10:00:00.000Z",
  scheduledTimeUtc: null,
  scheduleId: null,
  location: { view: "front", x: 0.4, y: 0.5, label: "Left abdomen" },
  notes: null,
  createdAt: "2026-03-02T10:30:00.000Z",
  demo: false,
  ...over,
});

const weight = (at: string, kg: number): WeightEntry => ({
  id: `w-${at}`,
  userId: "u",
  weightKg: kg,
  recordedAt: at,
  notes: null,
  createdAt: at,
  demo: false,
});

describe("csvField", () => {
  it("quotes only when needed, doubling inner quotes", () => {
    expect(csvField("plain")).toBe("plain");
    expect(csvField('a "b", c\nd')).toBe('"a ""b"", c\nd"');
  });
});

describe("localStamp", () => {
  it("is wall-clock in the named zone", () => {
    expect(localStamp("2026-03-02T10:00:00.000Z", "UTC")).toBe("2026-03-02T10:00:00");
    expect(localStamp("2026-03-02T10:00:00.000Z", "Asia/Karachi")) // UTC+5, no DST
      .toBe("2026-03-02T15:00:00");
  });
});

describe("buildMedicalLogCsv", () => {
  it("sorts rows chronologically and recomputes a missing draw volume", () => {
    const csv = buildMedicalLogCsv({
      injections: [
        inj({ id: "later", administeredAt: "2026-04-01T08:00:00.000Z" }),
        // No volumeMl, but a stored concentration: 250 mcg at 2500 mcg/mL ⇒ 0.1 mL ⇒ 10 U.
        inj({
          id: "earlier",
          administeredAt: "2026-02-01T08:00:00.000Z",
          volumeMl: null,
          amount: 250,
        }),
      ],
      vials: [vial()],
      weights: [],
    });
    const lines = csv.trim().split("\r\n");
    expect(lines[1]).toContain("2026-02-01"); // chronological beats input order
    expect(lines[2]).toContain("2026-04-01");
    const earlier = lines[1].split(",");
    expect(earlier).toContain("0.1"); // 250 mcg at 2500 mcg/mL, recomputed
    expect(earlier.some((f) => f.includes("10"))).toBe(true); // U-100 units
    expect(earlier).toContain("Lot 4471");
  });

  it("matches body weight by local calendar day", () => {
    const run = new Intl.DateTimeFormat().resolvedOptions().timeZone;
    // A UTC-midnight injection's local day shifts with the zone; assert the
    // value only under UTC to stay deterministic.
    if (run !== "UTC") return;
    const csv = buildMedicalLogCsv({
      injections: [inj({ administeredAt: "2026-03-02T10:00:00.000Z" })],
      vials: [vial()],
      weights: [weight("2026-03-01T23:00:00.000Z", 90), weight("2026-03-02T01:00:00.000Z", 89.5)],
    });
    expect(csv.trim().split("\r\n")[2]).toContain("89.5");
  });

  it("quotes a note containing a comma", () => {
    const csv = buildMedicalLogCsv({
      injections: [inj({ notes: "mild nausea, resolved" })],
      vials: [],
      weights: [],
    });
    expect(csv).toContain('"mild nausea, resolved"');
  });
});

describe("summarizeExports", () => {
  it("is empty-safe", () => {
    expect(summarizeExports([], [])).toEqual({
      count: 0,
      from: null,
      to: null,
      avgDaysBetween: null,
      netWeightKg: null,
    });
  });

  it("averages intervals and nets the weight across the logged span", () => {
    const s = summarizeExports(
      [inj({ administeredAt: "2026-03-01T00:00:00.000Z" }), inj({ administeredAt: "2026-03-11T00:00:00.000Z", id: "i2" })],
      [
        weight("2026-02-20T00:00:00.000Z", 91), // before first dose — counts
        weight("2026-03-05T00:00:00.000Z", 90), // mid-span — ignored
        weight("2026-03-10T00:00:00.000Z", 88), // last reading at/before the final dose
      ]
    );
    expect(s.count).toBe(2);
    expect(s.avgDaysBetween).toBeCloseTo(10, 6);
    expect(s.netWeightKg).toBeCloseTo(-3, 6); // 88 − 91, endpoints only
  });

  it("leaves the net weight null when nothing precedes the first dose", () => {
    const s = summarizeExports([inj()], [weight("2026-04-01T00:00:00.000Z", 90)]);
    expect(s.netWeightKg).toBeNull();
  });
});
