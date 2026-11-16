import { dealerDistribution, createDealerMemos, type DealerMemos } from "./dealer";
import {
  type Moments,
  type SettledHand,
  type StakeMode,
  countsKey,
  mixMoments,
  pointMass,
  settleHands,
  sumBuckets,
  valueCards,
  varianceOf,
} from "./model";
import { definitiveRulesAllowed, rulesFromFields, type InfiniteRules } from "./rules";

export type ActionName =
  | "HIT"
  | "STAND"
  | "DOUBLE_FREE"
  | "DOUBLE_REGULAR"
  | "SPLIT_FREE"
  | "SPLIT_REGULAR";

export interface ActionEval {
  action: ActionName;
  ev: number;
  variance: number;
  win: number;
  push: number;
  loss: number;
  bust: number;
}

interface PHand {
  cards: number[];
  cash: boolean;
  aceLock: boolean;
  /** 0 none, 1 free double, 2 regular double. */
  dbl: 0 | 1 | 2;
  stood: boolean;
  naturalOk: boolean;
}

const MODE: Record<0 | 1 | 2, StakeMode> = {
  0: "plain",
  1: "free-double",
  2: "regular-double",
};

function settled(hand: PHand): SettledHand {
  const info = valueCards(hand.cards);
  return {
    total: info.total,
    bust: info.bust,
    blackjack: hand.naturalOk && info.blackjack,
    charlie: info.charlie,
    cash: hand.cash,
    mode: MODE[hand.dbl],
  };
}

function handKey(hands: readonly PHand[], turn: number): string {
  let s = String(turn);
  for (const h of hands) {
    s += `/${h.cards.join(".")}:${h.cash ? 1 : 0}${h.aceLock ? 1 : 0}${h.dbl}${h.stood ? 1 : 0}${h.naturalOk ? 1 : 0}`;
  }
  return s;
}

function isDone(hand: PHand): boolean {
  if (hand.stood || hand.dbl !== 0 || hand.aceLock) return true;
  const info = valueCards(hand.cards);
  if (info.bust || info.charlie) return true;
  if (hand.naturalOk && info.blackjack) return true;
  return false;
}

export interface SolveLimits {
  memo?: Map<string, Moments>;
  dealer?: DealerMemos;
  nodes: { n: number; degraded: boolean };
  maxNodes: number;
}

function limits(seed?: Partial<SolveLimits>): SolveLimits {
  return {
    memo: seed?.memo ?? new Map(),
    dealer: seed?.dealer ?? createDealerMemos(),
    nodes: seed?.nodes ?? { n: 0, degraded: false },
    maxNodes: seed?.maxNodes ?? 400_000,
  };
}

function bestMoments(
  counts: Uint8Array,
  hands: PHand[],
  turn: number,
  up: number,
  noBj: boolean,
  ctx: SolveLimits
): Moments {
  while (turn < hands.length && isDone(hands[turn]!)) turn += 1;
  if (turn >= hands.length) {
    const dist = dealerDistribution(up, counts, ctx.dealer!, noBj);
    return settleHands(hands.map(settled), dist);
  }
  const key = `${countsKey(counts)}|${up}|${noBj ? 1 : 0}|${handKey(hands, turn)}`;
  const cached = ctx.memo!.get(key);
  if (cached) return cached;
  ctx.nodes.n += 1;
  if (ctx.nodes.n > ctx.maxNodes) {
    throw new Error("EV_NODE_BUDGET");
  }

  const hand = hands[turn]!;
  const info = valueCards(hand.cards);
  let best: Moments | null = null;

  const consider = (m: Moments) => {
    if (!best || m.ev > best.ev) best = m;
  };

  const stood: PHand = { ...hand, cards: hand.cards, stood: true };
  const afterStand = hands.slice();
  afterStand[turn] = stood;
  consider(bestMoments(counts, afterStand, turn + 1, up, noBj, ctx));

  const canHit = hand.cards.length < 6 && sumBuckets(counts) > 0;
  if (canHit) {
    const n = sumBuckets(counts);
    const parts: { p: number; m: Moments }[] = [];
    for (let r = 0; r < 10; r += 1) {
      const c = counts[r]!;
      if (c <= 0) continue;
      counts[r] = c - 1;
      const next = hands.slice();
      next[turn] = { ...hand, cards: [...hand.cards, r] };
      parts.push({
        p: c / n,
        m: bestMoments(counts, next, turn, up, noBj, ctx),
      });
      counts[r] = c;
    }
    consider(mixMoments(parts));
  }

  const hard = info.hardTotal;
  const opened = hands.length === 1 || hand.cards.length === 2;
  const dasOk = hands.length === 1 || true;
  if (
    hand.cards.length === 2 &&
    !hand.aceLock &&
    hard !== null &&
    (hard === 9 || hard === 10 || hard === 11) &&
    opened &&
    dasOk &&
    sumBuckets(counts) > 0
  ) {
    consider(doubleMoments(counts, hands, turn, up, noBj, ctx, 1));
    consider(doubleMoments(counts, hands, turn, up, noBj, ctx, 2));
  }

  if (
    info.pair &&
    !hand.aceLock &&
    hands.length < 4 &&
    sumBuckets(counts) >= 2 &&
    hand.cards[0] !== undefined
  ) {
    const rank = hand.cards[0];
    const free = rank !== 9;
    if (free || rank === 9) {
      try {
        consider(splitMoments(counts, hands, turn, up, noBj, ctx, free));
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "EV_NODE_BUDGET") throw error;
        ctx.nodes.degraded = true;
      }
    }
  }

  if (!best) best = pointMass(0);
  ctx.memo!.set(key, best);
  return best;
}

