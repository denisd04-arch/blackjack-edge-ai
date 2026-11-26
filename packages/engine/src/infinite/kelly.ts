export interface WeightedProfit {
  profit: number;
  p: number;
}

export interface KellyResult {
  fullFraction: number;
  fractional: number;
  stake: number;
  ev: number;
  experimentalStake: number | null;
  note: string;
}

/**
 * Full-distribution Kelly as a fraction of bankroll.
 * Non-positive EV returns 0. No martingale.
 */
export function fullKellyFraction(dist: readonly WeightedProfit[]): number {
  const ev = dist.reduce((s, d) => s + d.p * d.profit, 0);
  if (!(ev > 0)) return 0;
  const maxLoss = dist.reduce((m, d) => Math.max(m, -Math.min(0, d.profit)), 0);
  const hi = maxLoss > 0 ? Math.min(0.999, 0.999 / maxLoss) : 0.999;
  let lo = 0;
  let right = hi;
  const value = (f: number) => {
    let sum = 0;
    for (const d of dist) {
      const wealth = 1 + f * d.profit;
      if (wealth <= 1e-12) return Number.NEGATIVE_INFINITY;
      sum += d.p * Math.log(wealth);
    }
    return sum;
  };
  for (let i = 0; i < 60; i += 1) {
    const m1 = lo + (right - lo) / 3;
    const m2 = right - (right - lo) / 3;
    if (value(m1) < value(m2)) lo = m1;
    else right = m2;
  }
  return (lo + right) / 2;
}

export function kellyStake(input: {
  bankroll: number;
  userFraction: number;
  dist: readonly WeightedProfit[];
  experimental?: { pEither: number } | null;
}): KellyResult {
  const ev = input.dist.reduce((s, d) => s + d.p * d.profit, 0);
  const fraction = clampFraction(input.userFraction);
  if (!(ev > 0) || !(input.bankroll > 0)) {
    return {
      fullFraction: 0,
      fractional: 0,
      stake: 0,
      ev,
      experimentalStake: input.experimental
        ? experimentalComparison(input.bankroll, fraction, input.experimental.pEither)
        : null,
      note: "Stake is 0 because EV is not positive. The experimental free-bet figure is a comparison, not an optimal stake.",
    };
  }
  const full = fullKellyFraction(input.dist);
  const stake = Math.floor(input.bankroll * fraction * full);
  return {
    fullFraction: full,
    fractional: fraction * full,
    stake,
    ev,
    experimentalStake: input.experimental
      ? experimentalComparison(input.bankroll, fraction, input.experimental.pEither)
      : null,
    note: "Full-distribution Kelly, then the chosen fraction, rounded down to a whole currency unit.",
  };
}

/** Not an optimal stake. Shown only so it can be compared with Kelly. */
export function experimentalComparison(bankroll: number, fraction: number, pEither: number): number {
  if (!(bankroll > 0) || !(pEither > 0)) return 0;
  return Math.floor(bankroll * clampFraction(fraction) * Math.min(1, pEither) * 0.02);
}

export interface VerifiedStakeInput {
  verification: "VERIFIED" | "PARTIALLY_VERIFIED" | "APPROXIMATE" | "NOT_DEFINITIVE" | "UNVERIFIED";
  quality: "EXACT" | "APPROXIMATE" | "MONTE_CARLO" | "INSUFFICIENT_DATA";
  dist: readonly WeightedProfit[];
  bankroll: number;
  userFraction: number;
  /** Table minimum and maximum for the main stake, in currency units. */
  limit: { min: number; max: number };
  openExposure: number;
  trials?: number;
  seed?: number;
  standardError?: number;
  interval95?: [number, number];
}

/**
 * Stake only from a full profit distribution whose verification and sample both hold.
 * Anything short of that returns null, which the UI must show as no stake.
 */
export function stakeFromVerifiedDistribution(input: VerifiedStakeInput): KellyResult | null {
  if (input.verification !== "VERIFIED") return null;
  if (input.quality === "INSUFFICIENT_DATA" || input.quality === "APPROXIMATE") return null;
  if (input.quality === "MONTE_CARLO") {
    if (input.seed === undefined || !input.trials || input.trials < 10000) return null;
    if (input.standardError === undefined || !input.interval95) return null;
    if (input.interval95[0] <= 0) return null;
  }
  const mass = input.dist.reduce((sum, row) => sum + row.p, 0);
  if (Math.abs(mass - 1) > 1e-6) return null;
  if (!input.dist.some((row) => row.profit > 0) || !input.dist.some((row) => row.profit < 0)) return null;
  const result = kellyStake({
    bankroll: Math.max(0, input.bankroll - input.openExposure),
    userFraction: input.userFraction,
    dist: input.dist,
  });
  if (!(result.ev > 0) || result.stake <= 0) return null;
  const capped = Math.min(input.limit.max, Math.max(input.limit.min, result.stake));
  if (capped > input.bankroll - input.openExposure) return null;
  return { ...result, stake: capped, note: "Fractional Kelly from the verified profit distribution, capped by the table limit and open exposure." };
}

export function clampFraction(value: number): number {
  if (!Number.isFinite(value)) return 0.25;
  return Math.min(1, Math.max(0.1, value));
}

export function distFromMoments(ev: number, win: number, push: number, loss: number): WeightedProfit[] {
  const winProfit = win > 0 ? Math.max(ev, 0) / win : 1;
  return [
    { profit: winProfit, p: win },
    { profit: 0, p: push },
    { profit: loss > 0 ? (ev - win * winProfit) / loss : -1, p: loss },
  ].filter((d) => d.p > 0);
}
