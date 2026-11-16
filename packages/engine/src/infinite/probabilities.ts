import { sumBuckets, valueCards } from "./model";

export interface FreeBetChances {
  pFreeDouble: number;
  pFreeSplit: number;
  pBoth: number;
  pEither: number;
  pNeither: number;
}

/** Opening free double is a two-card hard 9, 10, or 11. An ace, a ten, or a third card does not qualify. */
export function isOpeningFreeDouble(cards: readonly number[]): boolean {
  if (cards.length !== 2) return false;
  const hard = valueCards(cards).hardTotal;
  return hard === 9 || hard === 10 || hard === 11;
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
      const freeDouble = isOpeningFreeDouble([c1, c2]);
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
