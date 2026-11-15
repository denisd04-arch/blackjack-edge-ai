import { describe, expect, it } from "vitest";
import { backtestFromDecisionLog } from "./backtest";
import type { DecisionLogEntry } from "./decision-log";

const sample: DecisionLogEntry = {
  id: "1",
  createdAtMs: 0,
  roundId: 1,
  playerCards: ["8", "8"],
  dealerUpcard: "6",
  stateKey: "x",
  definitive: true,
  messageDe: "ok",
  recommended: "split",
  recommendedEv: 0.12,
  actualAction: "hit",
  actualEv: 0.05,
};

describe("backtestFromDecisionLog", () => {
  it("returns empty message", () => {
    const r = backtestFromDecisionLog([]);
    expect(r.hands).toBe(0);
    expect(r.avgRecommendedEv).toBeNull();
  });

  it("aggregates definitive log", () => {
    const r = backtestFromDecisionLog([sample, sample]);
    expect(r.hands).toBe(2);
    expect(r.avgRecommendedEv).toBe(0.12);
    expect(r.definitive).toBe(true);
  });
});