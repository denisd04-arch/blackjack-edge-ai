import {
  type DealerDist,
  addDist,
  bucketValue,
  cloneDist,
  countsKey,
  emptyDist,
  sumBuckets,
  valueCards,
} from "./model";

export interface DealerMemos {
  known: Map<string, DealerDist>;
  up: Map<string, DealerDist>;
}

export function createDealerMemos(): DealerMemos {
  return { known: new Map(), up: new Map() };
}

function standKey(total: number): keyof DealerDist {
  if (total === 17) return "t17";
  if (total === 18) return "t18";
  if (total === 19) return "t19";
  if (total === 20) return "t20";
  return "t21";
}

/**
 * Dealer plays from `counts`, which still contains the hole.
 * Totals 17–21, blackjack, bust (23+), and 22 are separate.
 * Soft 17 stands.
 */
export function dealerDistribution(
  up: number,
  counts: Uint8Array,
  memos: DealerMemos,
  excludeBlackjack: boolean
): DealerDist {
  const topKey = `${up}|${excludeBlackjack ? 1 : 0}|${countsKey(counts)}`;
  const cachedTop = memos.up.get(topKey);
  if (cachedTop) return cachedTop;
  const total = sumBuckets(counts);
  if (total <= 0) return emptyDist();
  const acc = emptyDist();
  let mass = 0;
  for (let hole = 0; hole < 10; hole += 1) {
    const n = counts[hole]!;
    if (n <= 0) continue;
    const bj =
      (up === 0 && hole === 9) || (up === 9 && hole === 0);
    if (excludeBlackjack && bj) continue;
    const p = n / total;
    counts[hole] = n - 1;
    const sub = dealerFromCards([up, hole], counts, memos);
    counts[hole] = n;
    addDist(acc, p, sub);
    mass += p;
  }
  if (mass <= 0) {
    memos.up.set(topKey, emptyDist());
    return emptyDist();
  }
  if (Math.abs(mass - 1) > 1e-12) {
    const scale = 1 / mass;
    const scaled: DealerDist = {
      t17: acc.t17 * scale,
      t18: acc.t18 * scale,
      t19: acc.t19 * scale,
      t20: acc.t20 * scale,
      t21: acc.t21 * scale,
      bj: acc.bj * scale,
      bust: acc.bust * scale,
      t22: acc.t22 * scale,
    };
    memos.up.set(topKey, scaled);
    return scaled;
  }
  memos.up.set(topKey, acc);
  return acc;
}

function dealerFromCards(
  cards: number[],
  counts: Uint8Array,
  memos: DealerMemos
): DealerDist {
  const key = `${cards.join(".")}|${countsKey(counts)}`;
  const cached = memos.known.get(key);
  if (cached) return cached;

  const info = valueCards(cards);
  const done = emptyDist();
  if (info.total > 22) {
    done.bust = 1;
  } else if (info.total === 22) {
    done.t22 = 1;
  } else if (cards.length === 2 && info.blackjack) {
    done.bj = 1;
  } else if (info.total > 21) {
    done.bust = 1;
  } else if (info.total >= 17) {
    done[standKey(info.total)] = 1;
  } else {
    const n = sumBuckets(counts);
    if (n <= 0) {
      done[standKey(Math.min(21, Math.max(17, info.total)))] = 1;
    } else {
      for (let r = 0; r < 10; r += 1) {
        const c = counts[r]!;
        if (c <= 0) continue;
        counts[r] = c - 1;
        cards.push(r);
        const sub = dealerFromCards(cards, counts, memos);
        cards.pop();
        counts[r] = c;
        addDist(done, c / n, sub);
      }
    }
  }
  const frozen = cloneDist(done);
  memos.known.set(key, frozen);
  return frozen;
}

