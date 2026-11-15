import { CARD_RANKS, type CardRank } from "./cards";

export type RankInventory = Record<CardRank, number>;

export interface ShoeSnapshot {
  decks: number;
  remainingByRank: RankInventory;
  cardsDealt: number;
  cardsTotal: number;
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

export function shoeSnapshot(
  decks: number,
  remainingByRank: RankInventory,
  cardsDealt: number
): ShoeSnapshot {
  const cardsTotal = decks * 52;
  const cardsRemaining = totalRemaining(remainingByRank);
  const penetration =
    cardsTotal === 0 ? 0 : Math.round((cardsDealt / cardsTotal) * 1000) / 10;
  return {
    decks,
    remainingByRank: { ...remainingByRank },
    cardsDealt,
    cardsTotal,
    penetration,
  };
}