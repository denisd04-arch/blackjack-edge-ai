import type { CardRank } from "./cards";
import type { DecisionAnalysisResult } from "./decision-analysis";
import type { PlayerAction } from "./ev-core";
import { liveHandStateKey } from "./live-hand";

export interface DecisionLogEntry {
  id: string;
  createdAtMs: number;
  roundId: number;
  playerCards: readonly CardRank[];
  dealerUpcard: CardRank;
  stateKey: string;
  definitive: boolean;
  messageDe: string;
  recommended: PlayerAction | null;
  recommendedEv: number | null;
  /** User-recorded action at table (optional). */
  actualAction: PlayerAction | null;
  /** EV of the recorded action when definitive. */
  actualEv: number | null;
}

const ACTION_LABEL_DE: Record<PlayerAction, string> = {
  stand: "Stehen",
  hit: "Karte",
  double: "Verdoppeln",
  split: "Teilen",
};

export function actionLabelDe(action: PlayerAction): string {
  return ACTION_LABEL_DE[action];
}

export function buildLogEntry(input: {
  id: string;
  createdAtMs: number;
  roundId: number;
  playerCards: readonly CardRank[];
  dealerUpcard: CardRank;
  analysis: DecisionAnalysisResult;
}): DecisionLogEntry {
  const recommended = input.analysis.definitive
    ? input.analysis.recommended
    : null;
  const recommendedEv =
    recommended && input.analysis.definitive
      ? (input.analysis.actions.find((a) => a.action === recommended)?.ev ??
        null)
      : null;

  return {
    id: input.id,
    createdAtMs: input.createdAtMs,
    roundId: input.roundId,
    playerCards: [...input.playerCards],
    dealerUpcard: input.dealerUpcard,
    stateKey: liveHandStateKey(input.playerCards, input.dealerUpcard),
    definitive: input.analysis.definitive,
    messageDe: input.analysis.messageDe,
    recommended,
    recommendedEv,
    actualAction: null,
    actualEv: null,
  };
}

export function attachActualAction(
  entry: DecisionLogEntry,
  action: PlayerAction,
  analysis: DecisionAnalysisResult
): DecisionLogEntry {
  if (!analysis.definitive) {
    return { ...entry, actualAction: action, actualEv: null };
  }
  const row = analysis.actions.find((a) => a.action === action);
  return {
    ...entry,
    actualAction: action,
    actualEv: row?.available ? row.ev : null,
  };
}

export function isDeviation(entry: DecisionLogEntry): boolean {
  if (!entry.definitive || !entry.recommended || !entry.actualAction) {
    return false;
  }
  return entry.recommended !== entry.actualAction;
}