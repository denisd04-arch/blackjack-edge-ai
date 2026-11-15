import { describe, expect, it } from "vitest";
import type { DealtCard } from "./cards";
import {
  buildCountSnapshot,
  convertToTrueCount,
  HI_LO_TAGS,
  OMEGA_II_TAGS,
  runningCountFromDealt,
} from "./counting";
import { createFullShoeInventory } from "./shoe";

function card(rank: DealtCard["rank"], suit: DealtCard["suit"]): DealtCard {
  return {
    id: "t",
    rank,
    suit,
    target: "player",
    roundId: 1,
    sequence: 1,
  };
}

describe("counting tags", () => {
  it("exposes full Hi-Lo and Omega II weight tables", () => {
    expect(HI_LO_TAGS["5"]).toBe(1);
    expect(HI_LO_TAGS["7"]).toBe(0);
    expect(HI_LO_TAGS.K).toBe(-1);
    expect(OMEGA_II_TAGS["4"]).toBe(2);
    expect(OMEGA_II_TAGS["9"]).toBe(-1);
    expect(OMEGA_II_TAGS.A).toBe(0);
  });

  it("computes running counts from dealt sequence", () => {
    const dealt = [card("5", "hearts"), card("K", "spades"), card("2", "clubs")];
    expect(runningCountFromDealt(dealt, "hiLo")).toBe(1);
    expect(runningCountFromDealt(dealt, "omegaII")).toBe(1);
  });

  it("converts running to true count by decks remaining", () => {
    expect(convertToTrueCount(6, 3)).toBe(2);
    expect(convertToTrueCount(4, 0)).toBe(16);
  });

  it("builds snapshot with composition stats", () => {
    const sessionInv = createFullShoeInventory(1);
    sessionInv["5"] -= 1;
    sessionInv.K -= 1;
    const dealt = [card("5", "hearts"), card("K", "spades")];
    const snap = buildCountSnapshot({
      dealt,
      remainingByRank: sessionInv,
      cardsRemaining: 50,
      cardsTotal: 52,
      penetration: 3.8,
      decks: 1,
    });
    expect(snap.hiLo.running).toBe(0);
    expect(snap.hiLo.true).toBe(0);
    expect(snap.composition.low2to9).toBe(32 - 1);
    expect(snap.composition.tens).toBe(16 - 1);
    expect(snap.decksRemaining).toBeCloseTo(50 / 52, 3);
  });
});