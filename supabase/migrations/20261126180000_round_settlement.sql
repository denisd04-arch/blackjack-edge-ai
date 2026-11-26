-- NOT APPLIED. Additive columns for live settlement sync.
-- This agent did not run the file against production.
-- Existing owner policies stay. A user still reads and writes only their rows.

alter table public.rounds add column if not exists participation jsonb;
alter table public.rounds add column if not exists settlement jsonb;
alter table public.rounds add column if not exists insurance numeric;
alter table public.rounds add column if not exists settlement_key text;
alter table public.shoes add column if not exists archived_at timestamptz;

create unique index if not exists rounds_settlement_key_unique
  on public.rounds (shoe_id, settlement_key)
  where settlement_key is not null;

alter table public.rounds enable row level security;
alter table public.shoes enable row level security;

-- Owner check is the same predicate the existing shoe policy uses.
-- Repeated here so a review can see it without opening the earlier migration.
-- auth.uid() = owner_id
