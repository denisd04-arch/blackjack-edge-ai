import { CARD_RANKS, type CardRank } from "./cards";
import {
  aggregateRankInventory,
  type SuitInventory,
} from "./suit-inventory";

export type RankInventory = Record<CardRank, number>;

export interface ShoeSnapshot {
  decks: number;
  remainingByRank: RankInventory;
  remainingBySuit: SuitInventory;
  cardsDealt: number;
  cardsTotal: number;
  cardsRemaining: number;
  decksRemaining: number;
  penetration: number;
}

export function createFullShoeInventory(decks: number): RankInventory {
  const copiesPerRank = decks * 4;
  const inv = {} as RankInventory;
  for (const rank of CARD_RANKS) {
    inv[rank] = copiesPerRank;
  }
  return inv;
}

export function totalRemaining(inventory: RankInventory): number {
  return CARD_RANKS.reduce((sum, rank) => sum + inventory[rank], 0);
}

export function canTakeRank(inventory: RankInventory, rank: CardRank): boolean {
  return inventory[rank] > 0;
}

/** Returns updated inventory or null if rank is depleted (over-depletion guard). */
export function takeRank(
  inventory: RankInventory,
  rank: CardRank
): RankInventory | null {
  if (!canTakeRank(inventory, rank)) return null;
  return { ...inventory, [rank]: inventory[rank] - 1 };
}

export function returnRank(
  inventory: RankInventory,
  rank: CardRank
): RankInventory {
  return { ...inventory, [rank]: inventory[rank] + 1 };
}

export function shoeSnapshotFromSuit(
  decks: number,
  suitInventory: SuitInventory,
  cardsDealt: number
): ShoeSnapshot {
  const remainingByRank = aggregateRankInventory(suitInventory);
  return shoeSnapshot(decks, remainingByRank, suitInventory, cardsDealt);
}

export function shoeSnapshot(
  decks: number,
  remainingByRank: RankInventory,
  remainingBySuit: SuitInventory,
  cardsDealt: number
): ShoeSnapshot {
  const cardsTotal = decks * 52;
  const cardsRemaining = totalRemaining(remainingByRank);
  const decksRemaining =
    cardsRemaining === 0
      ? 0
      : Math.round((cardsRemaining / 52) * 1000) / 1000;
  const penetration =
    cardsTotal === 0 ? 0 : Math.round((cardsDealt / cardsTotal) * 1000) / 10;
  const suitCopy = {} as SuitInventory;
  for (const suit of Object.keys(remainingBySuit) as (keyof SuitInventory)[]) {
    suitCopy[suit] = { ...remainingBySuit[suit] };
  }
  return {
    decks,
    remainingByRank: { ...remainingByRank },
    remainingBySuit: suitCopy,
    cardsDealt,
    cardsTotal,
    cardsRemaining,
    decksRemaining,
    penetration,
  };
}