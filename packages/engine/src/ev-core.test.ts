import { describe, expect, it } from "vitest";
import { STANDARD_H17_8DECK_BASELINE } from "./profiles";
import { rulesFromProfile } from "./blackjack-rules";
import { createFullShoeInventory } from "./shoe";
import {
  actionBreakdown,
  analysisInventory,
  createPlayContext,
  optimalPlayStats,
} from "./ev-core";

const rules = rulesFromProfile(STANDARD_H17_8DECK_BASELINE)!;
const TOLERANCE = 0.03;

describe("finite-shoe EV", () => {
  it("favors stand on 20 vs dealer 6", () => {
    const shoe = createFullShoeInventory(1);
    const inv = analysisInventory(shoe, ["10", "K"], "6")!;
    const ctx = createPlayContext("6", rules);
    const stats = actionBreakdown(["10", "K"], inv, ctx);
    expect(stats.stand.ev).toBeGreaterThan(0.55);
    expect(stats.stand.ev).toBeGreaterThan(stats.hit.ev - TOLERANCE);
  });

  it("hit 16 vs 10 under depleted shoe", () => {
    const shoe = createFullShoeInventory(2);
    let inv = analysisInventory(shoe, ["10", "6"], "10")!;
    const ctx = createPlayContext("10", rules);
    const stats = actionBreakdown(["10", "6"], inv, ctx);
    expect(stats.hit.ev).toBeGreaterThan(stats.stand.ev);
    expect(stats.stand.ev).toBeLessThan(-0.4);

    const eleven = analysisInventory(shoe, ["9", "2"], "6")!;
    const ctx6 = createPlayContext("6", rules);
    const hard11 = optimalPlayStats(["9", "2"], eleven, ctx6, {
      canDouble: true,
      canSplit: true,
      isSplitHand: false,
    });
    expect(hard11.bestAction).toBe("double");
  });

  it("respects ace-rich shoe shift", () => {
    const shoe = createFullShoeInventory(1);
    shoe["A"] = 12;
    shoe["5"] = 0;
    const inv = analysisInventory(shoe, ["10", "K"], "6")!;
    const ctx = createPlayContext("6", rules);
    const stats = actionBreakdown(["10", "K"], inv, ctx);
    expect(stats.stand.winPct).toBeGreaterThan(70);
  });
});