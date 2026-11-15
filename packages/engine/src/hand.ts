import type { CardRank } from "./cards";

export interface HandTotals {
  total: number;
  soft: boolean;
  bust: boolean;
  /** Two-card natural blackjack. */
  blackjack: boolean;
}

export function rankValue(rank: CardRank): number {
  if (rank === "A") return 11;
  if (rank === "J" || rank === "Q" || rank === "K" || rank === "10") return 10;
  return Number(rank);
}

export function evaluateHand(cards: readonly CardRank[]): HandTotals {
  if (cards.length === 0) {
    return { total: 0, soft: false, bust: false, blackjack: false };
  }
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c === "A") aces += 1;
    else total += rankValue(c);
  }
  for (let i = 0; i < aces; i += 1) {
    total += 11;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  const soft = aces > 0 && total <= 21;
  return {
    total,
    soft,
    bust: total > 21,
    blackjack: cards.length === 2 && total === 21,
  };
}

export function isPair(cards: readonly CardRank[]): boolean {
  return (
    cards.length === 2 && cards[0] === cards[1] && cards[0] !== undefined
  );
}

export function handCacheKey(cards: readonly CardRank[]): string {
  return [...cards].sort().join(",");
}