/**
 * Fictional demonstration data.
 *
 * Everything here is made up: names, amounts, dates, and locations are sample
 * text intended to make the empty UI legible on first launch. Records created
 * from these seed rows carry `demo: true` and are surfaced with a "Demo" badge
 * and a persistent demo-mode banner so it is never mistaken for real health
 * data. Users can wipe it in Settings ("Remove demo data").
 *
 * These rows do NOT recommend a peptide, dose, schedule, or injection site —
 * the amounts mirror the calculator's own worked example only.
 */

import type { InjectionLog, Vial, WeightEntry } from "../types";

export const DEMO_USER_ID = "local-demo-user";

/** UTC ISO at `daysAgo` days before `now`, set to hour/minute UTC. */
function at(daysAgo: number, hour: number, minute: number, now: Date): string {
  const d = new Date(now.getTime());
  d.setUTCDate(d.getUTCDate() - daysAgo);
  d.setUTCHours(hour, minute, 0, 0);
  return d.toISOString();
}

function isoDaysAgo(daysAgo: number, now: Date): string {
  return at(daysAgo, 12, 0, now);
}

export interface SeedData {
  vials: Vial[];
  injections: InjectionLog[];
  weights: WeightEntry[];
}

export function buildSeedData(now: Date = new Date()): SeedData {
  const userId = DEMO_USER_ID;

  const vialA: Vial = {
    id: "demo-vial-a",
    userId,
    name: "Demo peptide — vial A",
    notes:
      "Fictional example. Concentration matches the calculator's worked example (5 mg + 2 mL).",
    vialAmount: 5,
    vialUnit: "mg",
    diluentMl: 2,
    concentrationMcgPerMl: 2500,
    concentrationMgPerMl: 2.5,
    reconstitutedAt: isoDaysAgo(9, now),
    beyondUseDate: null, // never auto-computed; enter from product instructions
    createdAt: isoDaysAgo(9, now),
    updatedAt: isoDaysAgo(9, now),
    demo: true,
  };

  const vialB: Vial = {
    id: "demo-vial-b",
    userId,
    name: "Demo peptide — vial B",
    notes: "Fictional example using a 1 mL diluent volume.",
    vialAmount: 2,
    vialUnit: "mg",
    diluentMl: 1,
    concentrationMcgPerMl: 2000,
    concentrationMgPerMl: 2,
    reconstitutedAt: isoDaysAgo(4, now),
    beyondUseDate: null,
    createdAt: isoDaysAgo(4, now),
    updatedAt: isoDaysAgo(4, now),
    demo: true,
  };

  // Completed-injection snapshots keep the amount + concentration used.
  type SeedOverrides = {
    amount: number;
    amountUnit: "mg" | "mcg";
    volumeMl: number;
    vialId?: string | null;
    vialNameSnapshot?: string | null;
    concentrationMcgPerMl?: number | null;
    concentrationMgPerMl?: number | null;
    location?: InjectionLog["location"];
    notes?: string | null;
  };
  const log = (daysAgo: number, hour: number, minute: number, over: SeedOverrides): InjectionLog => ({
    id: `demo-log-${daysAgo}-${hour}-${minute}`,
    userId,
    vialId: over.vialId ?? null,
    vialNameSnapshot: over.vialNameSnapshot ?? null,
    concentrationMcgPerMl: over.concentrationMcgPerMl ?? null,
    concentrationMgPerMl: over.concentrationMgPerMl ?? null,
    amount: over.amount,
    amountUnit: over.amountUnit,
    volumeMl: over.volumeMl,
    administeredAt: at(daysAgo, hour, minute, now),
    scheduledTimeUtc: null,
    scheduleId: null,
    location: over.location ?? null,
    notes: over.notes ?? "Fictional demo record.",
    createdAt: at(daysAgo, hour, minute, now),
    demo: true,
  });

  const injections: InjectionLog[] = [
    log(0, 7, 30, {
      vialId: vialA.id,
      vialNameSnapshot: vialA.name,
      concentrationMcgPerMl: 2500,
      concentrationMgPerMl: 2.5,
      amount: 250,
      amountUnit: "mcg",
      volumeMl: 0.1,
      location: { view: "front", x: 0.32, y: 0.62, label: "Left abdomen" },
    }),
    log(1, 7, 45, {
      vialId: vialA.id,
      vialNameSnapshot: vialA.name,
      concentrationMcgPerMl: 2500,
      concentrationMgPerMl: 2.5,
      amount: 250,
      amountUnit: "mcg",
      volumeMl: 0.1,
      location: { view: "front", x: 0.68, y: 0.6, label: "Right abdomen" },
    }),
    log(2, 8, 5, {
      vialId: vialB.id,
      vialNameSnapshot: vialB.name,
      concentrationMcgPerMl: 2000,
      concentrationMgPerMl: 2,
      amount: 200,
      amountUnit: "mcg",
      volumeMl: 0.1,
      location: { view: "front", x: 0.4, y: 0.35, label: "Left arm" },
    }),
    log(3, 7, 50, {
      vialId: vialA.id,
      vialNameSnapshot: vialA.name,
      concentrationMcgPerMl: 2500,
      concentrationMgPerMl: 2.5,
      amount: 250,
      amountUnit: "mcg",
      volumeMl: 0.1,
      location: { view: "front", x: 0.66, y: 0.64, label: "Right abdomen" },
    }),
    log(4, 8, 0, {
      vialId: vialA.id,
      vialNameSnapshot: vialA.name,
      concentrationMcgPerMl: 2500,
      concentrationMgPerMl: 2.5,
      amount: 250,
      amountUnit: "mcg",
      volumeMl: 0.1,
      location: { view: "back", x: 0.5, y: 0.6, label: "Right lower back" },
    }),
    log(6, 7, 40, {
      vialId: vialB.id,
      vialNameSnapshot: vialB.name,
      concentrationMcgPerMl: 2000,
      concentrationMgPerMl: 2,
      amount: 200,
      amountUnit: "mcg",
      volumeMl: 0.1,
      location: { view: "front", x: 0.5, y: 0.72, label: "Left thigh" },
    }),
    log(7, 7, 35, {
      vialId: vialA.id,
      vialNameSnapshot: vialA.name,
      concentrationMcgPerMl: 2500,
      concentrationMgPerMl: 2.5,
      amount: 250,
      amountUnit: "mcg",
      volumeMl: 0.1,
      location: { view: "front", x: 0.33, y: 0.61, label: "Left abdomen" },
    }),
    log(8, 8, 15, {
      vialId: vialA.id,
      vialNameSnapshot: vialA.name,
      concentrationMcgPerMl: 2500,
      concentrationMgPerMl: 2.5,
      amount: 250,
      amountUnit: "mcg",
      volumeMl: 0.1,
      location: { view: "front", x: 0.7, y: 0.33, label: "Right arm" },
    }),
    log(10, 7, 55, {
      vialId: vialB.id,
      vialNameSnapshot: vialB.name,
      concentrationMcgPerMl: 2000,
      concentrationMgPerMl: 2,
      amount: 200,
      amountUnit: "mcg",
      volumeMl: 0.1,
      location: { view: "back", x: 0.48, y: 0.78, label: "Right thigh" },
    }),
    log(12, 8, 10, {
      vialId: vialA.id,
      vialNameSnapshot: vialA.name,
      concentrationMcgPerMl: 2500,
      concentrationMgPerMl: 2.5,
      amount: 250,
      amountUnit: "mcg",
      volumeMl: 0.1,
      location: { view: "front", x: 0.35, y: 0.55, label: "Left abdomen" },
    }),
  ];

  /* Fictional weigh-ins: a plain ten-week record that drifts downward, so the
     trend chart has something legible to draw on first launch. No goal, target,
     or rate is implied — these are made-up numbers, badged "Demo" like the rest. */
  const weighIn = (daysAgo: number, weightKg: number): WeightEntry => ({
    id: `demo-weight-${daysAgo}`,
    userId,
    weightKg,
    recordedAt: at(daysAgo, 7, 15, now),
    notes: null,
    createdAt: at(daysAgo, 7, 15, now),
    demo: true,
  });

  const weights: WeightEntry[] = [
    weighIn(70, 88.4),
    weighIn(63, 87.6),
    weighIn(56, 87.1),
    weighIn(49, 86.3),
    weighIn(42, 85.9),
    weighIn(35, 85.2),
    weighIn(28, 84.6),
    weighIn(21, 84.1),
    weighIn(14, 83.4),
    weighIn(7, 82.9),
    weighIn(3, 82.5),
    weighIn(0, 82.1),
  ];

  return { vials: [vialB, vialA], injections, weights };
}
