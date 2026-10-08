-- Pepcal MVP — initial schema
-- Runs in Supabase (Postgres + RLS). Every health-data table is user-scoped
-- via user_id = auth.uid() and row-level security; unauthenticated access
-- returns nothing. Keep in lockstep with:
--   src/lib/data/types.ts            (domain entities)
--   src/lib/data/supabase/*.ts       (column mapping)
--   supabase/seed-demo.sql           (clearly-labelled fictional demo data)

create extension if not exists pgcrypto;

/* ------------------------------------------------------------------ */
/* updated_at maintenance                                             */
/* ------------------------------------------------------------------ */

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

/* ------------------------------------------------------------------ */
/* user settings (one row per auth user, created on signup)           */
/* ------------------------------------------------------------------ */

create table if not exists public.user_settings (
  user_id           uuid primary key references auth.users (id) on delete cascade,
  time_zone         text,                -- IANA name; null = browser default
  travel            text not null default 'homeTimeZone'
                    check (travel in ('homeTimeZone', 'currentTimeZone')),
  reminders_enabled boolean not null default false,
  updated_at        timestamptz not null default now()
);

create trigger user_settings_updated_at
  before update on public.user_settings
  for each row execute function public.set_updated_at();

-- Ensure a settings row exists the moment an account is created.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.user_settings (user_id)
  values (new.id)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

/* ------------------------------------------------------------------ */
/* vials — peptide / reconstitution records                           */
/* ------------------------------------------------------------------ */

create table if not exists public.vials (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users (id) on delete cascade,
  name                      text not null,
  notes                     text,
  vial_amount               numeric not null check (vial_amount > 0),
  vial_unit                 text not null check (vial_unit in ('mg', 'mcg')),
  diluent_ml                numeric check (diluent_ml > 0),
  concentration_mcg_per_ml  numeric check (concentration_mcg_per_ml > 0),
  concentration_mg_per_ml   numeric check (concentration_mg_per_ml > 0),
  reconstituted_at          timestamptz,
  beyond_use_date           date,      -- user-entered; the app never computes this
  created_at                timestamptz not null default now(),
  updated_at                timestamptz not null default now(),
  demo                      boolean not null default false
);

create index vials_user_created_idx on public.vials (user_id, created_at desc);
create trigger vials_updated_at
  before update on public.vials
  for each row execute function public.set_updated_at();

/* ------------------------------------------------------------------ */
/* body_sites — authored body-map locations (phase 2)                 */
/* ------------------------------------------------------------------ */

create table if not exists public.body_sites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  view        text check (view in ('front', 'back')),
  x           numeric check (x between 0 and 1),
  y           numeric check (y between 0 and 1),
  label       text,             -- the accessible text alternative
  created_at  timestamptz not null default now(),
  check (label is not null or (x is not null and y is not null and view is not null))
);

create index body_sites_user_created_idx on public.body_sites (user_id, created_at desc);

/* ------------------------------------------------------------------ */
/* schedules + occurrences — reminders are wired in the next phase     */
/* ------------------------------------------------------------------ */

create table if not exists public.schedules (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  vial_id             uuid references public.vials (id) on delete set null,
  vial_name_snapshot  text,
  amount              numeric not null check (amount > 0),
  amount_unit         text not null check (amount_unit in ('mg', 'mcg')),
  pattern             jsonb not null,   -- {kind:'weekdays'|'everyXDays', ...}
  start_date          date not null,
  end_date            date,
  time_zone           text not null,    -- IANA name of the schedule's home zone
  travel              text not null default 'homeTimeZone'
                      check (travel in ('homeTimeZone', 'currentTimeZone')),
  enabled             boolean not null default true,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  demo                boolean not null default false
);

create index schedules_user_idx on public.schedules (user_id, enabled);
create trigger schedules_updated_at
  before update on public.schedules
  for each row execute function public.set_updated_at();

/* ------------------------------------------------------------------ */
/* injection_logs — completed administrations                         */
/* ------------------------------------------------------------------ */

