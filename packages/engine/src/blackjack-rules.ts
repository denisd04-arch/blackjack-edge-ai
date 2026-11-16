import type { GameProfile, RuleProfileFields } from "./types";

export interface ResolvedBlackjackRules {
  dealerHitsSoft17: boolean;
  /** Null when the split tree is not verified — pair decisions must stay incomplete. */
  doubleAfterSplit: boolean | null;
  resplitAces: boolean | null;
  pushOn22: boolean;
  charlieSixCard: boolean;
  maxSplitsPerHand: number | null;
  blackjackPayout: number;
  freeDoubleOn: RuleProfileFields["freeDoubleOn"];
  freeSplitOn: RuleProfileFields["freeSplitOn"];
  allowDouble: boolean;
  /** False when split rules are unverified. */
  allowSplit: boolean;
  dealerPeeksForBlackjack: boolean;
}

const SPLIT_FIELDS = [
  "doubleAfterSplit",
  "resplitAces",
  "maxSplitsPerHand",
] as const;

export function splitRulesUnresolved(
  rules: ResolvedBlackjackRules
): boolean {
  return (
    rules.doubleAfterSplit === null ||
    rules.resplitAces === null ||
    rules.maxSplitsPerHand === null
  );
}

export function rulesFromProfile(
  profile: GameProfile
): ResolvedBlackjackRules | null {
  const r = profile.rules;
  if (
    r.dealerHitsSoft17 === null ||
    r.pushOn22 === null ||
    r.charlieSixCard === null ||
    r.dealerPeeksForBlackjack === null ||
    r.freeSplitOn === null ||
    r.freeDoubleOn === null ||
    r.decks === null
  ) {
    return null;
  }
  const splitOpen =
    r.doubleAfterSplit === null ||
    r.resplitAces === null ||
    r.maxSplitsPerHand === null;
  return {
    dealerHitsSoft17: r.dealerHitsSoft17,
    doubleAfterSplit: r.doubleAfterSplit,
    resplitAces: r.resplitAces,
    pushOn22: r.pushOn22,
    charlieSixCard: r.charlieSixCard,
    maxSplitsPerHand: r.maxSplitsPerHand,
    blackjackPayout: 1.5,
    freeDoubleOn: r.freeDoubleOn,
    freeSplitOn: r.freeSplitOn,
    allowDouble: true,
    allowSplit: !splitOpen,
    dealerPeeksForBlackjack: r.dealerPeeksForBlackjack,
  };
}

export function missingSplitFieldNames(
  profile: GameProfile
): (typeof SPLIT_FIELDS)[number][] {
  return SPLIT_FIELDS.filter((k) => profile.rules[k] === null);
}
