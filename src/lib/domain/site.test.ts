import { describe, expect, it } from "vitest";
import {
  INJECTION_ZONES,
  lastUsedZone,
  recommendedZone,
  zoneForLabel,
} from "./site";

const inj = (label: string | null, administeredAt: string, id = label ?? "none") => ({
  id,
  administeredAt,
  location: label === null ? null : { view: "front", x: 0.5, y: 0.5, label },
});

describe("zone label matching", () => {
  it("matches zone labels case/whitespace-insensitively", () => {
    expect(zoneForLabel("  left Abdomen ")?.id).toBe("abdomen_left");
    expect(zoneForLabel("Right thigh")?.id).toBe("thigh_right");
  });

  it("returns null for custom text and empty", () => {
    expect(zoneForLabel("love handle near navel")).toBeNull();
    expect(zoneForLabel(null)).toBeNull();
    expect(zoneForLabel("")).toBeNull();
  });

  it("defines exactly the six sub-Q zones", () => {
    expect(INJECTION_ZONES.map((z) => z.id)).toEqual([
      "arm_left",
      "arm_right",
      "abdomen_left",
      "abdomen_right",
      "thigh_left",
      "thigh_right",
    ]);
    for (const z of INJECTION_ZONES) {
      expect(z.x).toBeGreaterThan(0);
      expect(z.x).toBeLessThan(1);
      expect(z.y).toBeGreaterThan(0);
      expect(z.y).toBeLessThan(1);
    }
  });
});

describe("rotation reads", () => {
  it("lastUsedZone is the most recent zone-labelled record", () => {
    const list = [
      inj("Left arm", "2025-11-01T08:00:00.000Z"),
      inj("Left abdomen", "2025-11-03T08:00:00.000Z"),
      inj("Right abdomen", "2025-11-02T08:00:00.000Z"),
    ];
    expect(lastUsedZone(list)?.id).toBe("abdomen_left");
  });

  it("lastUsedZone ignores custom text", () => {
    expect(lastUsedZone([inj("somewhere odd", "2025-11-03T08:00:00.000Z")])).toBeNull();
  });

  it("recommendedZone picks a never-used zone when one exists", () => {
    const rec = recommendedZone([inj("Left abdomen", "2025-11-01T08:00:00.000Z")]);
    expect(rec.id).not.toBe("abdomen_left");
  });

  it("recommendedZone picks the least-recently-used zone once every zone has been used", () => {
    const full = [
      inj("Left arm", "2025-10-02T08:00:00.000Z", "s1"),
      inj("Right arm", "2025-10-03T08:00:00.000Z", "s2"),
      inj("Left abdomen", "2025-10-04T08:00:00.000Z", "s3"),
      inj("Right abdomen", "2025-10-05T08:00:00.000Z", "s4"),
      inj("Left thigh", "2025-10-06T08:00:00.000Z", "s5"),
      inj("Right thigh", "2025-10-07T08:00:00.000Z", "s6"),
      // and one more later in abdomen_right — it must not stay the oldest pick
      inj("Right abdomen", "2025-10-08T08:00:00.000Z", "s7"),
    ];
    expect(recommendedZone(full).id).toBe("arm_left");
  });

  it("recommendedZone falls back to the first zone when nothing is logged", () => {
    expect(recommendedZone([]).id).toBe("arm_left");
  });
});
