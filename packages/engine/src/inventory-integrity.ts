import { CARD_RANKS, type CardRank } from "./cards";
import { createFullShoeInventory, type RankInventory } from "./shoe";

export interface InventoryIntegrity {
  ok: boolean;
  messageDe: string;
}

/** Remaining shoe must equal a full shoe minus every dealt rank, each card once. */
export function inventoryMatchesDealt(input: {
  decks: number;
  dealtRanks: readonly CardRank[];
  remainingByRank: RankInventory;
}): InventoryIntegrity {
  const expected = createFullShoeInventory(input.decks);
  for (const rank of input.dealtRanks) {
    expected[rank] -= 1;
    if (expected[rank] < 0) {
      return {
        ok: false,
        messageDe: `Karte ${rank} wurde öfter erfasst, als der Schuh hergibt.`,
      };
    }
  }
  for (const rank of CARD_RANKS) {
    if (expected[rank] !== input.remainingByRank[rank]) {
      return {
        ok: false,
        messageDe: `Inventar weicht bei ${rank} ab (erwartet ${expected[rank]}, Rest ${input.remainingByRank[rank]}).`,
      };
    }
  }
  return {
    ok: true,
    messageDe: "Schuh und erfasste Karten stimmen überein. Jede Karte zählt einmal.",
  };
}
