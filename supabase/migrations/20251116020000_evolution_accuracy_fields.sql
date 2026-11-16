-- Additive columns for Evolution accuracy work. No drops, no rewrites of existing rows.

alter table public.decisions
  add column if not exists amount_at_risk numeric,
  add column if not exists definitive boolean;

alter table public.simulation_runs
  add column if not exists result jsonb;

comment on column public.decisions.amount_at_risk is
  'Original-bet units actually at risk for the recorded action (free actions stay at 1).';

comment on column public.decisions.definitive is
  'False when the engine refused a recommendation because rules were incomplete.';

comment on column public.simulation_runs.result is
  'Model-simulation payload. Not a verified house edge.';

comment on column public.game_profiles.rules is
  'Evolution rule JSON: pushOn22, freeSplitOn, freeDoubleOn, charlieSixCard, maxSplitsPerHand, dealerPeeksForBlackjack, ruleSourceIds. Null fields stay incomplete.';
