import type { CardRank } from "./cards";
import type { DecisionLogEntry } from "./decision-log";
import { isDeviation } from "./decision-log";

export interface BacktestResult {
  hands: number;
  deviations: number;
  avgRecommendedEv: number | null;
  definitive: boolean;
  messageDe: string;
}

export function backtestFromDecisionLog(
  entries: readonly DecisionLogEntry[]
): BacktestResult {
  const definitive = entries.some((e) => e.definitive);
  if (entries.length === 0) {
    return {
      hands: 0,
      deviations: 0,
      avgRecommendedEv: null,
      definitive: false,
      messageDe: "Keine Entscheidungspunkte — zuerst am Tisch spielen.",
    };
  }
  const deviations = entries.filter(isDeviation).length;
  const evs = entries
    .map((e) => e.recommendedEv)
    .filter((v): v is number => v != null);
  const avg =
    evs.length === 0
      ? null
      : Math.round((evs.reduce((a, b) => a + b, 0) / evs.length) * 10000) /
        10000;
  return {
    hands: entries.length,
    deviations,
    avgRecommendedEv: avg,
    definitive,
    messageDe:
      "Replay aus Session-Log (keine synthetischen Gewinne — nur Empfehlungs-EV & Abweichungen).",
  };
}

export interface ScriptedHand {
  player: CardRank[];
  dealerUp: CardRank;
}

export function scriptedHandCount(hands: readonly ScriptedHand[]): number {
  return hands.length;
}