import { describe, expect, it } from "vitest";
import { applyLedgerEntry, kellyFraction } from "./bankroll";

describe("bankroll", () => {
  it("computes Kelly fraction", () => {
    const k = kellyFraction({ ev: 0.01, variance: 1.2 });
    expect(k.definitive).toBe(true);
    expect(k.fraction).toBeCloseTo(0.01 / 1.2, 4);
  });

  it("appends ledger entries", () => {
    const next = applyLedgerEntry([], "1", 100, "Start");
    expect(next[0].balanceAfter).toBe(100);
  });
});