import { CARD_RANKS, type CardRank, type DealtCard } from "./cards";
import type { RankInventory } from "./shoe";

/** Standard Hi-Lo tag values per rank. */
export const HI_LO_TAGS: Record<CardRank, number> = {
  A: -1,
  "2": 1,
  "3": 1,
  "4": 1,
  "5": 1,
  "6": 1,
  "7": 0,
  "8": 0,
  "9": 0,
  "10": -1,
  J: -1,
  Q: -1,
  K: -1,
};

/** Omega II full per-rank tags (unbalanced; true count uses standard deck conversion). */
export const OMEGA_II_TAGS: Record<CardRank, number> = {
  A: 0,
  "2": 1,
  "3": 1,
  "4": 2,
  "5": 2,
  "6": 2,
  "7": 1,
  "8": 0,
  "9": -1,
  "10": -2,
  J: -2,
  Q: -2,
  K: -2,
};

export type CountingSystem = "hiLo" | "omegaII";

export interface CompositionStats {
  /** Remaining cards with rank 2–9. */
  low2to9: number;
  /** Remaining 10, J, Q, K. */
  tens: number;
  aces: number;
}

export interface SystemCount {
  running: number;
  /** Running count converted with decks remaining (two decimal places). */
  true: number;
}

export interface CountSnapshot {
  hiLo: SystemCount;
  omegaII: SystemCount;
  decksRemaining: number;
  cardsRemaining: number;
  penetration: number;
  composition: CompositionStats;
}

export function tagForRank(
  rank: CardRank,
  system: CountingSystem
): number {
  return system === "hiLo" ? HI_LO_TAGS[rank] : OMEGA_II_TAGS[rank];
}

export function runningCountFromDealt(
  dealt: readonly DealtCard[],
  system: CountingSystem
): number {
  let rc = 0;
  for (const card of dealt) {
    rc += tagForRank(card.rank, system);
  }
  return rc;
}

/** Standard true-count conversion: RC ÷ decks remaining (minimum divisor 0.25). */
export function convertToTrueCount(
  running: number,
  decksRemaining: number
): number {
  const divisor = Math.max(decksRemaining, 0.25);
  return Math.round((running / divisor) * 100) / 100;
}

export function compositionFromInventory(
  remainingByRank: RankInventory
): CompositionStats {
  let low2to9 = 0;
  let tens = 0;
  let aces = 0;
  for (const rank of CARD_RANKS) {
    const n = remainingByRank[rank];
    if (rank === "A") aces += n;
    else if (rank === "10" || rank === "J" || rank === "Q" || rank === "K") {
      tens += n;
    } else {
      low2to9 += n;
    }
  }
  return { low2to9, tens, aces };
}

export function buildCountSnapshot(input: {
  dealt: readonly DealtCard[];
  remainingByRank: RankInventory;
  cardsRemaining: number;
  cardsTotal: number;
  penetration: number;
  decks: number;
}): CountSnapshot {
  const decksRemaining =
    input.cardsRemaining === 0
      ? 0
      : Math.round((input.cardsRemaining / 52) * 1000) / 1000;
  const hiRunning = runningCountFromDealt(input.dealt, "hiLo");
  const omegaRunning = runningCountFromDealt(input.dealt, "omegaII");
  return {
    hiLo: {
      running: hiRunning,
      true: convertToTrueCount(hiRunning, decksRemaining),
    },
    omegaII: {
      running: omegaRunning,
      true: convertToTrueCount(omegaRunning, decksRemaining),
    },
    decksRemaining,
    cardsRemaining: input.cardsRemaining,
    penetration: input.penetration,
    composition: compositionFromInventory(input.remainingByRank),
  };
}