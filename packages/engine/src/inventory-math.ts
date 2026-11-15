import { CARD_RANKS, type CardRank } from "./cards";
import type { RankInventory } from "./shoe";

export function inventoryTotal(inv: RankInventory): number {
  return CARD_RANKS.reduce((s, r) => s + inv[r], 0);
}

export function inventoryKey(inv: RankInventory): string {
  return CARD_RANKS.map((r) => inv[r]).join(",");
}

export function cloneInventory(inv: RankInventory): RankInventory {
  const next = {} as RankInventory;
  for (const r of CARD_RANKS) next[r] = inv[r];
  return next;
}

export function removeCard(
  inv: RankInventory,
  rank: CardRank
): RankInventory | null {
  if (inv[rank] <= 0) return null;
  return { ...inv, [rank]: inv[rank] - 1 };
}

export function removeCards(
  inv: RankInventory,
  ranks: readonly CardRank[]
): RankInventory | null {
  let cur = cloneInventory(inv);
  for (const r of ranks) {
    const n = removeCard(cur, r);
    if (!n) return null;
    cur = n;
  }
  return cur;
}

export function drawProbability(
  inv: RankInventory,
  rank: CardRank
): number {
  const total = inventoryTotal(inv);
  if (total <= 0) return 0;
  return inv[rank] / total;
}