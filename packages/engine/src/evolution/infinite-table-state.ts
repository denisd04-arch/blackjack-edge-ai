import type { CardRank, DealtCard } from "../cards";
import type { EvolutionGameVariant } from "../types";
import type { ParticipationMode } from "../table-session";

/**
 * Infinite Free Bet: every seat shares one initial two-card hand, then decides alone.
 * Those two cards leave the shoe once.
 */
export interface InfiniteSharedHandState {
  sharedPlayerCards: readonly CardRank[] | null;
  dealerUpcard: CardRank | null;
  participation: ParticipationMode;
  roundOpen: boolean;
  usesSharedInitial: boolean;
}

export function infiniteSharedHandLabelDe(
  state: InfiniteSharedHandState
): string {
  if (!state.usesSharedInitial) {
    return "Kein Infinite-Modus — normale Platzkarten.";
  }
  if (!state.sharedPlayerCards || state.sharedPlayerCards.length < 2) {
    return "Gemeinsame Startkarten noch nicht vollständig. Jede Karte nur einmal erfassen.";
  }
  return `Gemeinsame Startkarten: ${state.sharedPlayerCards.join(", ")}. Danach entscheidet jeder Platz allein — Karten nicht pro Platz wiederholen.`;
}

export function infiniteStateFromDealt(input: {
  variant: EvolutionGameVariant;
  dealt: readonly DealtCard[];
  roundId: number;
  roundOpen: boolean;
  participation: ParticipationMode;
}): InfiniteSharedHandState {
  const usesSharedInitial = input.variant === "evolution_infinite_free_bet";
  const roundCards = input.dealt.filter((c) => c.roundId === input.roundId);
  const shared = roundCards
    .filter((c) => c.target === "player")
    .map((c) => c.rank);
  const dealer = roundCards.find((c) => c.target === "dealer");
  return {
    sharedPlayerCards: usesSharedInitial ? shared : null,
    dealerUpcard: dealer?.rank ?? null,
    participation: input.participation,
    roundOpen: input.roundOpen,
    usesSharedInitial,
  };
}
