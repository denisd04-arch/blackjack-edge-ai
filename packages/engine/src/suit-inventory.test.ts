import { describe, expect, it } from "vitest";
import {
  aggregateRankInventory,
  createFullSuitInventory,
  takeSuitRank,
} from "./suit-inventory";

describe("suit inventory", () => {
  it("tracks one copy per suit per deck", () => {
    const inv = createFullSuitInventory(2);
    expect(inv.hearts.A).toBe(2);
    expect(aggregateRankInventory(inv).A).toBe(8);
  });

  it("depletes specific suit before rank aggregate", () => {
    let inv = createFullSuitInventory(1);
    const taken = takeSuitRank(inv, "K", "spades");
    expect(taken).not.toBeNull();
    inv = taken!;
    expect(inv.spades.K).toBe(0);
    expect(aggregateRankInventory(inv).K).toBe(3);
  });
});