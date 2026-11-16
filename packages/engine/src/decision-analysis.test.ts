import { describe, expect, it } from "vitest";
import { analyzeDecision } from "./decision-analysis";
import {
  EVOLUTION_FREE_BET_STUB,
  STANDARD_H17_8DECK_BASELINE,
} from "./profiles";
import { createFullShoeInventory } from "./shoe";

describe("analyzeDecision", () => {
  it("returns definitive EV for verified Evolution Free Bet profile", () => {
    const res = analyzeDecision({
      profile: EVOLUTION_FREE_BET_STUB,
      playerCards: ["10", "K"],
      dealerUpcard: "6",
      shoeRemainingByRank: createFullShoeInventory(8),
    });
    expect(res.definitive).toBe(true);
    expect(res.actions).toHaveLength(4);
    expect(res.dealer22PushPct).toBeGreaterThanOrEqual(0);
  });

  it("returns actions for complete baseline profile", () => {
    const res = analyzeDecision({
      profile: STANDARD_H17_8DECK_BASELINE,
      playerCards: ["9", "2"],
      dealerUpcard: "6",
      shoeRemainingByRank: createFullShoeInventory(8),
    });
    expect(res.definitive).toBe(true);
    expect(res.recommended).toBe("double");
    expect(res.actions).toHaveLength(4);
    expect(res.dealerBustPct).toBeGreaterThan(10);
  });
});