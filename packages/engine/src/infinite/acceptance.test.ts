import { describe, expect, it } from "vitest";
import { freshShoe52 } from "./model";
import { decisionHand, seenShoe } from "./session";
import {
  cardsDealtPhysical,
  confirmParticipation,
  createShoe,
  dealCard,
  holeReserved,
  myHandTotal,
  requestHoleReveal,
  setInsurance,
  splitHand,
  stand,
  type RoundStakes,
  type ShoeSession,
} from "./session";
import { dealerStatus, globalTableStatus, myHandStatus, roundSettlementStatus } from "./status";
import { settleSessionRound } from "./settlement";

const zero: RoundStakes = { main: 0, anyPair: 0, twentyOnePlusThree: 0, hot3: 0, bustIt: 0 };

function played(main = 10): ShoeSession {
  return confirmParticipation(createShoe(), {
    round: 1,
    recommendation: "NOT_DEFINITIVE",
    actual: "PLAYED",
    stakes: { ...zero, main },
  });
}

function card(session: ShoeSession, rank: ShoeSession["events"][number]["rank"], suit: ShoeSession["events"][number]["suit"], target?: ShoeSession["events"][number]["target"]) {
  const result = dealCard(session, rank, suit, target);
  expect(result.error, `${rank}${suit}`).toBeUndefined();
  return result.session;
}

