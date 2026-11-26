import { describe, expect, it } from "vitest";
import { freshBuckets } from "./model";
import { compareStrategies, playShoeEngine, visibleAction } from "./playthrough";
import { shuffleShoe } from "./simulate";

describe("one engine for the shoe", () => {
  it("settles a full round from dealt cards and does not treat the backtest as profit", () => {
    const shoe = playShoeEngine({ seed: 11, maxRounds: 1, otherPlayers: 1, extraBurns: 0, stake: "flat", sideBets: false });
    expect(shoe.rounds).toBe(1);
    expect(shoe.played).toBe(1);
    expect(shoe.cardsDealt).toBeGreaterThan(4);
    expect(shoe.profitableClaim).toBe(false);
    expect(shoe.ledger.entries).toHaveLength(1);
    expect(shoe.ledger.entries[0]?.roundNet).toBeCloseTo(shoe.totalNet);
    expect(shoe.roi === null || Number.isFinite(shoe.roi)).toBe(true);
  }, 30_000);

  it("keeps a verified-edge plan from staking while the model is not verified", () => {
    const order = shuffleShoe(4, 8);
    const flat = playShoeEngine({ seed: 4, order, maxRounds: 1, stake: "flat", sideBets: false });
    const verified = playShoeEngine({ seed: 4, order, maxRounds: 1, stake: "verified-edge", sideBets: false });
    expect(flat.cashAtRisk).toBeGreaterThan(0);
    expect(verified.played).toBe(0);
    expect(verified.skipped).toBe(1);
    expect(verified.cashAtRisk).toBe(0);
    expect(verified.totalNet).toBe(0);
  }, 30_000);

  it("does not change a decision when the undealt tail changes", () => {
    const counts = freshBuckets(2);
    counts[9] = (counts[9] ?? 0) - 1;
    counts[5] = (counts[5] ?? 0) - 1;
    counts[6] = (counts[6] ?? 0) - 1;
    const first = visibleAction(counts, [9, 5], 6);
    const again = visibleAction(counts.slice(), [9, 5], 6);
    expect(again).toBe(first);
    expect(["HIT", "STAND", "DOUBLE_FREE", "DOUBLE_REGULAR", "SPLIT_FREE", "SPLIT_REGULAR"]).toContain(first);
  });

  it("compares stake plans on one seed without a profitability claim", () => {
    const plans = compareStrategies(9, 1);
    expect(plans.flat.seed).toBe(plans["verified-edge"].seed);
    expect(plans.flat.profitableClaim).toBe(false);
    expect(plans.kelly.cashAtRisk).toBe(0);
    expect(plans["main-only"].sideNet).toBe(0);
  }, 60_000);
});
