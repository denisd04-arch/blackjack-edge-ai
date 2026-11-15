import {
  type CardRank,
  type CardSuit,
  type CardTarget,
  type DealtCard,
} from "./cards";
import { buildCountSnapshot, type CountSnapshot } from "./counting";
import {
  canTakeRank,
  type RankInventory,
  shoeSnapshotFromSuit,
  type ShoeSnapshot,
} from "./shoe";
import {
  aggregateRankInventory,
  canTakeSuitRank,
  createFullSuitInventory,
  returnSuitRank,
  takeSuitRank,
  type SuitInventory,
} from "./suit-inventory";

export type ParticipationMode = "playing" | "observing";

export type TableActionResult =
  | { ok: true }
  | { ok: false; code: TableErrorCode; messageDe: string };

export type TableErrorCode =
  | "SHOE_DEPLETED"
  | "ROUND_CLOSED"
  | "CARD_NOT_FOUND"
  | "INVALID_DECKS"
  | "NOTHING_TO_UNDO";

export interface DigitalTableSnapshot {
  decks: number;
  participation: ParticipationMode;
  roundId: number;
  roundOpen: boolean;
  dealt: readonly DealtCard[];
  shoe: ShoeSnapshot;
  counts: CountSnapshot;
}

export interface DigitalTableSessionOptions {
  decks?: number;
  participation?: ParticipationMode;
}

let sequenceCounter = 0;

function nextId(): string {
  sequenceCounter += 1;
  return `card-${sequenceCounter}-${Date.now().toString(36)}`;
}

export class DigitalTableSession {
  private decks: number;
  private suitInventory: SuitInventory;
  private cardsDealt = 0;
  private participation: ParticipationMode;
  private roundId = 1;
  private roundOpen = false;
  private dealt: DealtCard[] = [];

  constructor(options: DigitalTableSessionOptions = {}) {
    this.decks = options.decks ?? 8;
    if (this.decks < 1 || this.decks > 12) {
      throw new Error("decks must be between 1 and 12");
    }
    this.suitInventory = createFullSuitInventory(this.decks);
    this.participation = options.participation ?? "playing";
  }

  private rankInventory(): RankInventory {
    return aggregateRankInventory(this.suitInventory);
  }

  snapshot(): DigitalTableSnapshot {
    const shoe = shoeSnapshotFromSuit(
      this.decks,
      this.suitInventory,
      this.cardsDealt
    );
    return {
      decks: this.decks,
      participation: this.participation,
      roundId: this.roundId,
      roundOpen: this.roundOpen,
      dealt: [...this.dealt],
      shoe,
      counts: buildCountSnapshot({
        dealt: this.dealt,
        remainingByRank: shoe.remainingByRank,
        cardsRemaining: shoe.cardsRemaining,
        cardsTotal: shoe.cardsTotal,
        penetration: shoe.penetration,
        decks: this.decks,
      }),
    };
  }

  setParticipation(mode: ParticipationMode): void {
    this.participation = mode;
  }

  setDecks(decks: number): TableActionResult {
    if (decks < 1 || decks > 12) {
      return {
        ok: false,
        code: "INVALID_DECKS",
        messageDe: "Schuhgröße muss zwischen 1 und 12 Decks liegen.",
      };
    }
    if (this.dealt.length > 0) {
      return {
        ok: false,
        code: "INVALID_DECKS",
        messageDe:
          "Deck-Anzahl nur änderbar nach neuem Schuh (keine Karten im Log).",
      };
    }
    this.decks = decks;
    this.suitInventory = createFullSuitInventory(decks);
    return { ok: true };
  }

  resetShoe(): void {
    this.suitInventory = createFullSuitInventory(this.decks);
    this.cardsDealt = 0;
    this.dealt = [];
    this.roundId = 1;
    this.roundOpen = false;
  }

  startRound(): TableActionResult {
    if (this.roundOpen) {
      return {
        ok: false,
        code: "ROUND_CLOSED",
        messageDe: "Runde läuft bereits — zuerst beenden.",
      };
    }
    this.roundOpen = true;
    return { ok: true };
  }

