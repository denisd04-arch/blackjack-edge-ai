import { CARD_RANKS, CARD_SUITS, type CardRank, type CardSuit } from "./cards";
import type { RankInventory } from "./shoe";

export type SuitInventory = Record<CardSuit, Record<CardRank, number>>;

export function createFullSuitInventory(decks: number): SuitInventory {
  const inv = {} as SuitInventory;
  for (const suit of CARD_SUITS) {
    const byRank = {} as Record<CardRank, number>;
    for (const rank of CARD_RANKS) {
      byRank[rank] = decks;
    }
    inv[suit] = byRank;
  }
  return inv;
}

export function aggregateRankInventory(suitInv: SuitInventory): RankInventory {
  const agg = {} as RankInventory;
  for (const rank of CARD_RANKS) {
    agg[rank] = CARD_SUITS.reduce((sum, suit) => sum + suitInv[suit][rank], 0);
  }
  return agg;
}

export function canTakeSuitRank(
  suitInv: SuitInventory,
  rank: CardRank,
  suit: CardSuit
): boolean {
  return suitInv[suit][rank] > 0;
}

export function takeSuitRank(
  suitInv: SuitInventory,
  rank: CardRank,
  suit: CardSuit
): SuitInventory | null {
  if (!canTakeSuitRank(suitInv, rank, suit)) return null;
  return {
    ...suitInv,
    [suit]: { ...suitInv[suit], [rank]: suitInv[suit][rank] - 1 },
  };
}

export function returnSuitRank(
  suitInv: SuitInventory,
  rank: CardRank,
  suit: CardSuit
): SuitInventory {
  return {
    ...suitInv,
    [suit]: { ...suitInv[suit], [rank]: suitInv[suit][rank] + 1 },
  };
}