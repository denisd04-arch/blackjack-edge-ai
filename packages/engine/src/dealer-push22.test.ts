import { describe, expect, it } from "vitest";
import { rulesFromProfile } from "./blackjack-rules";
import { EVOLUTION_FREE_BET } from "./profiles";
import { dealerDistributionWithUpcard } from "./dealer-outcomes";
import { createFullShoeInventory } from "./shoe";

describe("dealer push 22", () => {
  it("maps dealer 22 to stand terminal when pushOn22", () => {
    const rules = rulesFromProfile(EVOLUTION_FREE_BET)!;
    const shoe = createFullShoeInventory(8);
    const { dealer, push22Pct, bustPct } = dealerDistributionWithUpcard(
      "6",
      shoe,
      rules,
      new Map()
    );
    let prob22 = 0;
    let probBust = 0;
    for (const [k, p] of dealer) {
      if (k === "bust") probBust += p;
      if (k.startsWith("s:22:")) prob22 += p;
    }
    expect(push22Pct).toBeGreaterThan(0);
    expect(prob22).toBeGreaterThan(0);
    expect(probBust).toBeLessThan(bustPct + 0.001);
  });
});