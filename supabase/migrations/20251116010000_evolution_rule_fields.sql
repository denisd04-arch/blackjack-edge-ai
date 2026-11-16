-- Extend game_profiles.rules JSON documentation (no destructive change).
-- Application stores charlieSixCard, maxSplitsPerHand, ruleSourceIds in rules blob.

comment on column public.game_profiles.rules is
  'Evolution rule JSON: includes pushOn22, freeSplitOn, freeDoubleOn, charlieSixCard, maxSplitsPerHand, ruleSourceIds';