-- Infinite Free Bet shoe model. Additive only: existing tables and rows stay.
-- Project zzlxqoiavnqpvsadfvrl. Snapshots reject updates and deletes.

alter table public.shoes alter column session_id drop not null;
alter table public.shoes add column if not exists owner_id uuid references auth.users (id) on delete cascade;
alter table public.shoes add column if not exists decks integer not null default 8;
alter table public.shoes add column if not exists cut jsonb;
alter table public.shoes add column if not exists status text not null default 'open';
alter table public.shoes add column if not exists report jsonb;

alter table public.hands add column if not exists round_id uuid;
alter table public.hands add column if not exists cards jsonb;

create table if not exists public.user_settings (
  owner_id uuid primary key references auth.users (id) on delete cascade,
  preset_id text not null,
  currency text not null default 'EUR',
  bankroll numeric not null default 0,
  kelly_fraction numeric not null default 0.5,
  min_edge numeric not null default 0,
  count_system text not null default 'hi_lo',
  cut jsonb not null,
  settings jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.settings_presets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  preset_key text not null,
  version integer not null,
  paytable_id text not null,
  body jsonb not null,
  created_at timestamptz not null default now(),
  unique (owner_id, preset_key, version)
);

create table if not exists public.rule_profiles (
  id text primary key,
  version text not null,
  fields jsonb not null,
  active boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.side_bet_paytables (
  id text primary key,
  version integer not null,
  source text not null,
  active boolean not null default false,
  payouts jsonb not null,
  help_rtp jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.shoe_card_events (
  id uuid primary key default gen_random_uuid(),
  shoe_id uuid not null references public.shoes (id) on delete cascade,
  sequence integer not null,
  round_number integer not null,
  rank text not null,
  suit text not null,
  target text not null,
  hand_index integer not null default 0,
  seen boolean not null default true,
  unique (shoe_id, sequence)
);

create table if not exists public.rounds (
  id uuid primary key default gen_random_uuid(),
  shoe_id uuid not null references public.shoes (id) on delete cascade,
  round_number integer not null,
  started_at timestamptz not null default now(),
  unique (shoe_id, round_number)
);

alter table public.hands
  drop constraint if exists hands_round_id_fkey;
alter table public.hands
  add constraint hands_round_id_fkey foreign key (round_id) references public.rounds (id) on delete set null;

create table if not exists public.actions (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  hand_index integer not null,
  action text not null,
  recommended text,
  created_at timestamptz not null default now()
);

create table if not exists public.decision_snapshots (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  shoe_id uuid references public.shoes (id) on delete cascade,
  round_number integer not null,
  paytable_id text not null,
  recommendation text not null,
  player_edge numeric,
  quality text not null,
  body jsonb not null,
  created_at timestamptz not null default now()
);

create table if not exists public.side_bet_results (
  id uuid primary key default gen_random_uuid(),
  round_id uuid not null references public.rounds (id) on delete cascade,
  paytable_id text not null,
  bet_id text not null,
  stake numeric not null,
  ev numeric,
  decision text not null,
  result numeric,
  created_at timestamptz not null default now()
);

create table if not exists public.bankroll_transactions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  shoe_id uuid references public.shoes (id) on delete set null,
  amount numeric not null,
  balance_after numeric not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.testing_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  settings_snapshot jsonb not null,
  paytable_id text not null,
  status text not null default 'running',
  created_at timestamptz not null default now()
);

create table if not exists public.simulation_shoe_results (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.testing_runs (id) on delete cascade,
  seed integer not null,
  net numeric not null,
  rounds integer not null,
  split text not null,
  unique (run_id, seed)
);

create table if not exists public.forward_test_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  shoe_id uuid references public.shoes (id) on delete set null,
  created_at timestamptz not null default now()
);

insert into public.rule_profiles (id, version, fields, active)
values ('EVOLUTION_INFINITE_FREE_BET', '2026-11-16.1', '{}'::jsonb, true)
on conflict (id) do nothing;

