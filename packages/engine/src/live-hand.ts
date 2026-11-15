import type { CardRank, DealtCard } from "./cards";
import type { ParticipationMode } from "./table-session";

export interface LiveHandState {
  ready: boolean;
  playerCards: CardRank[];
  dealerUpcard: CardRank | null;
  reasonDe: string;
}

export function liveHandFromDealt(
  dealt: readonly DealtCard[],
  roundId: number,
  roundOpen: boolean,
  participation: ParticipationMode
): LiveHandState {
  if (participation !== "playing") {
    return {
      ready: false,
      playerCards: [],
      dealerUpcard: null,
      reasonDe: "Beobachtungsmodus — kein Spieler-Tracking.",
    };
  }
  if (!roundOpen) {
    return {
      ready: false,
      playerCards: [],
      dealerUpcard: null,
      reasonDe: "Keine offene Runde.",
    };
  }

  const roundCards = dealt
    .filter((c) => c.roundId === roundId)
    .sort((a, b) => a.sequence - b.sequence);

  const playerCards = roundCards
    .filter((c) => c.target === "player")
    .map((c) => c.rank);
  const dealerCards = roundCards
    .filter((c) => c.target === "dealer")
    .map((c) => c.rank);

  if (playerCards.length < 2) {
    return {
      ready: false,
      playerCards,
      dealerUpcard: dealerCards[0] ?? null,
      reasonDe: "Mindestens zwei Spielerkarten in dieser Runde erfassen.",
    };
  }
  if (dealerCards.length < 1) {
    return {
      ready: false,
      playerCards,
      dealerUpcard: null,
      reasonDe: "Dealer-Upcard in dieser Runde erfassen.",
    };
  }

  return {
    ready: true,
    playerCards,
    dealerUpcard: dealerCards[0],
    reasonDe: "Live-Hand bereit.",
  };
}

export function liveHandStateKey(
  playerCards: readonly CardRank[],
  dealerUpcard: CardRank
): string {
  return `${[...playerCards].join(",")}|${dealerUpcard}`;
}