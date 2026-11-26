import {
  CARD_RANKS,
  type CardRank,
  type CardSuit,
  type CardTarget,
} from "./cards";
import { cloneInventory } from "./inventory-math";
import type { RoundPhase, TableView } from "./round-phase";
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

export type ObservationStatus = "OK" | "LIMITED" | "INVALID";

export interface ShoeObservation {
  status: ObservationStatus;
  messageDe: string;
  holeRank: CardRank | null;
  /** True while the hole rank must not enter the decision. */
  holeStaysUnknown: boolean;
  /** True when the path cannot support an engine number. */
  blocksDecision: boolean;
}

export function observeShoe(input: {
  decks: number;
  dealt: readonly {
    rank: CardRank;
    suit: CardSuit;
    target: CardTarget;
    roundId: number;
  }[];
  remainingByRank: RankInventory;
  roundId: number;
  view: TableView;
  phase: RoundPhase;
}): ShoeObservation {
  const seen = new Set<string>();
  for (const card of input.dealt) {
    const key = `${card.rank}:${card.suit}`;
    if (seen.has(key)) {
      return {
        status: "INVALID",
        messageDe: "Dieselbe Karte wurde zweimal erfasst.",
        holeRank: null,
        holeStaysUnknown: true,
        blocksDecision: true,
      };
    }
    seen.add(key);
  }

  const match = inventoryMatchesDealt({
    decks: input.decks,
    dealtRanks: input.dealt.map((card) => card.rank),
    remainingByRank: input.remainingByRank,
  });
  if (!match.ok) {
    return {
      status: "INVALID",
      messageDe: match.messageDe,
      holeRank: null,
      holeStaysUnknown: true,
      blocksDecision: true,
    };
  }

  const roundCards = input.dealt.filter((card) => card.roundId === input.roundId);
  const reasons: string[] = [];
  const dealer = roundCards.filter((card) => card.target === "dealer");
  const player = roundCards.filter((card) => card.target === "player");
  const holeRank = dealer[1]?.rank ?? null;
  const holeVisible = input.phase === "dealer" || input.phase === "settled";

  // Other-player cards are shoe removals. They are not a second copy of the personal hand.
  if (
    input.view === "infinite" &&
    roundCards.some((card) => card.target === "other") &&
    roundCards.filter((card) => card.target === "player").length === 0 &&
    input.phase === "your_turn"
  ) {
    reasons.push("Andere Plätze sind im Schuh, die eigene Hand ist noch leer.");
  }
  if (
    (input.phase === "your_turn" ||
      input.phase === "other_player" ||
      input.phase === "dealer" ||
      input.phase === "settled") &&
    (player.length < 2 || dealer.length < 1)
  ) {
    reasons.push("Pfad nicht beobachtbar — Spielerkarten oder Upcard fehlen.");
  }
  if (holeRank && !holeVisible) {
    reasons.push(
      "Hole Card ist vor dem Aufdecken unbekannt und geht nicht in die Entscheidung."
    );
  }

  const holeOnly =
    reasons.length > 0 &&
    reasons.every((reason) => reason.startsWith("Hole Card"));
  if (reasons.length === 0) {
    return {
      status: "OK",
      messageDe:
        "Beobachtung passt zum Schuh. Hole Card bleibt unbekannt, bis der Dealer dran ist.",
      holeRank,
      holeStaysUnknown: !holeVisible,
      blocksDecision: false,
    };
  }
  return {
    status: "LIMITED",
    messageDe: reasons.join(" "),
    holeRank,
    holeStaysUnknown: !holeVisible,
    blocksDecision: !holeOnly,
  };
}

/**
 * Shoe passed to the decision engine.
 * Visible player cards and the upcard are put back so they are removed once.
 * A hole rank entered too early is put back as well, so it stays an unknown card.
 */
export function shoeForUnseenDecision(input: {
  remainingByRank: RankInventory;
  playerCards: readonly CardRank[];
  dealerUp: CardRank;
  holeRank: CardRank | null;
  holeStaysUnknown: boolean;
}): RankInventory {
  const shoe = cloneInventory(input.remainingByRank);
  for (const card of input.playerCards) shoe[card] += 1;
  shoe[input.dealerUp] += 1;
  if (input.holeStaysUnknown && input.holeRank) {
    shoe[input.holeRank] += 1;
  }
  return shoe;
}
