import type { FullRank } from "./model";
import { FULL_RANKS } from "./model";

export type CountSystemId = "hi_lo" | "ko" | "omega_ii" | "zen";

/** Published weights, in FULL_RANKS order. Not estimated from this shoe. */
export const COUNT_WEIGHTS: Record<CountSystemId, readonly number[]> = {
  hi_lo: [-1, 1, 1, 1, 1, 1, 0, 0, 0, -1, -1, -1, -1],
  ko: [-1, 1, 1, 1, 1, 1, 1, 0, 0, -1, -1, -1, -1],
  omega_ii: [0, 1, 1, 2, 2, 2, 1, 0, -1, -2, -2, -2, -2],
  zen: [-1, 1, 1, 2, 2, 2, 1, 0, 0, -2, -2, -2, -2],
};

export const COUNT_SYSTEMS: readonly CountSystemId[] = ["hi_lo", "ko", "omega_ii", "zen"];

export function runningCount(seen: readonly FullRank[], system: CountSystemId): number {
  const weights = COUNT_WEIGHTS[system];
  let rc = 0;
  for (const rank of seen) {
    rc += weights[FULL_RANKS.indexOf(rank)] ?? 0;
  }
  return rc;
}

export function trueCount(input: {
  seen: readonly FullRank[];
  system: CountSystemId;
  physicalCardsRemaining: number;
  inventoryValid: boolean;
}): { running: number; trueCount: number | null; status: "OK" | "INVALID" } {
  const running = runningCount(input.seen, input.system);
  if (!input.inventoryValid || input.physicalCardsRemaining <= 0) {
    return { running, trueCount: null, status: "INVALID" };
  }
  const decks = input.physicalCardsRemaining / 52;
  return { running, trueCount: running / decks, status: "OK" };
}
