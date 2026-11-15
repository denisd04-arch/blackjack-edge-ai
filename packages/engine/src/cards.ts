export const CARD_RANKS = [
  "A",
  "2",
  "3",
  "4",
  "5",
  "6",
  "7",
  "8",
  "9",
  "10",
  "J",
  "Q",
  "K",
] as const;

export type CardRank = (typeof CARD_RANKS)[number];

export const CARD_SUITS = [
  "hearts",
  "diamonds",
  "clubs",
  "spades",
] as const;

export type CardSuit = (typeof CARD_SUITS)[number];

export type CardTarget = "dealer" | "player" | "other";

export interface DealtCard {
  id: string;
  rank: CardRank;
  suit: CardSuit;
  target: CardTarget;
  roundId: number;
  /** Monotonic deal order for undo. */
  sequence: number;
}

export const RANK_LABEL_DE: Record<CardRank, string> = {
  A: "Ass",
  "2": "2",
  "3": "3",
  "4": "4",
  "5": "5",
  "6": "6",
  "7": "7",
  "8": "8",
  "9": "9",
  "10": "10",
  J: "Bube",
  Q: "Dame",
  K: "König",
};

export const SUIT_LABEL_DE: Record<CardSuit, string> = {
  hearts: "Herz",
  diamonds: "Karo",
  clubs: "Kreuz",
  spades: "Pik",
};

export const SUIT_SYMBOL: Record<CardSuit, string> = {
  hearts: "♥",
  diamonds: "♦",
  clubs: "♣",
  spades: "♠",
};

export const TARGET_LABEL_DE: Record<CardTarget, string> = {
  dealer: "Dealer",
  player: "Spieler",
  other: "Andere",
};