function doubleMoments(
  counts: Uint8Array,
  hands: PHand[],
  turn: number,
  up: number,
  noBj: boolean,
  ctx: SolveLimits,
  dbl: 1 | 2
): Moments {
  const n = sumBuckets(counts);
  const hand = hands[turn]!;
  const parts: { p: number; m: Moments }[] = [];
  for (let r = 0; r < 10; r += 1) {
    const c = counts[r]!;
    if (c <= 0) continue;
    counts[r] = c - 1;
    const next = hands.slice();
    next[turn] = { ...hand, cards: [...hand.cards, r], dbl, naturalOk: false };
    parts.push({
      p: c / n,
      m: bestMoments(counts, next, turn + 1, up, noBj, ctx),
    });
    counts[r] = c;
  }
  return mixMoments(parts);
}

function splitMoments(
  counts: Uint8Array,
  hands: PHand[],
  turn: number,
  up: number,
  noBj: boolean,
  ctx: SolveLimits,
  free: boolean
): Moments {
  const base = hands[turn]!;
  const pairRank = base.cards[0]!;
  const aces = pairRank === 0;
  const n = sumBuckets(counts);
  const parts: { p: number; m: Moments }[] = [];
  for (let r1 = 0; r1 < 10; r1 += 1) {
    const c1 = counts[r1]!;
    if (c1 <= 0) continue;
    counts[r1] = c1 - 1;
    const n2 = n - 1;
    for (let r2 = 0; r2 < 10; r2 += 1) {
      const c2 = counts[r2]!;
      if (c2 <= 0) continue;
      counts[r2] = c2 - 1;
      const left: PHand = {
        cards: [pairRank, r1],
        cash: base.cash,
        aceLock: aces,
        dbl: 0,
        stood: false,
        naturalOk: false,
      };
      const right: PHand = {
        cards: [pairRank, r2],
        cash: free ? false : true,
        aceLock: aces,
        dbl: 0,
        stood: false,
        naturalOk: false,
      };
      const next = hands.slice();
      next.splice(turn, 1, left, right);
      parts.push({
        p: (c1 / n) * (c2 / n2),
        m: bestMoments(counts, next, turn, up, noBj, ctx),
      });
      counts[r2] = c2;
    }
    counts[r1] = c1;
  }
  return mixMoments(parts);
}

function peekMass(up: number, counts: Uint8Array): number {
  const n = sumBuckets(counts);
  if (n <= 0) return 0;
  if (up === 0) return (counts[9] ?? 0) / n;
  if (up === 9) return (counts[0] ?? 0) / n;
  return 0;
}

