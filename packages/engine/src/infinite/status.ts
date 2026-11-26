import { dealerCards, dealerFinished, holeReserved, myHandEvents, myHandTotal, type ShoeSession } from "./session";
import { readDealer } from "./settlement";
import { cardIndex } from "./model";

export type MyHandStatus =
  | "EMPTY"
  | "DEALING"
  | "PLAYING"
  | "STOOD"
  | "BUST"
  | "BLACKJACK"
  | "CHARLIE"
  | "SPLIT_ACE"
  | "SKIPPED";

export type GlobalTableStatus =
  | "IDLE"
  | "ROUND_OPEN"
  | "OTHER_PLAYERS"
  | "AWAITING_HOLE"
  | "DEALER_DRAW"
  | "ROUND_CLOSED";

export type DealerStatus =
  | "NONE"
  | "UPCARD"
  | "HOLE_RESERVED"
  | "PLAYING"
  | "STAND"
  | "BLACKJACK"
  | "BUST"
  | "DEALER_22";

export type RoundSettlementStatus = "NONE" | "PENDING" | "SETTLED";

export function myHandStatus(session: ShoeSession): MyHandStatus {
  if (session.participation?.actual === "SKIPPED" && session.participation.round === session.round) return "SKIPPED";
  const active = session.hands.find((hand) => hand.index === session.activeHand);
  if (active?.terminal === "bust") return "BUST";
  if (active?.terminal === "blackjack") return "BLACKJACK";
  if (active?.terminal === "charlie") return "CHARLIE";
  if (active?.terminal === "split-ace") return "SPLIT_ACE";
  if (active?.terminal === "stand" || (session.frozenHandIds && session.hands.length <= 1 && session.phase !== "decision")) {
    return "STOOD";
  }
  const cards = myHandEvents(session);
  if (!session.roundStarted && cards.length === 0) return "EMPTY";
  if (cards.length < 2) return "DEALING";
  return "PLAYING";
}

/** Own-hand completion never closes the global round. */
export function globalTableStatus(session: ShoeSession): GlobalTableStatus {
  const roundEvents = session.events.filter((event) => event.round === session.round);
  if (session.phase === "complete") return "ROUND_CLOSED";
  if (!session.roundStarted && roundEvents.length === 0) return "IDLE";
  const hole = roundEvents.some((event) => event.target === "dealer_hole");
  const up = roundEvents.some((event) => event.target === "dealer_up");
  if (session.phase === "after_stand" || session.hands.every((hand) => hand.frozen) && session.hands.length > 0) {
    if (!hole) return session.revealHole ? "AWAITING_HOLE" : "OTHER_PLAYERS";
    if (!dealerFinished(session)) return "DEALER_DRAW";
  }
  if (up && !hole && session.revealHole) return "AWAITING_HOLE";
  return "ROUND_OPEN";
}

export function dealerStatus(session: ShoeSession): DealerStatus {
  const cards = dealerCards(session);
  if (cards.length === 0) return "NONE";
  if (cards.length === 1) return holeReserved(session) ? "HOLE_RESERVED" : "UPCARD";
  const buckets = cards.map((event) => {
    const rank = Math.floor(cardIndex(event.rank, event.suit) / 4);
    return rank >= 9 ? 9 : rank;
  });
  const dealer = readDealer(buckets);
  if (!dealer.finished) return cards.length === 1 ? "HOLE_RESERVED" : "PLAYING";
  if (dealer.kind.type === "bj") return "BLACKJACK";
  if (dealer.kind.type === "22") return "DEALER_22";
  if (dealer.kind.type === "bust") return "BUST";
  return "STAND";
}

export function roundSettlementStatus(status: "SETTLED" | "PENDING" | null | undefined): RoundSettlementStatus {
  if (status === "SETTLED") return "SETTLED";
  if (status === "PENDING") return "PENDING";
  return "NONE";
}

export function handStill(session: ShoeSession): number | null {
  return myHandTotal(session);
}
