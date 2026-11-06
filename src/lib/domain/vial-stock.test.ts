import { describe, expect, it } from "vitest";
import { BACTERIOSTATIC_WINDOW_DAYS, vialFreshness, vialStock } from "./vial-stock";

const ms = Date.parse("2025-11-01T00:00:00.000Z");
const now = new Date(ms);
const day = "2025-10-01T00:00:00.000Z";
const iso = (daysAgo: number) => new Date(ms - daysAgo * 86_400_000).toISOString();
const log = (volumeMl: number | null, administeredAt = day, id = String(volumeMl)) => ({
  id,
  volumeMl,
  administeredAt,
});

describe("vialStock", () => {
  it("deducts logged volumes from the diluent volume", () => {
    const stock = vialStock({ diluentMl: 2, reconstitutedAt: day }, [log(0.1), log(0.2), log(null)])!;
    expect(stock.remainingMl).toBeCloseTo(1.7, 9);
  });

  it("never reports negative remaining volume", () => {
    const stock = vialStock({ diluentMl: 1, reconstitutedAt: day }, [log(0.6), log(0.9)])!;
    expect(stock.remainingMl).toBe(0);
    expect(stock.dosesRemaining).toBe(0);
  });

  it("estimates doses with the freshest logged draw ⌊remaining ÷ perDose⌋", () => {
    const stock = vialStock(
      { diluentMl: 2, reconstitutedAt: day },
      [log(0.25, iso(1)), log(0.1, iso(5)), log(0.1, iso(9))]
    )!;
    expect(stock.perDoseMl).toBe(0.25);
    expect(stock.remainingMl).toBeCloseTo(1.55, 9);
    expect(stock.dosesRemaining).toBe(6);
  });

  it("has no dose estimate when nothing has been logged against the vial", () => {
    const stock = vialStock({ diluentMl: 2, reconstitutedAt: day }, [])!;
    expect(stock.perDoseMl).toBeNull();
    expect(stock.dosesRemaining).toBeNull();
  });

  it("is null for a vial without a recorded diluent volume", () => {
    expect(vialStock({ diluentMl: null, reconstitutedAt: day }, [log(0.1)])).toBeNull();
  });
});

describe("vialFreshness", () => {
  it("counts elapsed days against the 28-day window", () => {
    const f = vialFreshness({ reconstitutedAt: iso(5) }, now)!;
    expect(f.elapsedDays).toBe(5);
    expect(f.fraction).toBeCloseTo(5 / BACTERIOSTATIC_WINDOW_DAYS, 9);
    expect(f.expired).toBe(false);
  });

  it("marks the window closed at 28 days", () => {
    const f = vialFreshness({ reconstitutedAt: iso(28) }, now)!;
    expect(f.expired).toBe(true);
    expect(f.fraction).toBe(1);
  });

  it("clamps a future timestamp to zero elapsed", () => {
    expect(vialFreshness({ reconstitutedAt: iso(-2) }, now)!.elapsedDays).toBe(0);
  });

  it("is null until a reconstitution is recorded", () => {
    expect(vialFreshness({ reconstitutedAt: null }, now)).toBeNull();
    expect(vialFreshness({ reconstitutedAt: "garbage" }, now)).toBeNull();
  });
});
