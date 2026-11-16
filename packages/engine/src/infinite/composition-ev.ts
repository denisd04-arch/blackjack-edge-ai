import { createDealerMemos, dealerDistribution } from "./dealer";
import type { RoundEv } from "./ev";
import {
  type Moments,
  type StakeMode,
  mixMoments,
  pointMass,
  settleHands,
  sumBuckets,
  valueCards,
  varianceOf,
} from "./model";
import { definitiveRulesAllowed } from "./rules";

/** Product rules used for the live edge. Audit runs pass a different set and do not replace this. */
export interface EvAssumptions {
  pushOn22: boolean;
  freeDouble: boolean;
  freeSplit: boolean;
  doubleAfterSplit: boolean;
  maxHands: number;
  charlie: boolean;
  splitAces: boolean;
}

export const PRODUCT_ASSUMPTIONS: EvAssumptions = {
  pushOn22: true,
  freeDouble: true,
  freeSplit: true,
  doubleAfterSplit: true,
  maxHands: 4,
  charlie: true,
  splitAces: true,
};

const MODE: Record<0 | 1 | 2, StakeMode> = {
  0: "plain",
  1: "free-double",
  2: "regular-double",
};

/**
 * Next-round main EV from the remaining rank composition.
 *
 * The opening is weighted by the exact hypergeometric deal. Dealer totals,
 * including 22, are the depleting shoe. Later player draws use that same
 * composition with replacement, so a long shoe is marked approximate.
 * The published house edge is not an input.
 */
export function compositionNextRound(
  counts: Uint8Array,
  assumptions: EvAssumptions = PRODUCT_ASSUMPTIONS
): RoundEv {
  if (!definitiveRulesAllowed() || sumBuckets(counts) < 4) {
    return blank();
  }
  const saved = counts.slice();
  const solvers = new Map<number, Solver>();
  for (let up = 0; up < 10; up += 1) {
    if ((counts[up] ?? 0) <= 0) continue;
    solvers.set(up, createSolver(counts, up, true, assumptions));
  }
  const n0 = sumBuckets(counts);
  const parts: { p: number; m: Moments }[] = [];
  try {
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
        const pBj = peekMass(up, counts);
        counts[up] = c;
        const solver = solvers.get(up);
        if (!solver) continue;
        const info = valueCards([c1, c2]);
        const played = info.blackjack
          ? mixMoments([
              { p: pBj, m: pointMass(0) },
              { p: 1 - pBj, m: pointMass(1.5) },
            ])
          : mixMoments([
              { p: pBj, m: pointMass(-1) },
              { p: 1 - pBj, m: solver.play([c1, c2], true, false, 1).moments },
            ]);
        parts.push({ p, m: played });
      }
      counts[c2] = b;
    }
    counts[c1] = a;
  }
  } finally {
    counts.set(saved);
  }
  const mixed = mixMoments(parts);
  return {
    ev: mixed.ev,
    variance: varianceOf(mixed),
    win: mixed.win,
    push: mixed.push,
    loss: mixed.loss,
    bust: mixed.bust,
    quality: "APPROXIMATE",
  };
}

/** Best action for a hand already removed from `counts`, using the same composition model. */
export function compositionHandEv(
  counts: Uint8Array,
  cards: readonly number[],
  up: number
): { action: string; moments: Moments } {
  const info = valueCards(cards);
  const pBj = cards.length === 2 ? peekMass(up, counts) : 0;
  if (info.blackjack) {
    return {
      action: "STAND",
      moments: mixMoments([
        { p: pBj, m: pointMass(0) },
        { p: 1 - pBj, m: pointMass(1.5) },
      ]),
    };
  }
  const solver = createSolver(counts, up, false, PRODUCT_ASSUMPTIONS);
  const played = solver.play([...cards], true, false, 1);
  return {
    action: played.action,
    moments: mixMoments([
      { p: pBj, m: pointMass(cards.length === 2 ? -1 : played.moments.ev) },
      { p: 1 - pBj, m: played.moments },
    ]),
  };
}

interface Played {
  action: string;
  moments: Moments;
}

interface Solver {
  play: (cards: number[], cash: boolean, aceLock: boolean, handCount: number) => Played;
}