  endRound(): TableActionResult {
    if (!this.roundOpen) {
      return {
        ok: false,
        code: "ROUND_CLOSED",
        messageDe: "Keine offene Runde zum Beenden.",
      };
    }
    this.roundOpen = false;
    this.roundId += 1;
    return { ok: true };
  }

  dealCard(
    rank: CardRank,
    suit: CardSuit,
    target: CardTarget
  ): TableActionResult & { card?: DealtCard } {
    if (!this.roundOpen) {
      return {
        ok: false,
        code: "ROUND_CLOSED",
        messageDe: "Runde starten, bevor Karten erfasst werden.",
      };
    }
    const inventory = this.rankInventory();
    if (!canTakeRank(inventory, rank)) {
      return {
        ok: false,
        code: "SHOE_DEPLETED",
        messageDe: `Keine ${rank} mehr im Schuh — Eingabe blockiert.`,
      };
    }
    if (!canTakeSuitRank(this.suitInventory, rank, suit)) {
      return {
        ok: false,
        code: "SHOE_DEPLETED",
        messageDe: `Keine ${rank} ${suit} mehr im Schuh — Eingabe blockiert.`,
      };
    }
    const nextInv = takeSuitRank(this.suitInventory, rank, suit);
    if (!nextInv) {
      return {
        ok: false,
        code: "SHOE_DEPLETED",
        messageDe: "Schuh überdepletiert — Eingabe blockiert.",
      };
    }
    this.suitInventory = nextInv;
    this.cardsDealt += 1;
    const card: DealtCard = {
      id: nextId(),
      rank,
      suit,
      target,
      roundId: this.roundId,
      sequence: this.cardsDealt,
    };
    this.dealt.push(card);
    return { ok: true, card };
  }

  undoLast(): TableActionResult {
    const last = this.dealt[this.dealt.length - 1];
    if (!last) {
      return {
        ok: false,
        code: "NOTHING_TO_UNDO",
        messageDe: "Keine Karte zum Rückgängigmachen.",
      };
    }
    this.dealt.pop();
    this.suitInventory = returnSuitRank(
      this.suitInventory,
      last.rank,
      last.suit
    );
    this.cardsDealt -= 1;
    return { ok: true };
  }

  removeCard(id: string): TableActionResult {
    const index = this.dealt.findIndex((c) => c.id === id);
    if (index === -1) {
      return {
        ok: false,
        code: "CARD_NOT_FOUND",
        messageDe: "Karte nicht gefunden.",
      };
    }
    const [removed] = this.dealt.splice(index, 1);
    this.suitInventory = returnSuitRank(
      this.suitInventory,
      removed.rank,
      removed.suit
    );
    this.cardsDealt -= 1;
    return { ok: true };
  }

  editCard(
    id: string,
    rank: CardRank,
    suit: CardSuit,
    target?: CardTarget
  ): TableActionResult {
    const index = this.dealt.findIndex((c) => c.id === id);
    if (index === -1) {
      return {
        ok: false,
        code: "CARD_NOT_FOUND",
        messageDe: "Karte nicht gefunden.",
      };
    }
    const existing = this.dealt[index];
    let inv = returnSuitRank(
      this.suitInventory,
      existing.rank,
      existing.suit
    );
    const changedRank = existing.rank !== rank;
    const changedSuit = existing.suit !== suit;
    if (changedRank || changedSuit) {
      const afterRank = aggregateRankInventory(inv);
      if (changedRank && !canTakeRank(afterRank, rank)) {
        return {
          ok: false,
          code: "SHOE_DEPLETED",
          messageDe: `Keine ${rank} mehr im Schuh — Bearbeitung blockiert.`,
        };
      }
      if (!canTakeSuitRank(inv, rank, suit)) {
        return {
          ok: false,
          code: "SHOE_DEPLETED",
          messageDe: `Keine ${rank} ${suit} mehr im Schuh — Bearbeitung blockiert.`,
        };
      }
      const taken = takeSuitRank(inv, rank, suit);
      if (!taken) {
        return {
          ok: false,
          code: "SHOE_DEPLETED",
          messageDe: "Schuh überdepletiert — Bearbeitung blockiert.",
        };
      }
      inv = taken;
    }
    this.suitInventory = inv;
    this.dealt[index] = {
      ...existing,
      rank,
      suit,
      target: target ?? existing.target,
    };
    return { ok: true };
  }
}