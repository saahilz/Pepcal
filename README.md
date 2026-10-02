# Pepcal — peptide reconstitution calculator & injection tracker

A responsive, mobile-first web app for **adults who self-manage reconstituted peptide
injections**. It calculates concentrations and draw volumes, keeps vial records, logs
injections (with a snapshot of what was used), and will schedule reminders with a
documenting-only body map.

Pepcal is a **calculation and record-keeping tool — not a prescribing service.** It
does not recommend peptides, doses, routes, schedules, or injection sites, and it never
picks a dose, diluent volume, storage condition, or beyond-use date for you.

> **Status:** *core slice* — calculator, vial records, injection logging, dashboard,
> and history are working and tested. Scheduling/reminders, the interactive body map,
> calendar/CSV export, and web-push are the next phase (see [Roadmap](#roadmap)).

---

## Run it

```bash
npm install
npm run dev        # http://localhost:3000
```

**No accounts, keys, or databases are required to try it.** Without any environment
variables the app boots in **demo mode**: data lives only in your browser
(localStorage), seeded with clearly-labelled fictional records (badged “Demo” and
explained in Settings), and deletable from Settings → *Delete all my data*.

To connect the real backend, copy `.env.example` → `.env.local` and add your Supabase
project keys (below). The same UI then reads/writes your authenticated Postgres tables.

## Scripts

| Script                | Purpose                                    |
| --------------------- | ------------------------------------------ |
| `npm run dev`         | Local dev server                           |
| `npm run build`       | Production build                           |
| `npm start`           | Serve the production build                 |
| `npm run lint`        | ESLint (zero-warning policy)               |
| `npm test`            | Vitest unit tests (domain + scheduling)    |

## What works now

- **Reconstitution calculator** — mg/mcg entry with explicit units, diluent mL, per-dose
  amount, optional U-100 insulin syringe scale, transparent formulas, warnings for
  over-vial and unmeasurable/over-capacity draws, and the required confirm-with-a-
  clinician message. Results can be saved straight to a vial record or logged as taken.
- **Vial records** — add, edit, delete; name, amount, diluent, calculated concentration,
  reconstitution time, and an **opt-in beyond-use date that is never auto-computed**.
- **Injection logging** — actual time (stored UTC), amount, linked vial with a stored
  **snapshot of the name + concentration used** (vial edits never rewrite history), free-
  text location with previously-used suggestions, notes. Edit and delete supported.
- **Dashboard** — quick actions, today/all-time/active counts, recent injections, active
  peptides.
- **History** — all completed injections, filter by vial, edit/delete.
- **Theme + PWA-ready shell** — class-based light/dark with OS-preference default,
  no-flash inline script, mobile-first navigation with 44px+ touch targets.

Domain math lives in pure, unit-tested modules: `src/lib/domain/units.ts`,
`calculator.ts`, `syringe.ts` (29 tests over conversions, validation, and syringe
markings). See `src/lib/domain/*.test.ts`.

## Architecture

```
src/
  app/                      Next.js App Router pages (all client-rendered data UI)
  components/               ui primitives, shell/nav, feature components
  lib/
    domain/                 PURE logic — calculator, syringe, units (no I/O)
    data/
      types.ts              entity models (mirror the SQL schema)
      repository.ts         Repository interface + input types
      index.ts              backend selection (Supabase env present → supabase, else demo)
      local/                localStorage demo repository + fictional seed
      supabase/             supabase-js repository + lazy client
    format.ts               date/number display helpers
```

The UI talks only to the `Repository` interface. Two implementations are
drop-in interchangeable:

| | **Demo (default)** | **Supabase** |
|---|---|---|
| Trigger | no env vars | `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_ANON_KEY` |
| Auth | on-device “local demo” identity | Supabase Auth, per-user rows enforced by **RLS** |
| Storage | localStorage (this browser) | Postgres (Supabase) |
| Data | seeded fictional demo data, wipeable | user’s own |

## Setting up Supabase

1. Create a project at [supabase.com](https://supabase.com) (enable Postgres).
2. Apply the migrations — in the Supabase SQL editor paste the contents of
   `supabase/migrations/0001_init.sql` (or run `supabase db push` from the CLI).
   This creates every table, the signup trigger, and **row-level-security policies
   scoping all data to `auth.uid()`**.
3. In **Authentication → Providers**, enable **Google**. Create a Google OAuth Web
   client in Google Cloud, then enter its client ID and secret only in Supabase's Google
   provider settings. Keep provider credentials out of this repository and out of browser
   environment variables.
4. In **Authentication → URL Configuration**, set the Site URL to the app's origin and add
   these redirect allow-list entries: `http://localhost:3000`, `http://127.0.0.1:3000`, and
   the production HTTPS origin. Google OAuth must also allow the Supabase callback URL shown
   in the provider settings.
5. Copy `.env.example` → `.env.local`; paste only the project URL and **anon** key from
   **Project Settings → API**. Never expose a service-role key or Google client secret.
6. Restart `npm run dev` after changing environment variables. The banner disappears and
   Google sign-in is enforced.

No real credentials are stored in this repository. A real login requires the Google Cloud and
Supabase dashboard configuration above; without both public Supabase variables, Pepcal remains
in local demo mode and makes no Supabase Auth requests.

> RLS note: policies are `for all … to authenticated using (user_id = auth.uid())`
> on every health table — a cross-user or anonymous request matches zero rows. The
> repository still filters by user id as defence in depth.

## Deployment (Vercel)

1. Push this repo to GitHub and import it into Vercel (framework: Next.js — auto).
2. Add the two `NEXT_PUBLIC_SUPABASE_*` env vars in Project → Settings → Environment
   Variables.
3. Deploy. Because the app is Next App Router, each page is server-rendered and
   served over HTTPS automatically; the repository is resolved per environment at
   runtime on the client.

## Privacy & security posture

- Health data requires authentication and is scoped per-user via RLS.
- No analytics, no URLs, no logs carry peptide names or amounts in the Supabase path.
- Demo mode never transmits anything; delete-all wipes the browser store.
- **No HIPAA-compliance claim is made** without a separate assessment.
- Data is never shared with advertising services.

## Roadmap (next phase)

- Scheduling: weekday / every-X-days patterns, UTC storage + named time zone, DST
  handling, travel “home vs current zone” choice, Mark-taken / Snooze / Skip with
  duplicate prevention.
- Interactive front/back **body map** with per-site last-used tracking.
- Calendar + status filters + **CSV export**.
- **Web push** (VAPID, service worker) with privacy-preserving notification text
  (“You have a scheduled reminder.”), in-app reminders.
- Supabase **auth screens**, account deletion flow polish, per-user access tests.
