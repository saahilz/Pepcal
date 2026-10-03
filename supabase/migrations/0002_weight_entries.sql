-- Pepcal — body-weight records.
--
-- Record-keeping only: a row is what the user measured. There is deliberately no
-- goal, target, or direction column — the app never sets or judges one.
-- Weight is stored canonically in kilograms so a trend line never mixes scales;
-- kg/lb is a display choice made at read time (see src/lib/domain/weight.ts).
--
-- Keep in lockstep with:
--   src/lib/data/types.ts                    (WeightEntry)
--   src/lib/data/supabase/supabaseRepository.ts (DbWeightEntry + mapping)

create table if not exists public.weight_entries (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references auth.users (id) on delete cascade,
  weight_kg    numeric not null check (weight_kg > 0),
  recorded_at  timestamptz not null,
  notes        text,
  created_at   timestamptz not null default now(),
  demo         boolean not null default false
);

create index weight_entries_user_time_idx on public.weight_entries (user_id, recorded_at);

alter table public.weight_entries enable row level security;

create policy "own rows" on public.weight_entries for all to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update, delete on public.weight_entries to authenticated;
