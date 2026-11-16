import type { GameProfile, RuleProfileFields } from "./types";

export interface ResolvedBlackjackRules {
  dealerHitsSoft17: boolean;
  doubleAfterSplit: boolean;
  resplitAces: boolean;
  pushOn22: boolean;
  charlieSixCard: boolean;
  maxSplitsPerHand: number;
  blackjackPayout: number;
  freeDoubleOn: RuleProfileFields["freeDoubleOn"];
  freeSplitOn: RuleProfileFields["freeSplitOn"];
  /** Player may double on first two cards. */
  allowDouble: boolean;
  /** Player may split pairs (once per hand in Phase 4). */
  allowSplit: boolean;
}

export function rulesFromProfile(profile: GameProfile): ResolvedBlackjackRules | null {
  const r = profile.rules;
  if (
    r.dealerHitsSoft17 === null ||
    r.doubleAfterSplit === null ||
    r.resplitAces === null ||
    r.pushOn22 === null ||
    r.charlieSixCard === null ||
    r.maxSplitsPerHand === null
  ) {
    return null;
  }
  return {
    dealerHitsSoft17: r.dealerHitsSoft17,
    doubleAfterSplit: r.doubleAfterSplit,
    resplitAces: r.resplitAces,
    pushOn22: r.pushOn22,
    charlieSixCard: r.charlieSixCard,
    maxSplitsPerHand: r.maxSplitsPerHand,
    blackjackPayout: 1.5,
    freeDoubleOn: r.freeDoubleOn ?? [],
    freeSplitOn: r.freeSplitOn ?? [],
    allowDouble: true,
    allowSplit: true,
  };
}