import { describe, expect, it } from "vitest";
import { liveHandFromDealt } from "./live-hand";
import type { DealtCard } from "./cards";

function card(
  partial: Partial<DealtCard> & Pick<DealtCard, "rank" | "target">
): DealtCard {
  return {
    id: "x",
    suit: "spades",
    roundId: 1,
    sequence: 1,
    ...partial,
  };
}

describe("liveHandFromDealt", () => {
  it("requires playing mode and two player cards", () => {
    const empty = liveHandFromDealt([], 1, true, "observing");
    expect(empty.ready).toBe(false);
    const one = liveHandFromDealt(
      [card({ rank: "10", target: "player", sequence: 1 })],
      1,
      true,
      "playing"
    );
    expect(one.ready).toBe(false);
    const ok = liveHandFromDealt(
      [
        card({ rank: "10", target: "player", sequence: 1 }),
        card({ rank: "8", target: "player", sequence: 2 }),
        card({ rank: "6", target: "dealer", sequence: 3 }),
      ],
      1,
      true,
      "playing"
    );
    expect(ok.ready).toBe(true);
    expect(ok.dealerUpcard).toBe("6");
  });
});