import {
  type CardRank,
  type CardSuit,
  type CardTarget,
  type DealtCard,
} from "./cards";
import {
  canTakeRank,
  createFullShoeInventory,
  returnRank,
  shoeSnapshot,
  takeRank,
  type RankInventory,
  type ShoeSnapshot,
} from "./shoe";

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
  private inventory: RankInventory;
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
    this.inventory = createFullShoeInventory(this.decks);
    this.participation = options.participation ?? "playing";
  }

  snapshot(): DigitalTableSnapshot {
    return {
      decks: this.decks,
      participation: this.participation,
      roundId: this.roundId,
      roundOpen: this.roundOpen,
      dealt: [...this.dealt],
      shoe: shoeSnapshot(this.decks, this.inventory, this.cardsDealt),
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
    this.inventory = createFullShoeInventory(decks);
    return { ok: true };
  }

  resetShoe(): void {
    this.inventory = createFullShoeInventory(this.decks);
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
    if (!canTakeRank(this.inventory, rank)) {
      return {
        ok: false,
        code: "SHOE_DEPLETED",
        messageDe: `Keine ${rank} mehr im Schuh — Eingabe blockiert.`,
      };
    }
    const nextInv = takeRank(this.inventory, rank);
    if (!nextInv) {
      return {
        ok: false,
        code: "SHOE_DEPLETED",
        messageDe: "Schuh überdepletiert — Eingabe blockiert.",
      };
    }
    this.inventory = nextInv;
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
    this.inventory = returnRank(this.inventory, last.rank);
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
    this.inventory = returnRank(this.inventory, removed.rank);
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
    const restored = returnRank(this.inventory, existing.rank);
    if (existing.rank !== rank && !canTakeRank(restored, rank)) {
      return {
        ok: false,
        code: "SHOE_DEPLETED",
        messageDe: `Keine ${rank} mehr im Schuh — Bearbeitung blockiert.`,
      };
    }
    const afterTake =
      existing.rank === rank ? restored : takeRank(restored, rank);
    if (!afterTake) {
      return {
        ok: false,
        code: "SHOE_DEPLETED",
        messageDe: "Schuh überdepletiert — Bearbeitung blockiert.",
      };
    }
    this.inventory = afterTake;
    this.dealt[index] = {
      ...existing,
      rank,
      suit,
      target: target ?? existing.target,
    };
    return { ok: true };
  }
}