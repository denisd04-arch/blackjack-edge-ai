import { describe, expect, it } from "vitest";
import {
  EVOLUTION_FREE_BET_STUB,
  EVOLUTION_INFINITE_FREE_BET_STUB,
} from "./profiles";

describe("game profiles", () => {
  it("marks unknown rule fields as incomplete", () => {
    expect(EVOLUTION_FREE_BET_STUB.incomplete).toBe(true);
    expect(EVOLUTION_FREE_BET_STUB.missingFields).toContain("penetration");
  });

  it("covers both Evolution variants", () => {
    expect(EVOLUTION_FREE_BET_STUB.variant).toBe("evolution_free_bet");
    expect(EVOLUTION_INFINITE_FREE_BET_STUB.variant).toBe(
      "evolution_infinite_free_bet"
    );
  });
});