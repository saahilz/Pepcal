/**
 * Sub-Q injection-site rotation as a record-keeping aid.
 *
 * Six labelled zones replace coordinates on a silhouette. Sites are stored in
 * the existing `location` field (label + normalized view/x/y on the front
 * view) on each injection record — no schema change. Free-text locations keep
 * working; zone matching is by label, so older hand-typed labels like
 * "Left abdomen" rotate exactly like a zone tap.
 *
 * Nothing here recommends a site. "Least recently used" only makes the
 * rotation the user already performs visible; it is not advice about where,
 * when, or whether to inject.
 */

export type InjectionZoneId =
  | "abdomen_left"
  | "abdomen_right"
  | "thigh_left"
  | "thigh_right"
  | "arm_left"
  | "arm_right";

export interface InjectionZone {
  id: InjectionZoneId;
  /** Stored as the injection's location label; matches older free text. */
  label: string;
  /** Center of the zone on the front silhouette, normalized 0..1. */
  x: number;
  y: number;
}

/** viewBox is 250×200 in the picker; coords below are that ÷ size. Spread to
 *  match the outstretched Vitruvian silhouette: each center sits on its limb
 *  midline, and at the picker's h-52 render size no two markers come closer
 *  than the 44px tap-slop target — the abdomen pair flank the navel without
 *  their hit areas stealing each other's taps. (Old 120×200 coords stored on
 *  custom-text records are never re-rendered; only zone labels are read back.) */
export const INJECTION_ZONES: InjectionZone[] = [
  { id: "arm_left", label: "Left arm", x: 70 / 250, y: 42 / 200 },
  { id: "arm_right", label: "Right arm", x: 180 / 250, y: 42 / 200 },
  { id: "abdomen_left", label: "Left abdomen", x: 99 / 250, y: 88 / 200 },
  { id: "abdomen_right", label: "Right abdomen", x: 151 / 250, y: 88 / 200 },
  { id: "thigh_left", label: "Left thigh", x: 95 / 250, y: 149 / 200 },
  { id: "thigh_right", label: "Right thigh", x: 155 / 250, y: 149 / 200 },
];

const BY_LABEL = new Map(INJECTION_ZONES.map((z) => [z.label.toLowerCase(), z]));

/** The zone a stored location label maps to, or null for custom text. */
export function zoneForLabel(label: string | null | undefined): InjectionZone | null {
  if (!label) return null;
  return BY_LABEL.get(label.trim().toLowerCase()) ?? null;
}

interface DatedLocation {
  administeredAt: string;
  location?: { label?: string | null } | null;
}

/** Most recent zone label → zone; null when no zone-labelled record exists. */
export function lastUsedZone(injections: DatedLocation[]): InjectionZone | null {
  let best: { at: string; zone: InjectionZone } | null = null;
  for (const i of injections) {
    const zone = zoneForLabel(i.location?.label);
    if (zone && (!best || i.administeredAt > best.at)) best = { at: i.administeredAt, zone };
  }
  return best?.zone ?? null;
}

/**
 * The least-recently-used zone (never-used zones rank oldest, earliest-declared
 * first on ties). A display nudge only — the user always picks.
 */
export function recommendedZone(injections: DatedLocation[]): InjectionZone {
  const lastAt: (string | null)[] = INJECTION_ZONES.map(() => null);
  for (const i of injections) {
    const zone = zoneForLabel(i.location?.label);
    if (!zone) continue;
    const idx = INJECTION_ZONES.indexOf(zone);
    if (lastAt[idx] === null || i.administeredAt > lastAt[idx]!) lastAt[idx] = i.administeredAt;
  }
  let best = 0;
  for (let i = 1; i < INJECTION_ZONES.length; i++) {
    // an unused zone, or an older-used zone, beats the current pick
    if (lastAt[best] !== null && (lastAt[i] === null || lastAt[i]! < lastAt[best]!)) best = i;
  }
  return INJECTION_ZONES[best];
}