export function dealerDrawsToBust(
  counts: Uint8Array,
  memos: DealerMemos
): { including22: number[]; excluding22: number[]; exact22: number } {
  const including22 = new Array<number>(9).fill(0);
  const excluding22 = new Array<number>(9).fill(0);
  let exact22 = 0;
  const total = sumBuckets(counts);
  if (total <= 0) return { including22, excluding22, exact22 };

  function walk(cards: number[]): { p22: number; pOver: number; pOther: number } {
    const info = valueCards(cards);
    if (cards.length >= 2 && (info.total >= 22 || info.total >= 17 || info.blackjack)) {
      if (info.total === 22) return { p22: 1, pOver: 0, pOther: 0 };
      if (info.total > 22) return { p22: 0, pOver: 1, pOther: 0 };
      return { p22: 0, pOver: 0, pOther: 1 };
    }
    const n = sumBuckets(counts);
    if (n <= 0) return { p22: 0, pOver: 0, pOther: 1 };
    let p22 = 0;
    let pOver = 0;
    let pOther = 0;
    for (let r = 0; r < 10; r += 1) {
      const c = counts[r]!;
      if (c <= 0) continue;
      counts[r] = c - 1;
      cards.push(r);
      const sub = walk(cards);
      cards.pop();
      counts[r] = c;
      const p = c / n;
      p22 += p * sub.p22;
      pOver += p * sub.pOver;
      pOther += p * sub.pOther;
    }
    return { p22, pOver, pOther };
  }

  function walkCounted(cards: number[]): void {
    const info = valueCards(cards);
    const finished =
      cards.length >= 2 &&
      (info.bust || info.total === 22 || info.total >= 17 || (cards.length === 2 && info.blackjack));
    if (finished) {
      const slot = Math.min(8, cards.length);
      if (info.total === 22) {
        including22[slot] = (including22[slot] ?? 0) + 1;
      } else if (info.total > 22) {
        including22[slot] = (including22[slot] ?? 0) + 1;
        excluding22[slot] = (excluding22[slot] ?? 0) + 1;
      }
      return;
    }
    const n = sumBuckets(counts);
    if (n <= 0) return;
    for (let r = 0; r < 10; r += 1) {
      const c = counts[r]!;
      if (c <= 0) continue;
      const p = c / n;
      counts[r] = c - 1;
      cards.push(r);
      const beforeIn = including22.slice();
      const beforeEx = excluding22.slice();
      including22.fill(0);
      excluding22.fill(0);
      walkCounted(cards);
      for (let i = 0; i < 9; i += 1) {
        beforeIn[i] = (beforeIn[i] ?? 0) + p * (including22[i] ?? 0);
        beforeEx[i] = (beforeEx[i] ?? 0) + p * (excluding22[i] ?? 0);
      }
      for (let i = 0; i < 9; i += 1) {
        including22[i] = beforeIn[i] ?? 0;
        excluding22[i] = beforeEx[i] ?? 0;
      }
      cards.pop();
      counts[r] = c;
    }
  }

  // The probability walk above is exact but the counted version re-walks.
  // Use one memoized recursion that records card-count mass directly.
  const memo = new Map<string, { inc: Float64Array; exc: Float64Array }>();
  function rec(cards: number[]): { inc: Float64Array; exc: Float64Array } {
    const key = `${cards.join(".")}|${countsKey(counts)}`;
    const hit = memo.get(key);
    if (hit) return hit;
    const inc = new Float64Array(9);
    const exc = new Float64Array(9);
    const info = valueCards(cards);
    const finished =
      cards.length >= 2 &&
      (info.total >= 22 || info.total >= 17 || (cards.length === 2 && info.blackjack));
    if (finished) {
      if (info.total >= 22) {
        const slot = Math.min(8, cards.length);
        inc[slot] = 1;
        if (info.total > 22) exc[slot] = 1;
      }
      const frozen = { inc, exc };
      memo.set(key, frozen);
      return frozen;
    }
    const n = sumBuckets(counts);
    if (n <= 0) {
      memo.set(key, { inc, exc });
      return { inc, exc };
    }
    for (let r = 0; r < 10; r += 1) {
      const c = counts[r]!;
      if (c <= 0) continue;
      counts[r] = c - 1;
      cards.push(r);
      const sub = rec(cards);
      cards.pop();
      counts[r] = c;
      const p = c / n;
      for (let i = 0; i < 9; i += 1) {
        inc[i] += p * sub.inc[i]!;
        exc[i] += p * sub.exc[i]!;
      }
    }
    memo.set(key, { inc, exc });
    return { inc, exc };
  }

  // Draw the first two cards through the recursion by starting empty.
  // `rec` only settles at length >= 2, so start by drawing inside rec from [].
  const root = rec([]);
  for (let i = 0; i < 9; i += 1) {
    including22[i] = root.inc[i] ?? 0;
    excluding22[i] = root.exc[i] ?? 0;
  }
  exact22 = including22.reduce((s, x) => s + x, 0) - excluding22.reduce((s, x) => s + x, 0);
  void walk;
  void walkCounted;
  void bucketValue;
  void exact22;
  return {
    including22,
    excluding22,
    exact22: Math.max(0, exact22),
  };
}
