-- Pepcal — daily protein & water intake + companion targets.
--
-- Record-keeping only: a row is what the user logged for one calendar day,
-- measured (at display time) against targets THEY configured in settings.
-- The app suggests no intake; the defaults live in src/lib/domain/intake.ts.
-- One row per (user, day) — the UI upserts, there is no separate id.
--
-- Keep in lockstep with:
--   src/lib/data/types.ts                       (DailyIntake, UserSettings)
--   src/lib/data/supabase/supabaseRepository.ts (DbDailyIntake, DbSettings)

create table if not exists public.daily_intake (
  user_id     uuid not null references auth.users (id) on delete cascade,
  day         date not null,
  protein_g   numeric not null default 0 check (protein_g >= 0),
  water_ml    numeric not null default 0 check (water_ml >= 0),
  updated_at  timestamptz not null default now(),
  demo        boolean not null default false,
  primary key (user_id, day)
);

create index daily_intake_user_day_idx on public.daily_intake (user_id, day desc);

alter table public.daily_intake enable row level security;

create policy "own rows" on public.daily_intake for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.daily_intake to authenticated;

/* Companion targets — nullable so existing accounts keep working and the UI
   falls back to the domain defaults. */

alter table public.user_settings
  add column if not exists protein_target_g numeric check (protein_target_g > 0),
  add column if not exists water_target_ml  numeric check (water_target_ml > 0);
