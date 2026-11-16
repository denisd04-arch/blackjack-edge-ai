import { createDealerMemos, dealerDrawsToBust } from "./dealer";
import {
  bucketsFrom52,
  cardIndex,
  FULL_RANKS,
  type FullRank,
  SUITS,
  sum52,
  type Suit,
} from "./model";
import { countsKey, valueCards } from "./model";

export const PAYTABLE_ID = "EVOLUTION_INFINITE_FREE_BET_PAYTABLE_V2";
export const PAYTABLE_SOURCE = "USER_PROVIDED_OFFICIAL_LIVE_GAME_HELP_SCREENSHOTS";

/**
 * Fresh-shoe help-screen RTP. A label for an untouched shoe only.
 * Never a live edge and never scaled by a count.
 */
export const FRESH_SHOE_HELP_REFERENCE = {
  id: "EVOLUTION_HELP_FRESH_SHOE_RTP",
  scope: "fresh-shoe-only" as const,
  blackjack: 0.9845,
  perfectPairs: 0.959,
  twentyOnePlusThree: 0.9371,
  hot3: 0.946,
  bustIt: 0.9412,
};

/** Net-profit multiples. 25:1 means +25 and the stake is returned. */
export const PAYTABLE_V2 = {
  id: PAYTABLE_ID,
  anyPair: { perfect: 25, colored: 12, mixed: 6 },
  twentyOnePlusThree: {
    suitedTrips: 100,
    straightFlush: 40,
    threeOfAKind: 25,
    straight: 10,
    flush: 5,
  },
  hot3: { sevenSevenSeven: 100, suited21: 20, unsuited21: 4, total20: 2, total19: 1 },
  bustIt: { 8: 250, 7: 100, 6: 50, 5: 9, 4: 2, 3: 1 },
} as const;

export type SideDecision = "BET" | "SKIP" | "SKIP_INSUFFICIENT";

export interface SideBetResult {
  id: "any_pair" | "twenty_one_plus_three" | "hot3" | "bust_it";
  paytableId: string;
  probabilities: Record<string, number>;
  ev: number;
  /** 1 + ev. Computed. Not the help-screen number. */
  computedRtp: number;
  decision: SideDecision;
  alternateEv?: number;
  note: string;
}

function comb2(n: number): number {
  return n >= 2 ? (n * (n - 1)) / 2 : 0;
}

function sameColor(a: number, b: number): boolean {
  return Math.floor(a % 4 / 2) === Math.floor(b % 4 / 2);
}

export function anyPairFromShoe(shoe: Uint8Array): SideBetResult {
  const n = sum52(shoe);
  const total = (n * (n - 1)) / 2;
  let perfect = 0;
  let colored = 0;
  let mixed = 0;
  if (total > 0) {
    for (let i = 0; i < 52; i += 1) {
      perfect += comb2(shoe[i] ?? 0);
      for (let j = i + 1; j < 52; j += 1) {
        if (Math.floor(i / 4) !== Math.floor(j / 4)) continue;
        const ways = (shoe[i] ?? 0) * (shoe[j] ?? 0);
        if (sameColor(i, j)) colored += ways;
        else mixed += ways;
      }
    }
  }
  const pPerfect = total ? perfect / total : 0;
  const pColored = total ? colored / total : 0;
  const pMixed = total ? mixed / total : 0;
  const pLose = total ? Math.max(0, 1 - pPerfect - pColored - pMixed) : 1;
  const ev =
    PAYTABLE_V2.anyPair.perfect * pPerfect +
    PAYTABLE_V2.anyPair.colored * pColored +
    PAYTABLE_V2.anyPair.mixed * pMixed -
    pLose;
  return {
    id: "any_pair",
    paytableId: PAYTABLE_ID,
    probabilities: { perfect: pPerfect, colored: pColored, mixed: pMixed, lose: pLose },
    ev,
    computedRtp: 1 + ev,
    decision: total < 2 ? "SKIP_INSUFFICIENT" : ev > 0 ? "BET" : "SKIP",
    note: "Perfect, colored, then mixed. Highest category only. Recomputed from the remaining shoe.",
  };
}

