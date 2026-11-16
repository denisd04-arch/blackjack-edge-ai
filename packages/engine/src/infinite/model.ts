/** Rank buckets for hand value. Index: 0=A, 1=2, … 8=9, 9=ten-value. */
export const BUCKETS = 10;

export const FULL_RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;

export type FullRank = (typeof FULL_RANKS)[number];

export const SUITS = ["hearts", "diamonds", "clubs", "spades"] as const;
export type Suit = (typeof SUITS)[number];

export const SUIT_SYMBOL: Record<Suit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

export function cardIndex(rank: FullRank, suit: Suit): number {
  return FULL_RANKS.indexOf(rank) * 4 + SUITS.indexOf(suit);
}

export function indexParts(index: number): { rank: FullRank; suit: Suit } {
  return {
    rank: FULL_RANKS[Math.floor(index / 4)]!,
    suit: SUITS[index % 4]!,
  };
}

/** 8 decks → 8 copies of each rank-suit, 416 cards. */
export function freshShoe52(decks = 8): Uint8Array {
  const shoe = new Uint8Array(52);
  shoe.fill(decks);
  return shoe;
}

export function sum52(shoe: ArrayLike<number>): number {
  let n = 0;
  for (let i = 0; i < shoe.length; i += 1) n += shoe[i]!;
  return n;
}

export function bucketsFrom52(shoe: ArrayLike<number>): Uint8Array {
  const b = new Uint8Array(BUCKETS);
  for (let rank = 0; rank < 13; rank += 1) {
    let n = 0;
    for (let suit = 0; suit < 4; suit += 1) n += shoe[rank * 4 + suit]!;
    const bucket = rank >= 9 ? 9 : rank;
    b[bucket] = (b[bucket] ?? 0) + n;
  }
  return b;
}

export function freshBuckets(decks = 8): Uint8Array {
  const b = new Uint8Array(BUCKETS);
  for (let i = 0; i < 9; i += 1) b[i] = 4 * decks;
  b[9] = 16 * decks;
  return b;
}

export function sumBuckets(counts: ArrayLike<number>): number {
  let n = 0;
  for (let i = 0; i < BUCKETS; i += 1) n += counts[i]!;
  return n;
}

export function countsKey(counts: ArrayLike<number>): string {
  return String.fromCharCode(
    counts[0]!,
    counts[1]!,
    counts[2]!,
    counts[3]!,
    counts[4]!,
    counts[5]!,
    counts[6]!,
    counts[7]!,
    counts[8]!,
    counts[9]!
  );
}

export function bucketValue(bucket: number): number {
  if (bucket === 0) return 11;
  if (bucket === 9) return 10;
  return bucket + 1;
}

export interface HandValue {
  total: number;
  soft: boolean;
  bust: boolean;
  blackjack: boolean;
  charlie: boolean;
  pair: boolean;
  hardTotal: number | null;
}

export function valueCards(cards: readonly number[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c === 0) aces += 1;
    else total += bucketValue(c);
  }
  total += aces * 11;
  let softAces = aces;
  while (total > 21 && softAces > 0) {
    total -= 10;
    softAces -= 1;
  }
  const soft = softAces > 0 && total <= 21;
  const bust = total > 21;
  return {
    total,
    soft,
    bust,
    blackjack: cards.length === 2 && total === 21,
    charlie: cards.length >= 6 && total <= 21,
    pair: cards.length === 2 && cards[0] === cards[1],
    hardTotal: !soft && !bust ? total : null,
  };
}

export type DealerKind =
  | { type: "bust" }
  | { type: "22" }
  | { type: "bj" }
  | { type: "total"; total: number };

export interface DealerDist {
  t17: number;
  t18: number;
  t19: number;
  t20: number;
  t21: number;
  bj: number;
  bust: number;
  t22: number;
}

export function emptyDist(): DealerDist {
  return { t17: 0, t18: 0, t19: 0, t20: 0, t21: 0, bj: 0, bust: 0, t22: 0 };
}

export function distSum(d: DealerDist): number {
  return d.t17 + d.t18 + d.t19 + d.t20 + d.t21 + d.bj + d.bust + d.t22;
}

export function addDist(into: DealerDist, scale: number, src: DealerDist): void {
  into.t17 += scale * src.t17;
  into.t18 += scale * src.t18;
  into.t19 += scale * src.t19;
  into.t20 += scale * src.t20;
  into.t21 += scale * src.t21;
  into.bj += scale * src.bj;
  into.bust += scale * src.bust;
  into.t22 += scale * src.t22;
}

