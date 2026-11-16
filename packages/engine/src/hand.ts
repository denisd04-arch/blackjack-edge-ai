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

export function isTenValue(rank: CardRank): boolean {
  return rank === "10" || rank === "J" || rank === "Q" || rank === "K";
}

export function isPair(cards: readonly CardRank[]): boolean {
  return (
    cards.length === 2 && cards[0] === cards[1] && cards[0] !== undefined
  );
}

/** Evolution splits cards of equal value, including 10/J/Q/K with each other. */
export function isEqualValuePair(cards: readonly CardRank[]): boolean {
  if (cards.length !== 2 || cards[0] === undefined || cards[1] === undefined) {
    return false;
  }
  if (cards[0] === cards[1]) return true;
  return isTenValue(cards[0]) && isTenValue(cards[1]);
}

export function holeMakesBlackjack(up: CardRank, hole: CardRank): boolean {
  if (up === "A") return isTenValue(hole);
  if (isTenValue(up)) return hole === "A";
  return false;
}

export function handCacheKey(cards: readonly CardRank[]): string {
  return [...cards].sort().join(",");
}