function isStraight(ranks: number[]): boolean {
  const unique = [...new Set(ranks)];
  if (unique.length !== 3) return false;
  const lo = [...unique].sort((a, b) => a - b);
  if (lo[2]! - lo[0]! === 2 && lo[1]! - lo[0]! === 1) return true;
  const hi = lo.map((r) => (r === 0 ? 13 : r)).sort((a, b) => a - b);
  return hi[2]! - hi[0]! === 2 && hi[1]! - hi[0]! === 1;
}

function threeCardTotal(ranks: number[]): number {
  const buckets = ranks.map((r) => (r >= 9 ? 9 : r));
  return valueCards(buckets).total;
}

type Plus3 = "suitedTrips" | "straightFlush" | "threeOfAKind" | "straight" | "flush" | "lose";
type Hot3 = "seven" | "suited21" | "unsuited21" | "total20" | "total19" | "lose";

function classifyPlus3(i: number, j: number, k: number): Plus3 {
  const ranks = [Math.floor(i / 4), Math.floor(j / 4), Math.floor(k / 4)];
  const suits = [i % 4, j % 4, k % 4];
  const sameRank = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  const sameSuit = suits[0] === suits[1] && suits[1] === suits[2];
  if (sameRank && sameSuit) return "suitedTrips";
  if (sameRank) return "threeOfAKind";
  const straight = isStraight(ranks);
  if (straight && sameSuit) return "straightFlush";
  if (straight) return "straight";
  if (sameSuit) return "flush";
  return "lose";
}

function classifyHot3(i: number, j: number, k: number): Hot3 {
  const ranks = [Math.floor(i / 4), Math.floor(j / 4), Math.floor(k / 4)];
  const suits = [i % 4, j % 4, k % 4];
  if (ranks.every((r) => r === 6)) return "seven";
  const total = threeCardTotal(ranks);
  const suited = suits[0] === suits[1] && suits[1] === suits[2];
  if (total === 21 && suited) return "suited21";
  if (total === 21) return "unsuited21";
  if (total === 20) return "total20";
  if (total === 19) return "total19";
  return "lose";
}

function walkTriples(shoe: Uint8Array, add: (i: number, j: number, k: number, ways: number) => void): number {
  const n = sum52(shoe);
  const total = n >= 3 ? (n * (n - 1) * (n - 2)) / 6 : 0;
  if (total === 0) return 0;
  for (let i = 0; i < 52; i += 1) {
    const a = shoe[i] ?? 0;
    if (a >= 3) add(i, i, i, (a * (a - 1) * (a - 2)) / 6);
    for (let j = i + 1; j < 52; j += 1) {
      const b = shoe[j] ?? 0;
      if (a >= 2 && b >= 1) add(i, i, j, comb2(a) * b);
      if (b >= 2 && a >= 1) add(i, j, j, a * comb2(b));
      if (a >= 1 && b >= 1) {
        for (let k = j + 1; k < 52; k += 1) {
          const c = shoe[k] ?? 0;
          if (c >= 1) add(i, j, k, a * b * c);
        }
      }
    }
  }
  return total;
}

function priced(
  id: SideBetResult["id"],
  probs: Record<string, number>,
  payouts: Record<string, number>,
  note: string
): SideBetResult {
  let ev = 0;
  let win = 0;
  for (const [key, p] of Object.entries(probs)) {
    if (key === "lose") continue;
    ev += p * (payouts[key] ?? 0);
    win += p;
  }
  ev -= probs.lose ?? 0;
  const mass = Object.values(probs).reduce((s, p) => s + p, 0);
  const insufficient = Math.abs(mass - 1) > 1e-6 && (probs.lose ?? 0) === 1 && win === 0;
  return {
    id,
    paytableId: PAYTABLE_ID,
    probabilities: probs,
    ev,
    computedRtp: 1 + ev,
    decision: insufficient ? "SKIP_INSUFFICIENT" : ev > 0 ? "BET" : "SKIP",
    note,
  };
}