export function cloneDist(d: DealerDist): DealerDist {
  return { ...d };
}

export type StakeMode = "plain" | "free-double" | "regular-double";

export function stakeUnits(
  mode: StakeMode,
  cash: boolean
): { win: number; lose: number } {
  if (mode === "free-double" && cash) return { win: 2, lose: 1 };
  if (mode === "free-double" && !cash) return { win: 2, lose: 0 };
  if (mode === "regular-double" && cash) return { win: 2, lose: 2 };
  if (mode === "regular-double" && !cash) return { win: 2, lose: 1 };
  if (cash) return { win: 1, lose: 1 };
  return { win: 1, lose: 0 };
}

export interface SettledHand {
  total: number;
  bust: boolean;
  blackjack: boolean;
  charlie: boolean;
  cash: boolean;
  mode: StakeMode;
}

/** Player-cash profit of one finished hand against one dealer outcome. */
function cashLoss(lose: number): number {
  return lose === 0 ? 0 : -lose;
}

export function handProfit(hand: SettledHand, dealer: DealerKind): number {
  const u = stakeUnits(hand.mode, hand.cash);
  if (hand.bust) return cashLoss(u.lose);
  if (hand.blackjack) {
    if (dealer.type === "bj") return 0;
    return 1.5;
  }
  if (hand.charlie) {
    if (dealer.type === "bj") return cashLoss(u.lose);
    if (dealer.type === "22") return 0;
    return 1;
  }
  if (dealer.type === "bust") return u.win;
  if (dealer.type === "22") return 0;
  if (dealer.type === "bj") return cashLoss(u.lose);
  if (hand.total > dealer.total) return u.win;
  if (hand.total < dealer.total) return cashLoss(u.lose);
  return 0;
}

export interface Moments {
  ev: number;
  second: number;
  win: number;
  push: number;
  loss: number;
  bust: number;
}

export function pointMass(profit: number, bust = false): Moments {
  return {
    ev: profit,
    second: profit * profit,
    win: profit > 0 ? 1 : 0,
    push: profit === 0 ? 1 : 0,
    loss: profit < 0 ? 1 : 0,
    bust: bust ? 1 : 0,
  };
}

export function mixMoments(parts: readonly { p: number; m: Moments }[]): Moments {
  const out: Moments = { ev: 0, second: 0, win: 0, push: 0, loss: 0, bust: 0 };
  for (const part of parts) {
    out.ev += part.p * part.m.ev;
    out.second += part.p * part.m.second;
    out.win += part.p * part.m.win;
    out.push += part.p * part.m.push;
    out.loss += part.p * part.m.loss;
    out.bust += part.p * part.m.bust;
  }
  return out;
}

export function varianceOf(m: Moments): number {
  return Math.max(0, m.second - m.ev * m.ev);
}

const DEALER_BUCKETS: { key: keyof DealerDist; kind: DealerKind }[] = [
  { key: "t17", kind: { type: "total", total: 17 } },
  { key: "t18", kind: { type: "total", total: 18 } },
  { key: "t19", kind: { type: "total", total: 19 } },
  { key: "t20", kind: { type: "total", total: 20 } },
  { key: "t21", kind: { type: "total", total: 21 } },
  { key: "bj", kind: { type: "bj" } },
  { key: "bust", kind: { type: "bust" } },
  { key: "t22", kind: { type: "22" } },
];

export function settleHands(hands: readonly SettledHand[], dist: DealerDist): Moments {
  const anyBust = hands.some((h) => h.bust);
  let ev = 0;
  let second = 0;
  let win = 0;
  let push = 0;
  let loss = 0;
  for (const bucket of DEALER_BUCKETS) {
    const p = dist[bucket.key];
    if (p === 0) continue;
    let profit = 0;
    for (const hand of hands) profit += handProfit(hand, bucket.kind);
    ev += p * profit;
    second += p * profit * profit;
    if (profit > 0) win += p;
    else if (profit < 0) loss += p;
    else push += p;
  }
  return { ev, second, win, push, loss, bust: anyBust ? 1 : 0 };
}

/**
 * Player edge is the recomputed main-game EV per initial unit.
 * The help-screen RTP is not an input.
 */
export function playerEdgeFromEv(mainEvPerInitialUnit: number): number {
  return mainEvPerInitialUnit;
}
