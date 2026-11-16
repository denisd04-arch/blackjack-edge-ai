import type { GameProfile, RuleProfileFields } from "./types";

/**
 * Sources read for these profiles (wording, not house-edge tables):
 * - BetMGM Live Free Bet Blackjack rules (7 seats, Evolution help text)
 * - Evolution Infinite Free Bet Blackjack rules PDF (EU EN)
 * - Evolution Free Bet product page (free double / free split description)
 *
 * Penetration is not a decision-EV input. Unverified split-tree fields stay null.
 */
const NULL_OK: (keyof RuleProfileFields)[] = ["penetration", "ruleSourceIds"];

function missingRuleFields(
  rules: RuleProfileFields
): (keyof RuleProfileFields)[] {
  return (
    Object.entries(rules) as [keyof RuleProfileFields, unknown][]
  )
    .filter(([k, v]) => !NULL_OK.includes(k) && v === null)
    .map(([k]) => k);
}

function buildProfile(
  partial: Omit<GameProfile, "incomplete" | "missingFields">
): GameProfile {
  const missing = missingRuleFields(partial.rules);
  return {
    ...partial,
    incomplete: missing.length > 0,
    missingFields: missing,
  };
}

/** Math regression only — not a live Evolution table. One split, no free bets, no peek stake fix. */
export const STANDARD_H17_8DECK_BASELINE: GameProfile = {
  id: "standard-h17-8deck",
  variant: "evolution_free_bet",
  labelDe: "Referenz: Standard H17 (8 Decks, keine Free Bets)",
  rules: {
    decks: 8,
    penetration: 0.75,
    dealerHitsSoft17: true,
    doubleAfterSplit: true,
    resplitAces: false,
    freeSplitOn: [],
    freeDoubleOn: [],
    pushOn22: false,
    infiniteFreeActions: false,
    charlieSixCard: false,
    maxSplitsPerHand: 1,
    dealerPeeksForBlackjack: false,
    ruleSourceIds: [],
  },
  countingSystems: ["hi_lo", "omega_ii"],
  incomplete: false,
  missingFields: [],
  updatedAt: "2026-11-16T00:00:00.000Z",
};

/**
 * Seven-seat Evolution Free Bet.
 * Verified (BetMGM live rules + Evolution product page): 8 decks, S17, peek,
 * blackjack 3:2, push 22 except player bust, player blackjack wins vs 22,
 * free double on hard 9/10/11, free split on non-ten pairs, split aces one card
 * is stated but resplit depth and double-after-split are not.
 * Charlie is absent from that rulesheet.
 * INCOMPLETE until DAS / resplit / max splits are sourced — pair hands get no advice.
 */
export const EVOLUTION_FREE_BET: GameProfile = buildProfile({
  id: "evo-free-bet",
  variant: "evolution_free_bet",
  labelDe: "Evolution Free Bet Blackjack",
  rules: {
    decks: 8,
    penetration: null,
    dealerHitsSoft17: false,
    doubleAfterSplit: null,
    resplitAces: null,
    freeSplitOn: ["pair"],
    freeDoubleOn: ["9", "10", "11"],
    pushOn22: true,
    infiniteFreeActions: false,
    charlieSixCard: false,
    maxSplitsPerHand: null,
    dealerPeeksForBlackjack: true,
    ruleSourceIds: [
      "betmgm:live-free-bet-blackjack-rules",
      "evolution:free-bet-product-page",
    ],
  },
  countingSystems: ["hi_lo", "omega_ii"],
  updatedAt: "2026-11-16T00:00:00.000Z",
});

/**
 * Infinite Free Bet — rules closed by the Evolution EU rules PDF:
 * S17, peek, one split, no DAS, one card on split aces, Charlie (even money),
 * push 22, free double hard 9–11, free split except tens, blackjack 3:2.
 * Penetration stays null: this profile supports conditional shoe EV, not a house-edge claim.
 */
export const EVOLUTION_INFINITE_FREE_BET: GameProfile = buildProfile({
  id: "evo-infinite-free-bet",
  variant: "evolution_infinite_free_bet",
  labelDe: "Evolution Infinite Free Bet Blackjack",
  rules: {
    decks: 8,
    penetration: null,
    dealerHitsSoft17: false,
    doubleAfterSplit: false,
    resplitAces: false,
    freeSplitOn: ["pair"],
    freeDoubleOn: ["9", "10", "11"],
    pushOn22: true,
    infiniteFreeActions: true,
    charlieSixCard: true,
    maxSplitsPerHand: 1,
    dealerPeeksForBlackjack: true,
    ruleSourceIds: ["evolution:infinite-free-bet-pdf-en"],
  },
  countingSystems: ["hi_lo", "omega_ii"],
  updatedAt: "2026-11-16T00:00:00.000Z",
});

/** @deprecated use EVOLUTION_FREE_BET */
export const EVOLUTION_FREE_BET_STUB = EVOLUTION_FREE_BET;

/** @deprecated use EVOLUTION_INFINITE_FREE_BET */
export const EVOLUTION_INFINITE_FREE_BET_STUB = EVOLUTION_INFINITE_FREE_BET;
