import { describe, expect, it } from "vitest";
import { explainDecisionAnalysis } from "./explain-analysis";
import { analyzeDecision } from "./decision-analysis";
import { STANDARD_H17_8DECK_BASELINE } from "./profiles";
import { createFullShoeInventory } from "./shoe";
import { DigitalTableSession } from "./table-session";

describe("explainDecisionAnalysis", () => {
  it("marks data-only explanations", () => {
    const analysis = analyzeDecision({
      profile: STANDARD_H17_8DECK_BASELINE,
      playerCards: ["9", "2"],
      dealerUpcard: "6",
      shoeRemainingByRank: createFullShoeInventory(8),
    });
    const session = new DigitalTableSession({ decks: 8 });
    const explained = explainDecisionAnalysis(analysis, session.snapshot().counts);
    expect(explained.dataOnly).toBe(true);
    expect(explained.paragraphsDe.length).toBeGreaterThan(0);
  });
});