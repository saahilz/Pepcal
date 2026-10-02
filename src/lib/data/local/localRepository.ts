/**
 * localStorage-backed demo repository.
 *
 * Selected when Supabase env vars are absent. Data stays in this browser
 * only — no network, no account. Seeded with clearly-labelled fictional data
 * on first run and wipeable from Settings.
 *
 * The persistence layer is deliberately thin: a versioned JSON envelope under
 * one key, re-read on every call so multiple tabs stay roughly consistent.
 */

import { newId } from "../ids";
import type {
  InjectionInput,
  InjectionLog,
  Repository,
  UserRef,
  UserSettings,
  Vial,
  VialInput,
  WeightEntry,
  WeightInput,
} from "../repository";
import { buildSeedData, DEMO_USER_ID } from "./seed";

const KEY = "pepcal.demo.db.v1";

interface Envelope {
  vials: Vial[];
  injections: InjectionLog[];
  weights: WeightEntry[];
  settings: UserSettings;
}

const DEMO_USER: UserRef = { id: DEMO_USER_ID, name: "Local demo account", isDemo: true };

function detectTimeZone(): string | null {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? null;
  } catch {
    return null;
  }
}

function emptySettings(): UserSettings {
  return {
    userId: DEMO_USER_ID,
    timeZone: detectTimeZone(),
    travel: "homeTimeZone",
    remindersEnabled: false,
    updatedAt: new Date().toISOString(),
  };
}

function writeDb(db: Envelope): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
  } catch (err) {
    // Quota / private-mode write failures must not crash the app.
    console.warn("Pepcal: could not persist demo data to localStorage", err);
  }
}

function readDb(): Envelope {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<Envelope>;
      if (parsed && Array.isArray(parsed.vials) && Array.isArray(parsed.injections)) {
        return {
          vials: parsed.vials,
          injections: parsed.injections,
          // Stores written before weight tracking existed have no `weights`
          // key; seed the fictional series rather than showing an empty chart.
          weights: Array.isArray(parsed.weights) ? parsed.weights : buildSeedData().weights,
          settings: { ...emptySettings(), ...(parsed.settings ?? {}) },
        };
      }
    }
  } catch {
    // Fall through to a fresh seed on unreadable/corrupt data.
  }
  const seeded = buildSeedData();
  const db: Envelope = {
    vials: seeded.vials,
    injections: seeded.injections,
    weights: seeded.weights,
    settings: emptySettings(),
  };
  writeDb(db);
  return db;
}

export const localDemoRepository: Repository = {
  kind: "demo",

  async currentUser(): Promise<UserRef | null> {
    return DEMO_USER;
  },

  async signOut(): Promise<void> {
    // Demo mode has no server session to end.
  },

  async signInWithGoogle(): Promise<void> {
    throw new Error("Google sign-in is only available when Supabase is configured.");
  },

  async listVials(): Promise<Vial[]> {
    const { vials } = readDb();
    return [...vials].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  },

  async getVial(id: string): Promise<Vial | null> {
    const { vials } = readDb();
    return vials.find((v) => v.id === id) ?? null;
  },

  async saveVial(input: VialInput & { id?: string }): Promise<Vial> {
    const db = readDb();
    const now = new Date().toISOString();
    if (input.id) {
      const existing = db.vials.find((v) => v.id === input.id);
      if (!existing) throw new Error(`Vial ${input.id} not found`);
      const updated: Vial = {
        ...existing,
        ...input,
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: now,
      };
      db.vials = db.vials.map((v) => (v.id === input.id ? updated : v));
      writeDb(db);
      return updated;
    }
    const created: Vial = {
      id: newId(),
      userId: DEMO_USER_ID,
      createdAt: now,
      updatedAt: now,
      demo: false,
      ...input,
    };
    db.vials.push(created);
    writeDb(db);
    return created;
  },

  async deleteVial(id: string): Promise<void> {
    const db = readDb();
    db.vials = db.vials.filter((v) => v.id !== id);
    // Injection logs are kept (they snapshot their own copy of vial data) but
    // their live vial link is cleared so the UI never points at a missing row.
    db.injections = db.injections.map((i) => (i.vialId === id ? { ...i, vialId: null } : i));
    writeDb(db);
  },

  async listInjections(opts: { limit?: number; vialId?: string } = {}): Promise<InjectionLog[]> {
    const { injections } = readDb();
    let rows = [...injections].sort((a, b) => b.administeredAt.localeCompare(a.administeredAt));
    if (opts.vialId) rows = rows.filter((i) => i.vialId === opts.vialId);
    if (opts.limit) rows = rows.slice(0, opts.limit);
    return rows;
  },

  async saveInjection(input: InjectionInput & { id?: string }): Promise<InjectionLog> {
    const db = readDb();
    const now = new Date().toISOString();
    if (input.id) {
      const existing = db.injections.find((i) => i.id === input.id);
      if (!existing) throw new Error(`Injection ${input.id} not found`);
      const updated: InjectionLog = { ...existing, ...input, id: existing.id, createdAt: existing.createdAt };
      db.injections = db.injections.map((i) => (i.id === input.id ? updated : i));
      writeDb(db);
      return updated;
    }
    const created: InjectionLog = {
      id: newId(),
      userId: DEMO_USER_ID,
      demo: false,
      createdAt: now,
      ...input,
    };
    db.injections.push(created);
    writeDb(db);
    return created;
  },

  async deleteInjection(id: string): Promise<void> {
    const db = readDb();
    db.injections = db.injections.filter((i) => i.id !== id);
    writeDb(db);
  },

  async listWeights(): Promise<WeightEntry[]> {
    const { weights } = readDb();
    return [...weights].sort((a, b) => a.recordedAt.localeCompare(b.recordedAt));
  },

  async saveWeight(input: WeightInput & { id?: string }): Promise<WeightEntry> {
    const db = readDb();
    const now = new Date().toISOString();
    if (input.id) {
      const existing = db.weights.find((w) => w.id === input.id);
      if (!existing) throw new Error(`Weight entry ${input.id} not found`);
      const updated: WeightEntry = {
        ...existing,
        ...input,
        id: existing.id,
        createdAt: existing.createdAt,
      };
      db.weights = db.weights.map((w) => (w.id === input.id ? updated : w));
      writeDb(db);
      return updated;
    }
    const created: WeightEntry = {
      id: newId(),
      userId: DEMO_USER_ID,
      demo: false,
      createdAt: now,
      ...input,
    };
    db.weights.push(created);
    writeDb(db);
    return created;
  },

  async deleteWeight(id: string): Promise<void> {
    const db = readDb();
    db.weights = db.weights.filter((w) => w.id !== id);
    writeDb(db);
  },

  async getSettings(): Promise<UserSettings> {
    return readDb().settings;
  },

  async updateSettings(
    patch: Partial<Pick<UserSettings, "timeZone" | "travel" | "remindersEnabled">>
  ): Promise<UserSettings> {
    const db = readDb();
    db.settings = { ...db.settings, ...patch, updatedAt: new Date().toISOString() };
    writeDb(db);
    return db.settings;
  },

  async resetToDemoData(): Promise<void> {
    const seeded = buildSeedData();
    writeDb({
      vials: seeded.vials,
      injections: seeded.injections,
      weights: seeded.weights,
      settings: emptySettings(),
    });
  },

  async deleteAllUserData(): Promise<void> {
    writeDb({ vials: [], injections: [], weights: [], settings: emptySettings() });
  },

  async listSchedules() {
    return [];
  },
};
