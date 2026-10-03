@AGENTS.md

# Pepcal project notes

Peptide reconstitution calculator + injection tracker. Calculation & record-keeping
only — never recommend doses, routes, schedules, or sites.

## Status
Core slice shipped: calculator, vial records, injection logging, dashboard, history,
body-weight tracking (`/weight` — readings list + hand-rolled SVG trend chart).
**Not yet built (phase 2):** scheduling/reminders, body map, calendar/CSV export, web
push, Supabase auth screens, per-user access tests. Occurrence/notification tables and
types already exist and are unused.

## Commands
- `npm run dev` · `npm run build` · `npm test` (Vitest) · `npm run lint`

## Where things live
- Pure, tested domain math: `src/lib/domain/` (calculator, syringe, units, weight). Unit
  tests co-located `*.test.ts` — 53 tests.
- Data model types mirror the SQL schema 1:1: `src/lib/data/types.ts` ↔
  `supabase/migrations/*.sql` ↔ `src/lib/data/supabase/supabaseRepository.ts`.
  Keep them in lockstep when adding columns. New tables go in a new numbered migration
  rather than editing an already-applied one.
- Charts are hand-rolled SVG (no chart library — the app ships zero UI dependencies).
  Weight is stored canonically in kilograms; kg/lb is a display choice.
- Backend is selected at runtime: Supabase env vars present → supabase repo, else the
  localStorage demo repo (fictional seed, clearly badged "Demo"). See
  `src/lib/data/index.ts`.
- Scheduling must store UTC instants + IANA zone names separately (see types) and
  preserve concentration/amount snapshots on injection logs.

## Conventions
- Data UI is client-rendered ("use client"); query params must go through
  `useSearchParams` inside a `<Suspense>`, not `window.location`.
- Zero-warning ESLint; new react-hooks rules ban synchronous `setState` in effects.
- `@/*` aliases `src/*`. Class-based dark mode via `.dark` on `<html>`.
