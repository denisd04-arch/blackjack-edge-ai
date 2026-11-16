import { sumBuckets, valueCards } from "./model";

export interface FreeBetChances {
  pFreeDouble: number;
  pFreeSplit: number;
  pBoth: number;
  pEither: number;
  pNeither: number;
}

/** Exact two-card chances from the remaining rank composition. */
export function freeBetProbabilities(counts: Uint8Array): FreeBetChances {
  const n = sumBuckets(counts);
  if (n < 2) {
    return { pFreeDouble: 0, pFreeSplit: 0, pBoth: 0, pEither: 0, pNeither: 1 };
  }
  let pFreeDouble = 0;
  let pFreeSplit = 0;
  let pBoth = 0;
  for (let c1 = 0; c1 < 10; c1 += 1) {
    const a = counts[c1] ?? 0;
    if (a <= 0) continue;
    for (let c2 = 0; c2 < 10; c2 += 1) {
      const b = c1 === c2 ? a - 1 : (counts[c2] ?? 0);
      if (b <= 0) continue;
      const p = (a / n) * (b / (n - 1));
      const info = valueCards([c1, c2]);
      const freeDouble = info.hardTotal === 9 || info.hardTotal === 10 || info.hardTotal === 11;
      const freeSplit = c1 === c2 && c1 !== 9;
      if (freeDouble) pFreeDouble += p;
      if (freeSplit) pFreeSplit += p;
      if (freeDouble && freeSplit) pBoth += p;
    }
  }
  const pEither = pFreeDouble + pFreeSplit - pBoth;
  return {
    pFreeDouble,
    pFreeSplit,
    pBoth,
    pEither,
    pNeither: 1 - pEither,
  };
}
