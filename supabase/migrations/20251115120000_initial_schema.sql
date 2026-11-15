-- BLACKJACK EDGE AI — initial schema draft (review before remote apply)
-- RLS: all tenant data scoped by auth.uid()

create extension if not exists "pgcrypto";

-- Profiles: Evolution rule sets; incomplete flag blocks definitive EV in app layer
create table public.game_profiles (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  variant text not null check (variant in ('evolution_free_bet', 'evolution_infinite_free_bet')),
  label_de text not null,
  rules jsonb not null default '{}',
  counting_systems text[] not null default '{hi_lo}',
  incomplete boolean not null default true,
  missing_fields text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references public.game_profiles (id) on delete restrict,
  status text not null default 'active' check (status in ('active', 'closed')),
  started_at timestamptz not null default now(),
  ended_at timestamptz
);

create table public.shoes (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  decks integer,
  penetration numeric,
  created_at timestamptz not null default now()
);

create table public.hands (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  shoe_id uuid references public.shoes (id) on delete set null,
  hand_index integer not null,
  created_at timestamptz not null default now()
);

create table public.cards_played (
  id uuid primary key default gen_random_uuid(),
  hand_id uuid not null references public.hands (id) on delete cascade,
  rank text not null,
  suit text,
  source text not null default 'manual',
  played_at timestamptz not null default now()
);

create table public.count_snapshots (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  system text not null check (system in ('hi_lo', 'omega_ii')),
  running_count integer not null,
  true_count numeric,
  cards_seen integer not null default 0,
  captured_at timestamptz not null default now()
);

create table public.decisions (
  id uuid primary key default gen_random_uuid(),
  hand_id uuid not null references public.hands (id) on delete cascade,
  action text not null,
  ev_best numeric,
  ev_by_action jsonb,
  incomplete_reason text,
  recorded_at timestamptz not null default now()
);

create table public.side_bet_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.sessions (id) on delete cascade,
  bet_type text not null,
  stake numeric not null,
  outcome numeric,
  recorded_at timestamptz not null default now()
);

create table public.bankroll_ledger (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  delta numeric not null,
  balance_after numeric not null,
  note text,
  recorded_at timestamptz not null default now()
);

create table public.simulation_runs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  profile_id uuid not null references public.game_profiles (id) on delete restrict,
  mode text not null check (mode in ('backtest', 'forwardtest')),
  params jsonb not null default '{}',
  status text not null default 'pending',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table public.ai_explanations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  source_type text not null,
  source_id uuid,
  engine_payload jsonb not null,
  explanation_de text not null,
  created_at timestamptz not null default now()
);

create table public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  event_name text not null,
  payload jsonb not null default '{}',
  created_at timestamptz not null default now()
);

alter table public.game_profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.shoes enable row level security;
alter table public.hands enable row level security;
alter table public.cards_played enable row level security;
alter table public.count_snapshots enable row level security;
alter table public.decisions enable row level security;
alter table public.side_bet_logs enable row level security;
alter table public.bankroll_ledger enable row level security;
alter table public.simulation_runs enable row level security;
alter table public.ai_explanations enable row level security;
alter table public.analytics_events enable row level security;

create policy "profiles_select_own" on public.game_profiles
  for select using (auth.uid() = owner_id);
create policy "profiles_mutate_own" on public.game_profiles
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "sessions_owner" on public.sessions
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "bankroll_owner" on public.bankroll_ledger
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "simulations_owner" on public.simulation_runs
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "ai_owner" on public.ai_explanations
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

create policy "analytics_owner" on public.analytics_events
  for all using (auth.uid() = owner_id) with check (auth.uid() = owner_id);

-- Child tables: access via session ownership
create policy "shoes_via_session" on public.shoes for all using (
  exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid())
);
create policy "hands_via_session" on public.hands for all using (
  exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid())
);
create policy "cards_via_hand" on public.cards_played for all using (
  exists (
    select 1 from public.hands h
    join public.sessions s on s.id = h.session_id
    where h.id = hand_id and s.owner_id = auth.uid()
  )
);
create policy "counts_via_session" on public.count_snapshots for all using (
  exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid())
);
create policy "decisions_via_hand" on public.decisions for all using (
  exists (
    select 1 from public.hands h
    join public.sessions s on s.id = h.session_id
    where h.id = hand_id and s.owner_id = auth.uid()
  )
);
create policy "side_bets_via_session" on public.side_bet_logs for all using (
  exists (select 1 from public.sessions s where s.id = session_id and s.owner_id = auth.uid())
);