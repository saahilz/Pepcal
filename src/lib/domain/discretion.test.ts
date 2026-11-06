import { describe, expect, it } from "vitest";
import { anonymousLabel } from "./discretion";

describe("anonymousLabel", () => {
  it("maps a compound name to a stable letter", () => {
    const a = anonymousLabel("compound", "Semaglutide");
    const b = anonymousLabel("compound", "Semaglutide");
    expect(a).toMatch(/^Compound [A-Z]$/);
    expect(a).toBe(b);
  });

  it("uses list position for vials", () => {
    expect(anonymousLabel("vial", "whatever", 0)).toBe("Vial #1");
    expect(anonymousLabel("vial", "whatever", 2)).toBe("Vial #3");
  });

  it("names protocols from the fixed list", () => {
    expect(anonymousLabel("protocol", "schedule-42")).toMatch(/^Protocol (Alpha|Beta|Gamma|Delta|Epsilon|Zeta|Eta|Theta)$/);
  });
});