create table if not exists public.injection_logs (
  id                        uuid primary key default gen_random_uuid(),
  user_id                   uuid not null references auth.users (id) on delete cascade,
  vial_id                   uuid references public.vials (id) on delete set null,
  body_site_id              uuid references public.body_sites (id) on delete set null,
  -- Snapshots taken at administration time so edits to the vial never
  -- rewrite what was actually used.
  vial_name_snapshot        text,
  concentration_mcg_per_ml  numeric,
  concentration_mg_per_ml   numeric,
  amount                    numeric not null check (amount > 0),
  amount_unit               text not null check (amount_unit in ('mg', 'mcg')),
  volume_ml                 numeric check (volume_ml > 0),
  administered_at           timestamptz not null,   -- actual time
  scheduled_time_utc        timestamptz,            -- planned time, if any (kept separate)
  schedule_id               uuid references public.schedules (id) on delete set null,
  location                  jsonb,                  -- denormalised {view,x,y,label}
  notes                     text,
  created_at                timestamptz not null default now(),
  demo                      boolean not null default false
);

create index injection_logs_user_time_idx on public.injection_logs (user_id, administered_at desc);
create index injection_logs_vial_idx on public.injection_logs (vial_id);

-- A schedule instant must never produce two "taken" completion records.
create unique index injection_logs_schedule_completion_once
  on public.injection_logs (schedule_id, scheduled_time_utc)
  where schedule_id is not null and scheduled_time_utc is not null;

/* ------------------------------------------------------------------ */
/* occurrences — reminders                                             */
/* ------------------------------------------------------------------ */

create table if not exists public.occurrences (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references auth.users (id) on delete cascade,
  schedule_id         uuid not null references public.schedules (id) on delete cascade,
  scheduled_for_utc   timestamptz not null,
  status              text not null default 'scheduled'
                      check (status in ('scheduled', 'taken', 'skipped', 'snoozed', 'dismissed')),
  completion_log_id   uuid references public.injection_logs (id) on delete set null,
  snoozed_until_utc   timestamptz,
  created_at          timestamptz not null default now(),
  demo                boolean not null default false,
  -- One occurrence per schedule instant: no duplicate reminders.
  unique (schedule_id, scheduled_for_utc)
);

create index occurrences_due_idx on public.occurrences (user_id, scheduled_for_utc, status);
create index occurrences_taken_dupe_idx on public.occurrences (schedule_id, status) where status = 'taken';

/* ------------------------------------------------------------------ */
/* notifications                                                       */
/* ------------------------------------------------------------------ */

create table if not exists public.push_subscriptions (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references auth.users (id) on delete cascade,
  endpoint          text not null unique,
  subscription_json jsonb not null,
  created_at        timestamptz not null default now()
);

create table if not exists public.notification_deliveries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  occurrence_id uuid references public.occurrences (id) on delete set null,
  channel       text not null check (channel in ('push', 'email', 'inapp')),
  delivered_at  timestamptz not null default now(),
  ok            boolean not null,
  error         text
);

create index notification_deliveries_occurrence_idx on public.notification_deliveries (occurrence_id);

/* ------------------------------------------------------------------ */
/* Row-level security                                                  */
/* ------------------------------------------------------------------ */

alter table public.user_settings          enable row level security;
alter table public.vials                  enable row level security;
alter table public.body_sites             enable row level security;
alter table public.schedules              enable row level security;
alter table public.occurrences            enable row level security;
alter table public.injection_logs         enable row level security;
alter table public.push_subscriptions     enable row level security;
alter table public.notification_deliveries enable row level security;

-- One policy per table: every operation is scoped to the signed-in user. An
-- anonymous or cross-user request matches zero rows. (unauthenticated is not
-- granted any table access beyond what Supabase's anon role already denies.)

do $$
declare t text;
begin
  foreach t in array array[
    'public.user_settings',
    'public.vials',
    'public.body_sites',
    'public.schedules',
    'public.occurrences',
    'public.injection_logs',
    'public.push_subscriptions',
    'public.notification_deliveries'
  ]
  loop
    execute format(
      'create policy "own rows" on %I.%I for all to authenticated
         using (user_id = auth.uid())
         with check (user_id = auth.uid());',
      split_part(t, '.', 1), split_part(t, '.', 2)
    );
  end loop;
end $$;

-- Grant CRUD on our tables to the authenticated role (already implied by
-- policies + default privileges in Supabase, stated here for clarity).
grant select, insert, update, delete on all tables in schema public to authenticated;
