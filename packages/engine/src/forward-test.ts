import type { CountSnapshot } from "./counting";

export interface ForwardTestInput {
  counts: CountSnapshot;
  participationHandsRemaining: number;
}

export interface ForwardTestResult {
  definitive: false;
  messageDe: string;
  observationsDe: string[];
}

export function forwardTestProjection(
  input: ForwardTestInput
): ForwardTestResult {
  const observations = [
    `Decks übrig: ${input.counts.decksRemaining.toFixed(2)}`,
    `Penetration: ${input.counts.penetration}%`,
    `Hi-Lo True Count: ${input.counts.hiLo.true}`,
    `Geschätzte verbleibende Spieler-Hände (Session): ${input.participationHandsRemaining}`,
  ];
  return {
    definitive: false,
    messageDe:
      "Keine Dollar-Projektion — Kantenwerte für Evolution Free Bet noch nicht freigegeben.",
    observationsDe: observations,
  };
}