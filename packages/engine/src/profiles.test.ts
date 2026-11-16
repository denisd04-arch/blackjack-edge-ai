import { describe, expect, it } from "vitest";
import {
  EVOLUTION_FREE_BET_STUB,
  EVOLUTION_INFINITE_FREE_BET_STUB,
} from "./profiles";

describe("game profiles", () => {
  it("Evolution Free Bet profile complete for finite-shoe EV", () => {
    expect(EVOLUTION_FREE_BET_STUB.incomplete).toBe(false);
    expect(EVOLUTION_FREE_BET_STUB.rules.pushOn22).toBe(true);
  });

  it("covers both Evolution variants", () => {
    expect(EVOLUTION_FREE_BET_STUB.variant).toBe("evolution_free_bet");
    expect(EVOLUTION_INFINITE_FREE_BET_STUB.variant).toBe(
      "evolution_infinite_free_bet"
    );
  });
});