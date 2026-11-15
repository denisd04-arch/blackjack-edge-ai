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