insert into public.side_bet_paytables (id, version, source, active, payouts, help_rtp)
values (
  'EVOLUTION_INFINITE_FREE_BET_PAYTABLE_V2',
  2,
  'USER_PROVIDED_OFFICIAL_LIVE_GAME_HELP_SCREENSHOTS',
  true,
  '{"anyPair":{"perfect":25,"colored":12,"mixed":6},"twentyOnePlusThree":{"suitedTrips":100,"straightFlush":40,"threeOfAKind":25,"straight":10,"flush":5},"hot3":{"sevenSevenSeven":100,"suited21":20,"unsuited21":4,"total20":2,"total19":1},"bustIt":{"8":250,"7":100,"6":50,"5":9,"4":2,"3":1}}'::jsonb,
  '{"scope":"fresh-shoe-only","blackjack":0.9845,"perfectPairs":0.959,"twentyOnePlusThree":0.9371,"hot3":0.946,"bustIt":0.9412}'::jsonb
)
on conflict (id) do nothing;

-- Inactive historical paytable. The app does not read it for live recommendations.
insert into public.side_bet_paytables (id, version, source, active, payouts)
values (
  'EVOLUTION_INFINITE_SIDE_BET_PAYTABLE_V1',
  1,
  'RETIRED_USER_SCREENSHOT',
  false,
  '{"note":"retired","anyPairOther":8,"trips":30,"bustFive":7}'::jsonb
)
on conflict (id) do nothing;

create or replace function public.reject_snapshot_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception 'decision snapshots are immutable';
end;
$$;

drop trigger if exists decision_snapshots_immutable on public.decision_snapshots;
create trigger decision_snapshots_immutable
  before update or delete on public.decision_snapshots
  for each row execute function public.reject_snapshot_mutation();

alter table public.user_settings enable row level security;
alter table public.settings_presets enable row level security;
alter table public.rule_profiles enable row level security;
alter table public.side_bet_paytables enable row level security;
alter table public.shoe_card_events enable row level security;
alter table public.rounds enable row level security;
alter table public.actions enable row level security;
alter table public.decision_snapshots enable row level security;
alter table public.side_bet_results enable row level security;
alter table public.bankroll_transactions enable row level security;
alter table public.testing_runs enable row level security;
alter table public.simulation_shoe_results enable row level security;
alter table public.forward_test_sessions enable row level security;

create policy "user_settings_owner" on public.user_settings
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "settings_presets_owner" on public.settings_presets
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "rule_profiles_read" on public.rule_profiles for select using (true);
create policy "paytables_read" on public.side_bet_paytables for select using (true);
create policy "snapshots_insert" on public.decision_snapshots
  for insert with check (auth.uid() = owner_id);
create policy "snapshots_select" on public.decision_snapshots
  for select using (auth.uid() = owner_id);
create policy "bankroll_tx_owner" on public.bankroll_transactions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "testing_runs_owner" on public.testing_runs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);
create policy "forward_sessions_owner" on public.forward_test_sessions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "shoes_owner_direct" on public.shoes
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

create policy "events_via_shoe" on public.shoe_card_events
  for all using (
    exists (select 1 from public.shoes s where s.id = shoe_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.shoes s where s.id = shoe_id and s.owner_id = auth.uid())
  );
create policy "rounds_via_shoe" on public.rounds
  for all using (
    exists (select 1 from public.shoes s where s.id = shoe_id and s.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.shoes s where s.id = shoe_id and s.owner_id = auth.uid())
  );
create policy "actions_via_round" on public.actions
  for all using (
    exists (
      select 1 from public.rounds r
      join public.shoes s on s.id = r.shoe_id
      where r.id = round_id and s.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.rounds r
      join public.shoes s on s.id = r.shoe_id
      where r.id = round_id and s.owner_id = auth.uid()
    )
  );
create policy "side_results_via_round" on public.side_bet_results
  for all using (
    exists (
      select 1 from public.rounds r
      join public.shoes s on s.id = r.shoe_id
      where r.id = round_id and s.owner_id = auth.uid()
    )
  ) with check (
    exists (
      select 1 from public.rounds r
      join public.shoes s on s.id = r.shoe_id
      where r.id = round_id and s.owner_id = auth.uid()
    )
  );
create policy "sim_results_via_run" on public.simulation_shoe_results
  for all using (
    exists (select 1 from public.testing_runs t where t.id = run_id and t.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.testing_runs t where t.id = run_id and t.owner_id = auth.uid())
  );
