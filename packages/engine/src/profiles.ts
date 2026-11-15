import type { GameProfile } from "./types";

function incompleteProfile(
  partial: Omit<GameProfile, "incomplete" | "missingFields">
): GameProfile {
  const missing = (
    Object.entries(partial.rules) as [keyof GameProfile["rules"], unknown][]
  )
    .filter(([, v]) => v === null)
    .map(([k]) => k);

  return {
    ...partial,
    incomplete: missing.length > 0,
    missingFields: missing,
  };
}

/** Complete reference rules for finite-shoe EV (Phase 4 baseline). */
export const STANDARD_H17_8DECK_BASELINE: GameProfile = {
  id: "standard-h17-8deck",
  variant: "evolution_free_bet",
  labelDe: "Referenz: Standard H17 (8 Decks)",
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
  },
  countingSystems: ["hi_lo", "omega_ii"],
  incomplete: false,
  missingFields: [],
  updatedAt: new Date(0).toISOString(),
};

export const EVOLUTION_FREE_BET_STUB: GameProfile = incompleteProfile({
  id: "evo-free-bet-default",
  variant: "evolution_free_bet",
  labelDe: "Evolution Free Bet Blackjack",
  rules: {
    decks: 8,
    penetration: null,
    dealerHitsSoft17: true,
    doubleAfterSplit: true,
    resplitAces: null,
    freeSplitOn: ["8", "9", "10", "11", "pair"],
    freeDoubleOn: ["9", "10", "11", "soft"],
    pushOn22: false,
    infiniteFreeActions: false,
  },
  countingSystems: ["hi_lo", "omega_ii"],
  updatedAt: new Date(0).toISOString(),
});

export const EVOLUTION_INFINITE_FREE_BET_STUB: GameProfile = incompleteProfile({
  id: "evo-infinite-free-bet-default",
  variant: "evolution_infinite_free_bet",
  labelDe: "Evolution Infinite Free Bet Blackjack",
  rules: {
    decks: null,
    penetration: null,
    dealerHitsSoft17: true,
    doubleAfterSplit: true,
    resplitAces: null,
    freeSplitOn: ["8", "9", "10", "11", "pair"],
    freeDoubleOn: ["9", "10", "11", "soft"],
    pushOn22: false,
    infiniteFreeActions: true,
  },
  countingSystems: ["hi_lo", "omega_ii"],
  updatedAt: new Date(0).toISOString(),
});