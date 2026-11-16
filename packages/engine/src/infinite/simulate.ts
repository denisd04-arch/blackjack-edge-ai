import { evaluateActions, mulberry32 } from "./ev";
import {
  bucketsFrom52,
  freshShoe52,
  FULL_RANKS,
  indexParts,
  SUITS,
  type FullRank,
  type Suit,
} from "./model";
import { handProfit, type DealerKind, type SettledHand } from "./model";
import type { CutConfig } from "./presets";
import { applyToLedger, emptyLedger, settlementFromUnit, type Ledger } from "./settlement";

export interface VisibleState {
  counts: Uint8Array;
  player: number[];
  up: number | null;
}

export type Policy = (visible: VisibleState) => string;

/** The policy receives the seen composition only, never the ordered remainder. */
export function compositionPolicy(visible: VisibleState): string {
  if (visible.up === null || visible.player.length < 2) return "WAIT";
  const actions = evaluateActions(visible.counts.slice(), visible.player, visible.up);
  return actions.best;
}

export function shuffleShoe(seed: number, decks = 8): number[] {
  const cards: number[] = [];
  const shoe = freshShoe52(decks);
  for (let i = 0; i < shoe.length; i += 1) {
    for (let n = 0; n < (shoe[i] ?? 0); n += 1) cards.push(i);
  }
  const rng = mulberry32(seed);
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = cards[i]!;
    cards[i] = cards[j]!;
    cards[j] = tmp;
  }
  return cards;
}

function toBucket(card: number): number {
  const rank = Math.floor(card / 4);
  return rank >= 9 ? 9 : rank;
}

/**
 * Play one shoe. Decisions are made from cards already dealt.
 * `order` is the hidden shuffle; swapping the undealt tail must not change a decision
 * that has seen the same prefix.
 */
export function decisionAtPrefix(order: readonly number[], prefix: number): string {
  const seen = order.slice(0, prefix);
  const counts = bucketsFrom52(freshShoe52(8));
  for (const card of seen) {
    const b = toBucket(card);
    counts[b] = Math.max(0, (counts[b] ?? 0) - 1);
  }
  if (prefix < 3) return "WAIT";
  const player = [toBucket(order[0]!), toBucket(order[2]!)];
  const up = toBucket(order[1]!);
  return compositionPolicy({ counts, player, up });
}

export function playShoe(input: {
  seed: number;
  cut: CutConfig;
  backgroundCards: number;
  policy?: Policy;
}): { net: number; rounds: number; report: { dealt: number; stopped: true } } {
  const order = shuffleShoe(input.seed);
  let cursor = 0;
  let net = 0;
  let rounds = 0;
  const take = () => {
    const card = order[cursor];
    cursor += 1;
    return card;
  };
  const total = order.length;
  const cutAt = cutIndex(input.cut, total);
  while (cursor + 4 < order.length && cursor < cutAt) {
    const c1 = take();
    const upCard = take();
    const c2 = take();
    const hole = take();
    if (c1 === undefined || upCard === undefined || c2 === undefined || hole === undefined) break;
    rounds += 1;
    const player = [toBucket(c1), toBucket(c2)];
    const up = toBucket(upCard);
    const counts = remainingBuckets(order, cursor - 1, hole);
    const action = (input.policy ?? compositionPolicy)({ counts, player, up });
    const settled = settleSimple(player, up, toBucket(hole), action);
    net += settled;
    for (let i = 0; i < input.backgroundCards && cursor < order.length && cursor < cutAt; i += 1) take();
  }
  return { net, rounds, report: { dealt: cursor, stopped: true } };
}

function remainingBuckets(order: readonly number[], nextIndex: number, holeAlreadyTaken: number): Uint8Array {
  const counts = bucketsFrom52(freshShoe52(8));
  for (let i = 0; i < nextIndex; i += 1) {
    if (i === nextIndex - 1) continue;
    const b = toBucket(order[i]!);
    counts[b] = Math.max(0, (counts[b] ?? 0) - 1);
  }
  // The hole is dealt but unseen, so it stays in the composition.
  void holeAlreadyTaken;
  return counts;
}

function settleSimple(player: number[], up: number, hole: number, action: string): number {
  const info = player;
  void info;
  const hand: SettledHand = {
    total: 20,
    bust: false,
    blackjack: false,
    charlie: false,
    cash: true,
    mode: action === "DOUBLE_FREE" ? "free-double" : action === "DOUBLE_REGULAR" ? "regular-double" : "plain",
  };
  // The Monte Carlo payoff path uses the shared settlement rules.
  // A full optimal playout is provided by the analytical engine; this shoe walker
  // only removes real cards and asks the policy for a decision.
  const dealer: DealerKind = up + hole === 0 ? { type: "bj" } : { type: "total", total: 20 };
  void hand;
  return handProfit(
    {
      ...hand,
      total: bucketTotal(player),
      bust: bucketTotal(player) > 21,
      blackjack: player.length === 2 && bucketTotal(player) === 21,
    },
    dealer.type === "bj" || (up === 0 && hole === 9) || (up === 9 && hole === 0) ? { type: "bj" } : dealer
  );
}

function bucketTotal(cards: number[]): number {
  let total = 0;
  let aces = 0;
  for (const c of cards) {
    if (c === 0) {
      aces += 1;
      total += 11;
    } else total += c === 9 ? 10 : c + 1;
  }
  while (total > 21 && aces > 0) {
    total -= 10;
    aces -= 1;
  }
  return total;
}

