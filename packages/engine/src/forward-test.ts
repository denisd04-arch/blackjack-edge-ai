import type { CountSnapshot } from "./counting";

export interface ForwardTestInput {
  counts: CountSnapshot;
  participationHandsRemaining: number;
}

export interface ForwardTestResult {
  definitive: false;
  claimsProfit: false;
  messageDe: string;
  observationsDe: string[];
  nonClaimsDe: string[];
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
    claimsProfit: false,
    messageDe:
      "Nur Beobachtung des Schuhs und der Zählung. Keine Dollar-Projektion und kein Vorteil.",
    observationsDe: observations,
    nonClaimsDe: [
      "Kein Hausvorteil und kein RTP.",
      "Keine profitable Strategie und keine Dollar-Kante.",
      "Penetration und CSM-Schnitt sind nicht belegt.",
      "True Count ist eine Zählkennzahl, kein erwarteter Gewinn.",
    ],
  };
}