export function evaluateActions(
  counts: Uint8Array,
  cards: readonly number[],
  up: number,
  ctxIn?: SolveLimits
): { actions: ActionEval[]; best: ActionName; moments: Moments; quality: "EXACT" } {
  const ctx = ctxIn ?? limits();
  const info = valueCards(cards);
  const base: PHand = {
    cards: [...cards],
    cash: true,
    aceLock: false,
    dbl: 0,
    stood: false,
    naturalOk: true,
  };
  const hands = [base];
  const noBj = true;
  const actions: ActionEval[] = [];

  const push = (action: ActionName, m: Moments) => {
    actions.push({
      action,
      ev: m.ev,
      variance: varianceOf(m),
      win: m.win,
      push: m.push,
      loss: m.loss,
      bust: m.bust,
    });
  };

  const peeked = cards.length === 2;
  const wrap = (play: () => Moments) => (peeked ? applyPeek(counts, up, play) : play());
  if (info.blackjack) {
    push("STAND", mixMoments([
      { p: peekMass(up, counts), m: pointMass(0) },
      { p: 1 - peekMass(up, counts), m: pointMass(1.5) },
    ]));
  } else if (info.charlie || info.bust) {
    push("STAND", wrap(() => bestMoments(counts, [{ ...base, stood: true }], 0, up, noBj, ctx)));
  } else {
    push("STAND", wrap(() => bestMoments(counts, [{ ...base, stood: true }], 0, up, noBj, ctx)));
    if (cards.length < 6 && sumBuckets(counts) > 0) {
      push("HIT", wrap(() => hitOnly(counts, hands, up, ctx)));
    }
    if (
      cards.length === 2 &&
      info.hardTotal !== null &&
      info.hardTotal >= 9 &&
      info.hardTotal <= 11 &&
      sumBuckets(counts) > 0
    ) {
      push("DOUBLE_FREE", wrap(() => doubleMoments(counts, hands, 0, up, noBj, ctx, 1)));
      push("DOUBLE_REGULAR", wrap(() => doubleMoments(counts, hands, 0, up, noBj, ctx, 2)));
    }
    if (info.pair && cards[0] !== undefined && sumBuckets(counts) >= 2) {
      const free = cards[0] !== 9;
      try {
        push(
          free ? "SPLIT_FREE" : "SPLIT_REGULAR",
          wrap(() => splitMoments(counts, hands, 0, up, noBj, ctx, free))
        );
      } catch (error) {
        if (!(error instanceof Error) || error.message !== "EV_NODE_BUDGET") throw error;
      }
    }
  }

  let best = actions[0]!;
  for (const a of actions) if (a.ev > best.ev) best = a;
  return { actions, best: best.action, moments: {
    ev: best.ev,
    second: best.variance + best.ev * best.ev,
    win: best.win,
    push: best.push,
    loss: best.loss,
    bust: best.bust,
  }, quality: "EXACT" };
}

function hitOnly(counts: Uint8Array, hands: PHand[], up: number, ctx: SolveLimits): Moments {
  const n = sumBuckets(counts);
  const hand = hands[0]!;
  const parts: { p: number; m: Moments }[] = [];
  for (let r = 0; r < 10; r += 1) {
    const c = counts[r]!;
    if (c <= 0) continue;
    counts[r] = c - 1;
    const next = [{ ...hand, cards: [...hand.cards, r] }];
    parts.push({ p: c / n, m: bestMoments(counts, next, 0, up, true, ctx) });
    counts[r] = c;
  }
  return mixMoments(parts);
}

function applyPeek(counts: Uint8Array, up: number, play: () => Moments): Moments {
  const pBj = peekMass(up, counts);
  if (pBj <= 0) return play();
  const cont = play();
  return mixMoments([
    { p: pBj, m: pointMass(-1) },
    { p: 1 - pBj, m: cont },
  ]);
}

/**
 * Exact EV of optimal play for a dealt hand.
 * Dealer blackjack is settled before extra player stakes when the upcard can be a natural.
 * A player natural pushes a dealer natural and wins 3:2 otherwise, including against 22.
 */
export function handMainEv(
  counts: Uint8Array,
  cards: readonly number[],
  up: number,
  ctxIn?: SolveLimits
): Moments {
  const ctx = ctxIn ?? limits();
  const info = valueCards(cards);
  const pBj = cards.length === 2 ? peekMass(up, counts) : 0;
  if (info.blackjack) {
    return mixMoments([
      { p: pBj, m: pointMass(0) },
      { p: 1 - pBj, m: pointMass(1.5) },
    ]);
  }
  const cont = bestMoments(
    counts,
    [{ cards: [...cards], cash: true, aceLock: false, dbl: 0, stood: false, naturalOk: cards.length === 2 }],
    0,
    up,
    true,
    ctx
  );
  if (pBj <= 0) return cont;
  return mixMoments([
    { p: pBj, m: pointMass(-1) },
    { p: 1 - pBj, m: cont },
  ]);
}

export interface RoundEv {
  ev: number;
  variance: number;
  win: number;
  push: number;
  loss: number;
  bust: number;
  quality: "EXACT" | "APPROXIMATE" | "MONTE_CARLO" | "INSUFFICIENT_DATA";
  trials?: number;
  standardError?: number;
  interval95?: [number, number];
  seed?: number;
}

/**
 * Next-round main-game EV from the remaining rank composition.
 * Optimal play is solved inside the round. Free-bet value is not added on top.
 * This does not read the help-screen RTP.
 */