export function twentyOnePlusThreeFromShoe(shoe: Uint8Array): SideBetResult {
  const mass: Record<Plus3, number> = {
    suitedTrips: 0,
    straightFlush: 0,
    threeOfAKind: 0,
    straight: 0,
    flush: 0,
    lose: 0,
  };
  const total = walkTriples(shoe, (i, j, k, ways) => {
    mass[classifyPlus3(i, j, k)] += ways;
  });
  const probs: Record<string, number> = {};
  for (const key of Object.keys(mass) as Plus3[]) probs[key] = total ? mass[key] / total : key === "lose" ? 1 : 0;
  return priced(
    "twenty_one_plus_three",
    probs,
    {
      suitedTrips: PAYTABLE_V2.twentyOnePlusThree.suitedTrips,
      straightFlush: PAYTABLE_V2.twentyOnePlusThree.straightFlush,
      threeOfAKind: PAYTABLE_V2.twentyOnePlusThree.threeOfAKind,
      straight: PAYTABLE_V2.twentyOnePlusThree.straight,
      flush: PAYTABLE_V2.twentyOnePlusThree.flush,
    },
    "Highest category only. Three of a kind pays 25:1 on this paytable."
  );
}

export function hot3FromShoe(shoe: Uint8Array): SideBetResult {
  const mass: Record<Hot3, number> = {
    seven: 0,
    suited21: 0,
    unsuited21: 0,
    total20: 0,
    total19: 0,
    lose: 0,
  };
  const total = walkTriples(shoe, (i, j, k, ways) => {
    mass[classifyHot3(i, j, k)] += ways;
  });
  const probs: Record<string, number> = {};
  for (const key of Object.keys(mass) as Hot3[]) probs[key] = total ? mass[key] / total : key === "lose" ? 1 : 0;
  return priced(
    "hot3",
    probs,
    {
      seven: PAYTABLE_V2.hot3.sevenSevenSeven,
      suited21: PAYTABLE_V2.hot3.suited21,
      unsuited21: PAYTABLE_V2.hot3.unsuited21,
      total20: PAYTABLE_V2.hot3.total20,
      total19: PAYTABLE_V2.hot3.total19,
    },
    "7-7-7 outranks a suited 21. Highest category only."
  );
}

const bustCache = new Map<string, ReturnType<typeof dealerDrawsToBust>>();

export function bustItFromShoe(shoe: Uint8Array, minEdge = 0): SideBetResult {
  const buckets = bucketsFrom52(shoe);
  const key = countsKey(buckets);
  let drawn = bustCache.get(key);
  if (!drawn) {
    drawn = dealerDrawsToBust(buckets.slice(), createDealerMemos());
    bustCache.set(key, drawn);
  }
  const pay = PAYTABLE_V2.bustIt;
  const probs: Record<string, number> = {};
  let ev22 = 0;
  let ev23 = 0;
  let win22 = 0;
  let win23 = 0;
  for (const cards of [3, 4, 5, 6, 7, 8] as const) {
    const pIn = drawn.including22[cards] ?? 0;
    const pEx = drawn.excluding22[cards] ?? 0;
    probs[`cards${cards}`] = pIn;
    probs[`cards${cards}Excluding22`] = pEx;
    ev22 += pIn * pay[cards];
    ev23 += pEx * pay[cards];
    win22 += pIn;
    win23 += pEx;
  }
  ev22 -= 1 - win22;
  ev23 -= 1 - win23;
  probs.exact22 = drawn.exact22;
  probs.loseIf22Pays = Math.max(0, 1 - win22);
  probs.loseIf22DoesNotPay = Math.max(0, 1 - win23);
  let decision: SideDecision;
  if (sum52(shoe) < 8) decision = "SKIP_INSUFFICIENT";
  else if (ev22 > minEdge && ev23 > minEdge) decision = "BET";
  else if (ev22 <= minEdge && ev23 <= minEdge) decision = "SKIP";
  else decision = "SKIP_INSUFFICIENT";
  return {
    id: "bust_it",
    paytableId: PAYTABLE_ID,
    probabilities: probs,
    ev: ev22,
    alternateEv: ev23,
    computedRtp: 1 + ev22,
    decision,
    note:
      "Five-card bust pays 9:1. EV treats dealer 22 as a bust; alternateEv does not. The screenshots do not say which, so a sign conflict is insufficient data. Neither number is the help-screen RTP.",
  };
}

