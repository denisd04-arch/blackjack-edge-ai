import type { CountSnapshot } from "./counting";
import type { DecisionLogEntry } from "./decision-log";
import { isDeviation } from "./decision-log";
import type { ShoeSnapshot } from "./shoe";

export interface SessionAnalytics {
  cardsDealt: number;
  penetration: number;
  decisionPoints: number;
  deviations: number;
  hiLoTrue: number;
  omegaTrue: number;
  definitiveCounts: boolean;
}

export function buildSessionAnalytics(input: {
  shoe: ShoeSnapshot;
  counts: CountSnapshot;
  decisions: readonly DecisionLogEntry[];
}): SessionAnalytics {
  return {
    cardsDealt: input.shoe.cardsDealt,
    penetration: input.shoe.penetration,
    decisionPoints: input.decisions.length,
    deviations: input.decisions.filter(isDeviation).length,
    hiLoTrue: input.counts.hiLo.true,
    omegaTrue: input.counts.omegaII.true,
    definitiveCounts: true,
  };
}