export function nextRoundMainEv(counts: Uint8Array, seed = 1): RoundEv {
  if (!definitiveRulesAllowed()) {
    return {
      ev: 0,
      variance: 0,
      win: 0,
      push: 0,
      loss: 0,
      bust: 0,
      quality: "INSUFFICIENT_DATA",
    };
  }
  const ctx = limits();
  const saved = counts.slice();
  try {
    const n0 = sumBuckets(counts);
    if (n0 < 4) {
      return { ev: 0, variance: 0, win: 0, push: 0, loss: 0, bust: 0, quality: "INSUFFICIENT_DATA" };
    }
    let ev = 0;
    let second = 0;
    let win = 0;
    let push = 0;
    let loss = 0;
    let bust = 0;
    for (let c1 = 0; c1 < 10; c1 += 1) {
      const a = counts[c1]!;
      if (a <= 0) continue;
      const p1 = a / n0;
      counts[c1] = a - 1;
      const n1 = n0 - 1;
      for (let c2 = 0; c2 < 10; c2 += 1) {
        const b = counts[c2]!;
        if (b <= 0) continue;
        const p2 = b / n1;
        counts[c2] = b - 1;
        const n2 = n1 - 1;
        for (let up = 0; up < 10; up += 1) {
          const c = counts[up]!;
          if (c <= 0) continue;
          const p = p1 * p2 * (c / n2);
          counts[up] = c - 1;
          ctx.nodes.n = 0;
          const m = handMainEv(counts, [c1, c2], up, ctx);
          counts[up] = c;
          ev += p * m.ev;
          second += p * m.second;
          win += p * m.win;
          push += p * m.push;
          loss += p * m.loss;
          bust += p * m.bust;
        }
        counts[c2] = b;
      }
      counts[c1] = a;
    }
    counts.set(saved);
    return {
      ev,
      variance: Math.max(0, second - ev * ev),
      win,
      push,
      loss,
      bust,
      quality: ctx.nodes.degraded ? "APPROXIMATE" : "EXACT",
      trials: ctx.nodes.degraded ? ctx.nodes.n : undefined,
    };
  } catch (error) {
    counts.set(saved);
    if (error instanceof Error && error.message === "EV_NODE_BUDGET") {
      return monteCarloRound(saved, seed);
    }
    throw error;
  }
}

/** Unbiased sample of optimal-play EV. Each trial is dealt from the remaining composition. */
export function estimateNextRound(counts: Uint8Array, seed = 1, trials = 12): RoundEv {
  return monteCarloRound(counts, seed, trials);
}

function monteCarloRound(counts: Uint8Array, seed: number, trials = 24): RoundEv {
  const rng = mulberry32(seed);
  const samples: number[] = [];
  for (let i = 0; i < trials; i += 1) {
    const work = counts.slice();
    const deal = draw3(work, rng);
    if (!deal) break;
    const ctx = limits({ maxNodes: 200_000 });
    try {
      samples.push(handMainEv(work, [deal[0], deal[1]], deal[2], ctx).ev);
    } catch {
      samples.push(0);
    }
  }
  const n = samples.length || 1;
  const mean = samples.reduce((s, x) => s + x, 0) / n;
  const varS = samples.reduce((s, x) => s + (x - mean) ** 2, 0) / Math.max(1, n - 1);
  const se = Math.sqrt(varS / n);
  return {
    ev: mean,
    variance: varS,
    win: 0,
    push: 0,
    loss: 0,
    bust: 0,
    quality: "MONTE_CARLO",
    trials: n,
    standardError: se,
    interval95: [mean - 1.96 * se, mean + 1.96 * se],
    seed,
  };
}

function draw3(counts: Uint8Array, rng: () => number): [number, number, number] | null {
  const drawn: number[] = [];
  for (let k = 0; k < 3; k += 1) {
    const n = sumBuckets(counts);
    if (n <= 0) return null;
    let t = rng() * n;
    let pick = 0;
    for (let r = 0; r < 10; r += 1) {
      t -= counts[r]!;
      if (t < 0) {
        pick = r;
        break;
      }
    }
    counts[pick] = counts[pick]! - 1;
    drawn.push(pick);
  }
  return [drawn[0]!, drawn[1]!, drawn[2]!];
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function activeRules(): InfiniteRules {
  return rulesFromFields().rules;
}

/** Insurance EV per 1 unit staked, dealer ace already removed from `counts`. Pays 2:1. */
export function insuranceEv(counts: Uint8Array): {
  probabilityTen: number;
  evPerUnit: number;
  recommendation: "BET" | "SKIP" | "SKIP_INSUFFICIENT";
} {
  const n = sumBuckets(counts);
  if (n <= 0) {
    return { probabilityTen: 0, evPerUnit: 0, recommendation: "SKIP_INSUFFICIENT" };
  }
  const p = (counts[9] ?? 0) / n;
  const ev = 3 * p - 1;
  return {
    probabilityTen: p,
    evPerUnit: ev,
    recommendation: ev > 0 ? "BET" : "SKIP",
  };
}
