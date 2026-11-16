import { describe, expect, it } from "vitest";
import {
  EVOLUTION_FREE_BET_STUB,
  EVOLUTION_INFINITE_FREE_BET_STUB,
} from "./profiles";

describe("game profiles", () => {
  it("keeps seven-seat split follow-ups incomplete", () => {
    expect(EVOLUTION_FREE_BET_STUB.incomplete).toBe(true);
    expect(EVOLUTION_FREE_BET_STUB.missingFields).toContain("doubleAfterSplit");
    expect(EVOLUTION_FREE_BET_STUB.missingFields).not.toContain("penetration");
    expect(EVOLUTION_FREE_BET_STUB.rules.pushOn22).toBe(true);
    expect(EVOLUTION_FREE_BET_STUB.rules.dealerHitsSoft17).toBe(false);
    expect(EVOLUTION_FREE_BET_STUB.rules.charlieSixCard).toBe(false);
  });

  it("closes Infinite from the rules PDF", () => {
    expect(EVOLUTION_INFINITE_FREE_BET_STUB.incomplete).toBe(false);
    expect(EVOLUTION_INFINITE_FREE_BET_STUB.rules.maxSplitsPerHand).toBe(1);
    expect(EVOLUTION_INFINITE_FREE_BET_STUB.rules.doubleAfterSplit).toBe(false);
    expect(EVOLUTION_INFINITE_FREE_BET_STUB.rules.charlieSixCard).toBe(true);
    expect(EVOLUTION_INFINITE_FREE_BET_STUB.rules.penetration).toBeNull();
  });

  it("covers both Evolution variants", () => {
    expect(EVOLUTION_FREE_BET_STUB.variant).toBe("evolution_free_bet");
    expect(EVOLUTION_INFINITE_FREE_BET_STUB.variant).toBe(
      "evolution_infinite_free_bet"
    );
  });
});
