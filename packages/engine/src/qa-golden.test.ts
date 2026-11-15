import { describe, expect, it } from "vitest";
import { STANDARD_H17_8DECK_BASELINE } from "./profiles";
import { analyzeDecision } from "./decision-analysis";
import { createFullShoeInventory } from "./shoe";

/** Golden tolerances for Phase 12 QA gate. */
const EV_TOLERANCE = 0.03;

describe("QA golden paths", () => {
  it("hard 20 vs 6 baseline EV band", () => {
    const res = analyzeDecision({
      profile: STANDARD_H17_8DECK_BASELINE,
      playerCards: ["10", "K"],
      dealerUpcard: "6",
      shoeRemainingByRank: createFullShoeInventory(8),
    });
    expect(res.definitive).toBe(true);
    const stand = res.actions.find((a) => a.action === "stand");
    expect(stand?.ev).toBeGreaterThan(0.55 - EV_TOLERANCE);
  });
});