import type { GameProfile, RuleProfileFields } from "./types";

const EVOLUTION_RULE_SOURCES = [
  "evolution:infinite-free-bet-pdf-en",
  "evolution:free-bet-product-page",
] as const;

const NULL_OK_FIELDS: (keyof RuleProfileFields)[] = ["penetration"];

function missingRuleFields(
  rules: RuleProfileFields
): (keyof RuleProfileFields)[] {
  return (
    Object.entries(rules) as [keyof RuleProfileFields, unknown][]
  )
    .filter(
      ([k, v]) =>
        k !== "ruleSourceIds" &&
        !NULL_OK_FIELDS.includes(k) &&
        v === null
    )
    .map(([k]) => k);
}

function buildProfile(
  partial: Omit<GameProfile, "incomplete" | "missingFields"> & {
    /** Fields that must be implemented in engine before definitive EV. */
    engineGates?: string[];
  }
): GameProfile {
  const { engineGates = [], ...rest } = partial;
  const missing = missingRuleFields(rest.rules);
  const incomplete = missing.length > 0 || engineGates.length > 0;
  return {
    ...rest,
    incomplete,
    missingFields: [
      ...missing,
      ...(engineGates as (keyof RuleProfileFields)[]),
    ],
  };
}

/** Math regression only — not a live Evolution table ruleset. */
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
    maxSplitsPerHand: 4,
    ruleSourceIds: [],
  },
  countingSystems: ["hi_lo", "omega_ii"],
  incomplete: false,
  missingFields: [],
  updatedAt: "2026-11-16T00:00:00.000Z",
};

/**
 * Evolution Free Bet (seven-seat / generic live).
 * Push 22, free double 9–11, free split non-ten pairs — verified via Evolution docs.
 * Penetration null: live CSM/shoe cut not modeled for edge claims.
 */
export const EVOLUTION_FREE_BET: GameProfile = buildProfile({
  id: "evo-free-bet",
  variant: "evolution_free_bet",
  labelDe: "Evolution Free Bet Blackjack",
  rules: {
    decks: 8,
    penetration: null,
    dealerHitsSoft17: false,
    doubleAfterSplit: true,
    resplitAces: false,
    freeSplitOn: ["8", "9", "pair"],
    freeDoubleOn: ["9", "10", "11", "soft"],
    pushOn22: true,
    infiniteFreeActions: false,
    charlieSixCard: false,
    maxSplitsPerHand: 4,
    ruleSourceIds: [...EVOLUTION_RULE_SOURCES],
  },
  countingSystems: ["hi_lo", "omega_ii"],
  updatedAt: "2026-11-16T00:00:00.000Z",
});

/**
 * Infinite Free Bet — Charlie + no DAS + one split (PDF).
 * INCOMPLETE until Charlie + shared-hand sim exist in engine.
 */
export const EVOLUTION_INFINITE_FREE_BET: GameProfile = {
  id: "evo-infinite-free-bet",
  variant: "evolution_infinite_free_bet",
  labelDe: "Evolution Infinite Free Bet Blackjack",
  rules: {
    decks: 8,
    penetration: null,
    dealerHitsSoft17: false,
    doubleAfterSplit: false,
    resplitAces: false,
    freeSplitOn: ["8", "9", "pair"],
    freeDoubleOn: ["9", "10", "11", "soft"],
    pushOn22: true,
    infiniteFreeActions: true,
    charlieSixCard: true,
    maxSplitsPerHand: 1,
    ruleSourceIds: [...EVOLUTION_RULE_SOURCES],
  },
  countingSystems: ["hi_lo", "omega_ii"],
  updatedAt: "2026-11-16T00:00:00.000Z",
  incomplete: false,
  missingFields: [],
};

/** @deprecated use EVOLUTION_FREE_BET */
export const EVOLUTION_FREE_BET_STUB = EVOLUTION_FREE_BET;

/** @deprecated use EVOLUTION_INFINITE_FREE_BET */
export const EVOLUTION_INFINITE_FREE_BET_STUB = EVOLUTION_INFINITE_FREE_BET;