function createSolver(
  counts: Uint8Array,
  up: number,
  removeUpcard: boolean,
  assumptions: EvAssumptions
): Solver {
  const work = counts.slice();
  if (removeUpcard && (work[up] ?? 0) > 0) work[up] = (work[up] ?? 0) - 1;
  const raw = dealerDistribution(up, work, createDealerMemos(), true);
  const dist = assumptions.pushOn22
    ? raw
    : { ...raw, bust: raw.bust + raw.t22, t22: 0 };
  const n = sumBuckets(work);
  const prob = new Float64Array(10);
  for (let r = 0; r < 10; r += 1) prob[r] = n > 0 ? (work[r] ?? 0) / n : 0;
  const memo = new Map<string, Played>();

  function finish(cards: readonly number[], cash: boolean, dbl: 0 | 1 | 2): Moments {
    const info = valueCards(cards);
    return settleHands(
      [
        {
          total: info.total,
          bust: info.bust,
          blackjack: false,
          charlie: assumptions.charlie && info.charlie,
          cash,
          mode: MODE[dbl],
        },
      ],
      dist
    );
  }

  function play(cards: number[], cash: boolean, aceLock: boolean, handCount: number): Played {
    const sorted = [...cards].sort((a, b) => a - b);
    const key = `${sorted.join(".")}|${cash ? 1 : 0}|${aceLock ? 1 : 0}|${handCount}`;
    const cached = memo.get(key);
    if (cached) return cached;
    const info = valueCards(sorted);
    const charlie = assumptions.charlie && info.charlie;
    let action = "STAND";
    let best = finish(sorted, cash, 0);
    if (!info.bust && !aceLock && !charlie && sorted.length < 6) {
      const hits: { p: number; m: Moments }[] = [];
      for (let r = 0; r < 10; r += 1) {
        if (prob[r]! <= 0) continue;
        hits.push({ p: prob[r]!, m: play([...sorted, r], cash, false, handCount).moments });
      }
      if (hits.length > 0) {
        const hit = mixMoments(hits);
        if (hit.ev > best.ev) {
          best = hit;
          action = "HIT";
        }
      }
      const hard = info.hardTotal;
      const canDouble =
        sorted.length === 2 &&
        hard !== null &&
        (hard === 9 || hard === 10 || hard === 11) &&
        (assumptions.doubleAfterSplit || handCount === 1);
      if (canDouble) {
        const modes = (assumptions.freeDouble ? [1, 2] : [2]) as (1 | 2)[];
        for (const dbl of modes) {
          const draws: { p: number; m: Moments }[] = [];
          for (let r = 0; r < 10; r += 1) {
            if (prob[r]! <= 0) continue;
            draws.push({ p: prob[r]!, m: finish([...sorted, r], cash, dbl) });
          }
          const doubled = mixMoments(draws);
          if (doubled.ev > best.ev) {
            best = doubled;
            action = dbl === 1 ? "DOUBLE_FREE" : "DOUBLE_REGULAR";
          }
        }
      }
      if (
        info.pair &&
        sorted.length === 2 &&
        handCount < assumptions.maxHands &&
        sorted[0] !== undefined &&
        (sorted[0] !== 0 || assumptions.splitAces)
      ) {
        const split = splitHands(sorted[0], cash, handCount);
        if (split.ev > best.ev) {
          best = split;
          action = sorted[0] === 9 ? "SPLIT_REGULAR" : "SPLIT_FREE";
        }
      }
    }
    const played = { action, moments: best };
    memo.set(key, played);
    return played;
  }

  function splitHands(rank: number, cash: boolean, handCount: number): Moments {
    const aces = rank === 0;
    const rightCash = assumptions.freeSplit ? rank === 9 : true;
    const parts: { p: number; m: Moments }[] = [];
    for (let r1 = 0; r1 < 10; r1 += 1) {
      if (prob[r1]! <= 0) continue;
      for (let r2 = 0; r2 < 10; r2 += 1) {
        if (prob[r2]! <= 0) continue;
        const left = play([rank, r1], cash, aces, handCount + 1).moments;
        const right = play([rank, r2], rightCash, aces, handCount + 1).moments;
        parts.push({ p: prob[r1]! * prob[r2]!, m: addHands(left, right) });
      }
    }
    return mixMoments(parts);
  }

  return { play };
}

function addHands(a: Moments, b: Moments): Moments {
  return spread(a.ev + b.ev, a.second + b.second + 2 * a.ev * b.ev);
}

/** A +1 / −1 stand-in so split outcomes still sum to probability 1. EV is unchanged. */
function spread(ev: number, second: number): Moments {
  if (ev >= 1) return { ev, second, win: 1, push: 0, loss: 0, bust: 0 };
  if (ev <= -1) return { ev, second, win: 0, push: 0, loss: 1, bust: 0 };
  const win = (ev + 1) / 2;
  return { ev, second, win, push: 0, loss: 1 - win, bust: 0 };
}

function peekMass(up: number, counts: Uint8Array): number {
  const n = sumBuckets(counts);
  if (n <= 0) return 0;
  if (up === 0) return (counts[9] ?? 0) / n;
  if (up === 9) return (counts[0] ?? 0) / n;
  return 0;
}

function blank(): RoundEv {
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
