import type { PlayerAction } from "./ev-core";

export function playerStakeUnits(
  action: PlayerAction,
  free: boolean
): { playerUnits: number; freeUnits: number; messageDe: string } {
  const addsStake = action === "double" || action === "split";
  if (!addsStake) {
    return {
      playerUnits: 1,
      freeUnits: 0,
      messageDe: "Im Risiko ist nur der eigene Einsatz.",
    };
  }
  if (free) {
    return {
      playerUnits: 1,
      freeUnits: 1,
      messageDe:
        "Free Stake ist nicht dein Verlust. Verloren werden kann nur der eigene Einsatz.",
    };
  }
  return {
    playerUnits: 2,
    freeUnits: 0,
    messageDe: "Bezahltes Double oder Split: zwei eigene Einsätze im Risiko.",
  };
}

export interface KellyInput {
  /** Per-unit EV (e.g. +0.01). */
  ev: number;
  variance: number;
}

export interface KellyResult {
  /** Fraction of bankroll to wager (capped 0–1). */
  fraction: number;
  definitive: boolean;
  messageDe: string;
}

export interface KellyNetInput {
  /** Expected net profit per 1 unit of the original wager. */
  ev: number;
  /** Variance of that net profit. */
  variance: number;
  /** Most the original wager can lose, in the same units (1 or 2). */
  maxLoss: number;
  /** False when the EV itself is not definitive. */
  definitive: boolean;
}

/**
 * Log-growth fraction of bankroll to put on the original wager:
 * f* = ev / E[R^2], capped so f * maxLoss ≤ 1.
 * Not a claim that the game has a positive edge.
 */
export function kellyOnNet(input: KellyNetInput): KellyResult {
  if (!input.definitive) {
    return {
      fraction: 0,
      definitive: false,
      messageDe:
        "Kein Kelly — der EV dieser Hand ist nicht definitiv. Kein Einsatz aus einer offenen Regel.",
    };
  }
  if (input.maxLoss <= 0 || input.variance < 0) {
    return {
      fraction: 0,
      definitive: false,
      messageDe: "Kein Kelly — Verlustgrenze oder Varianz fehlt.",
    };
  }
  if (input.ev <= 0) {
    return {
      fraction: 0,
      definitive: true,
      messageDe:
        "Bedingter Netto-EV ist nicht positiv — Kelly-Einsatz 0. Kein Profit-Claim.",
    };
  }
  const secondMoment = input.variance + input.ev * input.ev;
  if (secondMoment <= 0) {
    return {
      fraction: 0,
      definitive: false,
      messageDe: "Varianz fehlt — kein Kelly-Bruch.",
    };
  }
  const raw = input.ev / secondMoment;
  const cap = 1 / input.maxLoss;
  const capped = Math.max(0, Math.min(cap, raw));
  return {
    fraction: Math.round(capped * 10000) / 10000,
    definitive: true,
    messageDe:
      "Kelly auf den Netto-Gewinn der Originalwette, gedeckelt mit dem maximalen Verlust. Nur diese Verteilung — kein Hausvorteil.",
  };
}

export function kellyFraction(input: KellyInput): KellyResult {
  if (input.variance <= 0) {
    return {
      fraction: 0,
      definitive: false,
      messageDe: "Varianz fehlt oder null — kein Kelly-Bruch.",
    };
  }
  const raw = input.ev / input.variance;
  const capped = Math.max(0, Math.min(1, raw));
  return {
    fraction: Math.round(capped * 10000) / 10000,
    definitive: true,
    messageDe: "Kelly aus EV und Varianz (einheitliche Wetteinheit).",
  };
}

export interface LedgerEntry {
  id: string;
  atMs: number;
  delta: number;
  balanceAfter: number;
  noteDe: string;
}

export function applyLedgerEntry(
  entries: readonly LedgerEntry[],
  id: string,
  delta: number,
  noteDe: string
): LedgerEntry[] {
  const balance = entries.length
    ? entries[entries.length - 1].balanceAfter
    : 0;
  return [
    ...entries,
    {
      id,
      atMs: Date.now(),
      delta,
      balanceAfter: Math.round((balance + delta) * 100) / 100,
      noteDe,
    },
  ];
}