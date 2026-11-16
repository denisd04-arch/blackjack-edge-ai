import type { CountSnapshot } from "./counting";
import type { PlayerAction } from "./ev-core";
import { isVerifiedEvolutionProfile } from "./participation";
import type { GameProfile } from "./types";

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

export interface ForwardLock {
  status: "LOCKED" | "INSUFFICIENT_DATA";
  recommendation: PlayerAction | null;
  expectedEv: number | null;
  /** The lock does not accept a later recommendation. */
  frozen: true;
}

export interface ForwardComparison {
  status: "LOCKED" | "INSUFFICIENT_DATA";
  recommendation: PlayerAction | null;
  expectedEv: number | null;
  realizedProfit: number | null;
  recommendationUnchanged: true;
  claimsProfit: false;
  messageDe: string;
}

/** Freeze the recommendation that existed before the result. */
export function lockFromRecord(input: {
  profile: GameProfile;
  recommended: PlayerAction | null;
  expectedEv: number | null;
  definitive: boolean;
}): ForwardLock {
  if (
    !isVerifiedEvolutionProfile(input.profile) ||
    !input.definitive ||
    !input.recommended ||
    input.expectedEv == null
  ) {
    return {
      status: "INSUFFICIENT_DATA",
      recommendation: null,
      expectedEv: null,
      frozen: true,
    };
  }
  return {
    status: "LOCKED",
    recommendation: input.recommended,
    expectedEv: input.expectedEv,
    frozen: true,
  };
}

/** Compare a locked recommendation with a later result. Does not replace the lock. */
export function compareForwardResult(
  lock: ForwardLock,
  realizedProfit: number | null
): ForwardComparison {
  if (lock.status !== "LOCKED") {
    return {
      status: "INSUFFICIENT_DATA",
      recommendation: null,
      expectedEv: null,
      realizedProfit: null,
      recommendationUnchanged: true,
      claimsProfit: false,
      messageDe: "INSUFFICIENT DATA — keine gesperrte Empfehlung.",
    };
  }
  return {
    status: "LOCKED",
    recommendation: lock.recommendation,
    expectedEv: lock.expectedEv,
    realizedProfit,
    recommendationUnchanged: true,
    claimsProfit: false,
    messageDe:
      "Empfehlung bleibt die gesperrte. Erwartet gegen realisiert ist eine Hand, kein Vorteil.",
  };
}