describe("phase 1 acceptance", () => {
  it("A: 19 stays 19 after five other cards and wins against dealer 18", () => {
    let session = played();
    session = card(session, "10", "spades");
    session = card(session, "8", "clubs");
    session = card(session, "9", "hearts");
    expect(myHandTotal(session)).toBe(19);
    session = stand(session);
    expect(myHandStatus(session)).toBe("STOOD");
    expect(globalTableStatus(session)).not.toBe("ROUND_CLOSED");
    for (const [rank, suit] of [
      ["7", "diamonds"],
      ["3", "clubs"],
      ["2", "hearts"],
      ["4", "spades"],
      ["5", "clubs"],
    ] as const) {
      session = card(session, rank, suit);
      expect(myHandTotal(session)).toBe(19);
    }
    session = requestHoleReveal(session);
    expect(globalTableStatus(session)).toBe("AWAITING_HOLE");
    session = card(session, "10", "diamonds");
    expect(dealerStatus(session)).toBe("STAND");
    expect(myHandTotal(session)).toBe(19);
    const money = settleSessionRound(session);
    expect(money?.status).toBe("SETTLED");
    expect(money?.outcome).toBe("WIN");
    expect(money?.playerTotal).toBe(19);
    expect(money?.dealerTotal).toBe(18);
    expect(money?.mainNet).toBe(10);
    expect(roundSettlementStatus(money?.status)).toBe("SETTLED");
  });

  it("B and C: 19 pushes 19 and loses to 20", () => {
    let push = played();
    push = card(push, "10", "spades");
    push = card(push, "9", "clubs");
    push = card(push, "9", "hearts");
    push = stand(push);
    push = requestHoleReveal(push);
    push = card(push, "10", "diamonds");
    const pushed = settleSessionRound(push);
    expect(pushed?.outcome).toBe("PUSH");
    expect(pushed?.mainNet).toBe(0);

    let loss = played();
    loss = card(loss, "10", "spades");
    loss = card(loss, "K", "clubs");
    loss = card(loss, "9", "hearts");
    loss = stand(loss);
    loss = requestHoleReveal(loss);
    loss = card(loss, "Q", "diamonds");
    const lost = settleSessionRound(loss);
    expect(lost?.outcome).toBe("LOSS");
    expect(lost?.dealerTotal).toBe(20);
    expect(lost?.mainNet).toBe(-10);
  });

  it("D: a live hand wins a dealer bust", () => {
    let session = played();
    session = card(session, "10", "spades");
    session = card(session, "6", "clubs");
    session = card(session, "9", "hearts");
    session = stand(session);
    session = requestHoleReveal(session);
    session = card(session, "10", "diamonds");
    session = card(session, "8", "spades");
    const money = settleSessionRound(session);
    expect(money?.outcome).toBe("DEALER_BUST");
    expect(money?.mainNet).toBe(10);
    expect(dealerStatus(session)).toBe("BUST");
  });

  it("E: a bust freezes before the dealer acts and loses", () => {
    let session = played();
    session = card(session, "10", "spades");
    session = card(session, "6", "clubs");
    session = card(session, "5", "hearts");
    session = card(session, "K", "diamonds");
    expect(myHandTotal(session)).toBe(25);
    expect(myHandStatus(session)).toBe("BUST");
    expect(session.phase).toBe("after_stand");
    expect(globalTableStatus(session)).not.toBe("ROUND_CLOSED");
    session = card(session, "2", "clubs");
    expect(myHandTotal(session)).toBe(25);
    session = requestHoleReveal(session);
    session = card(session, "5", "hearts");
    session = card(session, "K", "clubs");
    const money = settleSessionRound(session);
    expect(money?.outcome).toBe("BUST");
    expect(money?.mainNet).toBe(-10);
  });

  it("F: dealer 22 pushes an eligible 19 and is not a bust", () => {
    let session = played();
    session = card(session, "10", "spades");
    session = card(session, "6", "clubs");
    session = card(session, "9", "hearts");
    session = stand(session);
    session = requestHoleReveal(session);
    session = card(session, "6", "diamonds");
    session = card(session, "K", "hearts");
    expect(dealerStatus(session)).toBe("DEALER_22");
    const money = settleSessionRound(session);
    expect(money?.outcome).toBe("DEALER_22");
    expect(money?.dealerLabel).toBe("22");
    expect(money?.mainNet).toBe(0);
  });

  it("G: the hole is reserved once and revealed without a second removal", () => {
    let session = played();
    session = card(session, "10", "spades");
    session = card(session, "8", "clubs");
    session = card(session, "9", "hearts");
    const shoe = freshShoe52(8);
    const before = seenShoe(session);
    expect(holeReserved(session)).toBe(true);
    expect(cardsDealtPhysical(session)).toBe(session.events.length + 1);
    expect(before[4 * 9 + 1]).toBe(shoe[4 * 9 + 1]);
    const physical = cardsDealtPhysical(session);
    session = stand(session);
    session = requestHoleReveal(session);
    session = card(session, "10", "diamonds");
    const after = seenShoe(session);
    expect(holeReserved(session)).toBe(false);
    expect(cardsDealtPhysical(session)).toBe(physical);
    expect(after[4 * 9 + 1]).toBe((shoe[4 * 9 + 1] ?? 0) - 1);
    expect(session.events.filter((event) => event.target === "dealer_hole")).toHaveLength(1);
  });

  it("H: two split hands freeze and settle apart", () => {
    let session = played(10);
    session = card(session, "8", "spades");
    session = card(session, "9", "clubs");
    session = card(session, "8", "hearts");
    const split = splitHand(session, "SPLIT_FREE");
    expect(split.error).toBeUndefined();
    session = split.session;
    expect(session.handCount).toBe(2);
    session = card(session, "K", "hearts");
    session = stand(session);
    expect(session.hands[0]?.frozen).toBe(true);
    expect(session.hands[1]?.frozen).toBe(false);
    session = card(session, "A", "spades");
    session = stand(session);
    expect(session.hands.every((hand) => hand.frozen)).toBe(true);
    expect(globalTableStatus(session)).not.toBe("ROUND_CLOSED");
    session = requestHoleReveal(session);
    session = card(session, "9", "diamonds");
    const money = settleSessionRound(session);
    expect(money?.status).toBe("SETTLED");
    expect(money?.outcome).toBe("MIXED");
    expect(money?.hands.map((hand) => hand.outcome)).toEqual(["PUSH", "WIN"]);
    expect(money?.hands[0]?.net).toBe(0);
    expect(money?.hands[1]?.cash).toBe(0);
    expect(money?.hands[1]?.net).toBe(10);
    expect(money?.mainNet).toBe(10);
    expect(money?.mainCash).toBe(10);
  });

  it("I: a natural blackjack is terminal and pays 3:2", () => {
    let session = played(10);
    session = card(session, "A", "spades");
    session = card(session, "7", "clubs");
    session = card(session, "K", "hearts");
    expect(myHandStatus(session)).toBe("BLACKJACK");
    expect(session.phase).toBe("after_stand");
    expect(globalTableStatus(session)).not.toBe("ROUND_CLOSED");
    session = requestHoleReveal(session);
    session = card(session, "9", "diamonds");
    session = card(session, "5", "clubs");
    const money = settleSessionRound(session);
    expect(money?.outcome).toBe("BLACKJACK");
    expect(money?.mainNet).toBe(15);
    expect(dealerStatus(session)).toBe("STAND");
  });

  it("J: a skip has no personal hand and still removes global cards", () => {
    let session = confirmParticipation(createShoe(), {
      round: 1,
      recommendation: "SKIP",
      actual: "SKIPPED",
      stakes: zero,
    });
    expect(decisionHand(session)).toBeNull();
    expect(myHandStatus(session)).toBe("SKIPPED");
    const before = seenShoe(session)[1 * 4 + 0];
    session = card(session, "2", "hearts");
    session = card(session, "K", "clubs");
    session = card(session, "3", "spades");
    expect(decisionHand(session)).toBeNull();
    expect(seenShoe(session)[1 * 4 + 0]).toBe((before ?? 0) - 1);
    expect(session.events.filter((event) => event.target === "other" || event.target === "shared" || event.target === "dealer_up").length).toBe(3);
    const blocked = setInsurance(session, 1);
    expect(blocked.error).toBeTruthy();
  });
});