export function sideBetsFromShoe(shoe: Uint8Array, minEdge = 0): SideBetResult[] {
  return [
    anyPairFromShoe(shoe),
    twentyOnePlusThreeFromShoe(shoe),
    hot3FromShoe(shoe),
    bustItFromShoe(shoe, minEdge),
  ];
}

export function removeCard52(shoe: Uint8Array, rank: FullRank, suit: Suit): Uint8Array | null {
  const next = shoe.slice();
  const index = cardIndex(rank, suit);
  if ((next[index] ?? 0) <= 0) return null;
  next[index] = (next[index] ?? 0) - 1;
  return next;
}

export function freshShoeGapNotes(shoe = freshShoeFromDecks()): {
  reference: typeof FRESH_SHOE_HELP_REFERENCE;
  pairs: number;
  twentyOnePlusThree: number;
  hot3: number;
  bustItIf22Pays: number;
  bustItIf22DoesNotPay: number;
  explanation: string;
} {
  const pairs = anyPairFromShoe(shoe).computedRtp;
  const plus = twentyOnePlusThreeFromShoe(shoe).computedRtp;
  const hot = hot3FromShoe(shoe).computedRtp;
  const bust = bustItFromShoe(shoe);
  const ref = FRESH_SHOE_HELP_REFERENCE;
  const explanation = [
    "Help-screen RTP is a fresh-shoe reference under Evolution's own optimal-play model. It is not this shoe's edge.",
    `Computed fresh Any Pair RTP ${(pairs * 100).toFixed(4)}% versus help ${(ref.perfectPairs * 100).toFixed(2)}%.`,
    `Computed fresh 21+3 RTP ${(plus * 100).toFixed(4)}% versus help ${(ref.twentyOnePlusThree * 100).toFixed(2)}%. Three of a kind is 25:1 here.`,
    `Computed fresh Hot 3 RTP ${(hot * 100).toFixed(4)}% versus help ${(ref.hot3 * 100).toFixed(2)}%.`,
    `Computed fresh Bust It RTP if 22 pays ${(bust.computedRtp * 100).toFixed(4)}%, if 22 does not pay ${((1 + (bust.alternateEv ?? 0)) * 100).toFixed(4)}%, versus help ${(ref.bustIt * 100).toFixed(2)}%. Five-card bust is 9:1.`,
    "Gaps can come from dealer-22 on Bust It, from straight/ace scoring, from the profit-multiple reading of X:1, and from main-game rules (free bets, Charlie, DAS, push 22) that the published blackjack RTP folds in. The engine does not adjust its probabilities to force these numbers to match.",
  ].join(" ");
  return {
    reference: ref,
    pairs,
    twentyOnePlusThree: plus,
    hot3: hot,
    bustItIf22Pays: bust.computedRtp,
    bustItIf22DoesNotPay: 1 + (bust.alternateEv ?? 0),
    explanation,
  };
}

function freshShoeFromDecks(): Uint8Array {
  const shoe = new Uint8Array(52);
  shoe.fill(8);
  return shoe;
}

void FULL_RANKS;
void SUITS;
