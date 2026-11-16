import { describe, expect, it } from "vitest";
import { analyzeDecision } from "./decision-analysis";
import {
  EVOLUTION_FREE_BET_STUB,
  EVOLUTION_INFINITE_FREE_BET_STUB,
  STANDARD_H17_8DECK_BASELINE,
} from "./profiles";
import { createFullShoeInventory } from "./shoe";

describe("analyzeDecision", () => {
  it("blocks pair advice while seven-seat split rules are open", () => {
    const res = analyzeDecision({
      profile: EVOLUTION_FREE_BET_STUB,
      playerCards: ["8", "8"],
      dealerUpcard: "6",
      shoeRemainingByRank: createFullShoeInventory(8),
    });
    expect(res.definitive).toBe(false);
    expect(res.recommended).toBeNull();
    expect(res.actions).toHaveLength(0);
  });

  it("still prices a non-pair seven-seat hand", () => {
    const res = analyzeDecision({
      profile: EVOLUTION_FREE_BET_STUB,
      playerCards: ["10", "6"],
      dealerUpcard: "10",
      shoeRemainingByRank: createFullShoeInventory(2),
    });
    expect(res.definitive).toBe(true);
    expect(res.recommended).not.toBeNull();
    expect(res.messageDe).toMatch(/kein Hausvorteil/i);
  });

  it("returns actions for the Infinite profile", () => {
    const res = analyzeDecision({
      profile: EVOLUTION_INFINITE_FREE_BET_STUB,
      playerCards: ["10", "9"],
      dealerUpcard: "6",
      shoeRemainingByRank: createFullShoeInventory(2),
    });
    expect(res.definitive).toBe(true);
    expect(res.actions).toHaveLength(4);
    expect(res.dealer22PushPct).toBeGreaterThan(0);
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
