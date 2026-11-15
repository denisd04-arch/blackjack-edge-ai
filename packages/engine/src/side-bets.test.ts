import { describe, expect, it } from "vitest";
import { analyzeSideBet, SIDE_BET_CATALOG } from "./side-bets";
import { createFullShoeInventory } from "./shoe";

describe("analyzeSideBet", () => {
  it("catalog slots stay non-definitive", () => {
    for (const slot of SIDE_BET_CATALOG) {
      const r = analyzeSideBet({
        type: slot.id,
        shoe: createFullShoeInventory(8),
      });
      expect(r.definitive).toBe(false);
    }
  });
});