import type { DecisionAnalysisResult } from "./decision-analysis";

export interface ParticipationAdvice {
  definitive: boolean;
  /** True when the hand's conditional EV is above sitting out (0). */
  participate: boolean | null;
  ev: number | null;
  messageDe: string;
}

/**
 * Infinite and seated games: sit in or out for THIS hand.
 * Sitting out is worth 0. This is not a claim that the game is profitable.
 */
export function adviseParticipation(
  analysis: DecisionAnalysisResult
): ParticipationAdvice {
  if (!analysis.definitive || !analysis.recommended) {
    return {
      definitive: false,
      participate: null,
      ev: null,
      messageDe:
        "Keine Teilnahme-Empfehlung — die Hand hat keinen definitiven EV.",
    };
  }
  const row = analysis.actions.find((a) => a.action === analysis.recommended);
  if (!row) {
    return {
      definitive: false,
      participate: null,
      ev: null,
      messageDe: "Keine Teilnahme-Empfehlung — Aktion fehlt.",
    };
  }
  const participate = row.ev > 0;
  return {
    definitive: true,
    participate,
    ev: row.ev,
    messageDe: participate
      ? `Bedingter EV ${row.ev.toFixed(4)} liegt über Aussetzen (0). Gilt nur für diese Karten und diesen Schuh — kein Profit-Claim.`
      : `Bedingter EV ${row.ev.toFixed(4)} liegt nicht über Aussetzen (0). Kein Hinweis auf einen dauerhaften Vorteil.`,
  };
}
