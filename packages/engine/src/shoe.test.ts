import { describe, expect, it } from "vitest";
import { createFullShoeInventory, takeRank, totalRemaining } from "./shoe";

describe("shoe inventory", () => {
  it("starts with 4 copies per rank per deck", () => {
    const inv = createFullShoeInventory(8);
    expect(inv["A"]).toBe(32);
    expect(totalRemaining(inv)).toBe(8 * 52);
  });

  it("blocks over-depletion", () => {
    let inv = createFullShoeInventory(1);
    for (let i = 0; i < 4; i++) {
      const next = takeRank(inv, "K");
      expect(next).not.toBeNull();
      inv = next!;
    }
    expect(takeRank(inv, "K")).toBeNull();
  });
});