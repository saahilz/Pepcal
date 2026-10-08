import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

describe("initial Supabase migration", () => {
  it("creates injection logs before occurrences reference them", () => {
    const sql = readFileSync(resolve(process.cwd(), "supabase/migrations/0001_init.sql"), "utf8");
    const injectionLogs = sql.indexOf("create table if not exists public.injection_logs");
    const occurrences = sql.indexOf("create table if not exists public.occurrences");

    expect(injectionLogs).toBeGreaterThanOrEqual(0);
    expect(occurrences).toBeGreaterThanOrEqual(0);
    expect(injectionLogs).toBeLessThan(occurrences);
  });
});
