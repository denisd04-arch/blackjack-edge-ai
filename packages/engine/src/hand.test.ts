import { describe, expect, it } from "vitest";
import { evaluateHand, isPair } from "./hand";

describe("hand evaluation", () => {
  it("detects soft and bust", () => {
    expect(evaluateHand(["A", "6"]).soft).toBe(true);
    expect(evaluateHand(["10", "9", "5"]).bust).toBe(true);
    expect(evaluateHand(["A", "K"]).blackjack).toBe(true);
  });

  it("detects pairs", () => {
    expect(isPair(["8", "8"])).toBe(true);
    expect(isPair(["8", "9"])).toBe(false);
  });
});