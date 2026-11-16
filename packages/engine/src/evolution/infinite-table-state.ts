import type { CardRank } from "../cards";
import type { ParticipationMode } from "../table-session";

/**
 * Infinite Free Bet: all participants share the same initial two player cards,
 * then play individual decision trees (Evolution Infinite family).
 */
export interface InfiniteSharedHandState {
  sharedPlayerCards: readonly CardRank[] | null;
  dealerUpcard: CardRank | null;
  participation: ParticipationMode;
  roundOpen: boolean;
  /** Personal cards diverge after initial deal — tracked on DigitalTableSession.dealt. */
  usesSharedInitial: boolean;
}

export function infiniteSharedHandLabelDe(
  state: InfiniteSharedHandState
): string {
  if (!state.usesSharedInitial) {
    return "Kein Infinite-Modus — normale Platzkarten.";
  }
  if (!state.sharedPlayerCards || state.sharedPlayerCards.length < 2) {
    return "Gemeinsame Startkarten noch nicht vollständig.";
  }
  return `Gemeinsame Startkarten: ${state.sharedPlayerCards.join(", ")} (danach individuelle Entscheidungen).`;
}