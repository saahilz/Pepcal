/**
 * Discretion mode: anonymous stand-ins for record names.
 *
 * Pure and browser-safe. Identities are derived from the stored name itself,
 * so "Compound K" is the same compound everywhere it appears and a reload
 * (or another device on the same record) shows the same letter. The mapping is
 * deliberately simple — this is shoulder-surfing cover, not crypto; nothing
 * here changes what is stored, only what is displayed.
 */

export type DiscretionKind = "compound" | "vial" | "protocol";

const LETTERS = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const PROTOCOL_NAMES = [
  "Alpha",
  "Beta",
  "Gamma",
  "Delta",
  "Epsilon",
  "Zeta",
  "Eta",
  "Theta",
];

/** FNV-1a, 32-bit — one line, no dependency, stable across sessions. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/**
 * "Compound K" / "Vial #1" / "Protocol Alpha". `seed` is whatever identifies
 * the thing for this user (vial name, snapshot, schedule id); `index` is the
 * 0-based list position for "Vial #N" labels.
 */
export function anonymousLabel(
  kind: DiscretionKind,
  seed: string,
  index = 0
): string {
  if (kind === "vial") return `Vial #${index + 1}`;
  if (kind === "protocol") {
    return `Protocol ${PROTOCOL_NAMES[hash(seed) % PROTOCOL_NAMES.length]}`;
  }
  return `Compound ${LETTERS[hash(seed) % LETTERS.length]}`;
}