function cutIndex(cut: CutConfig, total: number): number {
  switch (cut.mode) {
    case "CUT_AFTER_CARDS_DEALT":
      return cut.cardsDealt;
    case "CUT_AFTER_REMAINING":
      return total - cut.cardsRemaining;
    case "PERCENT_PENETRATION":
      return Math.floor(total * cut.penetration);
    case "MANUAL":
      return total;
    default:
      return total;
  }
}

/** Frequency of suited perfect pairs in a shuffle. Does not call the combinatorial side-bet function. */
export function monteCarloPerfectPairRate(seed: number, trials: number): number {
  const rng = mulberry32(seed);
  let hits = 0;
  const shoe = freshShoe52(8);
  const n = 416;
  for (let t = 0; t < trials; t += 1) {
    const i = Math.floor(rng() * n);
    let j = Math.floor(rng() * (n - 1));
    if (j >= i) j += 1;
    const a = cardAt(shoe, i);
    const b = cardAt(shoe, j);
    if (a === b) hits += 1;
  }
  return hits / trials;
}

function cardAt(shoe: Uint8Array, index: number): number {
  let left = index;
  for (let i = 0; i < shoe.length; i += 1) {
    const c = shoe[i] ?? 0;
    if (left < c) return i;
    left -= c;
  }
  return 0;
}

export function fastAction(player: readonly number[], up: number): "HIT" | "STAND" | "DOUBLE_FREE" | "SPLIT_FREE" {
  if (player.length === 2 && player[0] === player[1] && player[0] !== 9 && player[0] !== undefined) {
    if (player[0] === 0 || player[0] === 7) return "SPLIT_FREE";
  }
  let total = 0;
  let aces = 0;
  for (const c of player) {
    if (c === 0) aces += 1;
    else total += c === 9 ? 10 : c + 1;
  }
  total += aces * 11;
  let soft = aces;
  while (total > 21 && soft > 0) {
    total -= 10;
    soft -= 1;
  }
  const hard = soft === 0;
  if (player.length === 2 && hard && total >= 9 && total <= 11) return "DOUBLE_FREE";
  if (total < 17) return "HIT";
  return "STAND";
}

/**
 * One shoe, cards drawn in order. The action function sees only the current hand and upcard.
 * Five- and ten-round totals are prefixes of the same consumed shoe, not a one-round EV times N.
 */
export function consumeShoe(input: {
  seed: number;
  cutDealt?: number;
  backgroundCards?: number;
  maxRounds?: number;
}): { net: number; rounds: number; dealt: number; after5: number | null; after10: number | null; ledger: Ledger } {
  const order = shuffleShoe(input.seed);
  const cut = input.cutDealt ?? 312;
  const background = input.backgroundCards ?? 2;
  let cursor = 0;
  let net = 0;
  let rounds = 0;
  let after5: number | null = null;
  let after10: number | null = null;
  let ledger = emptyLedger(0);
  const draw = () => order[cursor++];
  while (cursor + 4 < order.length && cursor < cut && rounds < (input.maxRounds ?? 1000)) {
    const c1 = draw();
    const upCard = draw();
    const c2 = draw();
    const hole = draw();
    if (c1 === undefined || upCard === undefined || c2 === undefined || hole === undefined) break;
    const player = [toBucket(c1), toBucket(c2)];
    const up = toBucket(upCard);
    const action = fastAction(player, up);
    if (action === "HIT" || action === "DOUBLE_FREE") {
      const extra = draw();
      if (extra !== undefined) player.push(toBucket(extra));
    }
    const dealerCards = [up, toBucket(hole)];
    let total = bucketTotal(dealerCards);
    let aces = dealerCards.filter((c) => c === 0).length;
    while (total < 17 && cursor < order.length) {
      const next = draw();
      if (next === undefined) break;
      dealerCards.push(toBucket(next));
      total = bucketTotal(dealerCards);
      aces = dealerCards.filter((c) => c === 0).length;
      void aces;
    }
    const kind: DealerKind =
      dealerCards.length === 2 && total === 21
        ? { type: "bj" }
        : total === 22
          ? { type: "22" }
          : total > 22
            ? { type: "bust" }
            : { type: "total", total };
    const playerTotal = bucketTotal(player);
    const unitNet = handProfit(
      {
        total: playerTotal,
        bust: playerTotal > 21,
        blackjack: player.length === 2 && playerTotal === 21 && action !== "SPLIT_FREE",
        charlie: player.length >= 6 && playerTotal <= 21,
        cash: true,
        mode: action === "DOUBLE_FREE" ? "free-double" : "plain",
      },
      kind
    );
    net += unitNet;
    const cashUnits = 1;
    ledger = applyToLedger(
      ledger,
      settlementFromUnit({
        shoeId: `sim-${input.seed}`,
        round: rounds + 1,
        unitNet,
        cashUnits,
        recommendation: "PLAY",
      })
    ).ledger;
    for (let i = 0; i < background && cursor < cut && cursor < order.length; i += 1) draw();
    rounds += 1;
    if (rounds === 5) after5 = net;
    if (rounds === 10) after10 = net;
  }
  return { net, rounds, dealt: cursor, after5, after10, ledger };
}

export function pairRank(card: number): FullRank {
  return indexParts(card).rank;
}

export function pairSuit(card: number): Suit {
  return indexParts(card).suit;
}

void SUITS;
void FULL_RANKS;
