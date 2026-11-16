import { describe, expect, it } from "vitest";
import { handProfit } from "./model";
import {
  answerBustIt22,
  cardsDealtPhysical,
  confirmParticipation,
  createShoe,
  dealCard,
  dealerFinished,
  expectedTarget,
  holeReserved,
  myHandTotal,
  requestHoleReveal,
  retargetEvent,
  stand,
  type RoundStakes,
  type ShoeSession,
} from "./session";
import { applyToLedger, emptyLedger, lifetimeRollup, roi, settleSessionRound, shoeRollup } from "./settlement";
import { consumeShoe } from "./simulate";
import { PAYTABLE_V2 } from "./side-bets";

const zeroSides: RoundStakes = { main: 0, anyPair: 0, twentyOnePlusThree: 0, hot3: 0, bustIt: 0 };

function play(session: ShoeSession, rank: ShoeSession["events"][number]["rank"], suit: ShoeSession["events"][number]["suit"]) {
  const result = dealCard(session, rank, suit);
  expect(result.error).toBeUndefined();
  return result.session;
}

function withPlay(session: ShoeSession, recommendation: string, actual: "PLAYED" | "SKIPPED", main: number, extra: Partial<RoundStakes> = {}) {
  return confirmParticipation(session, {
    round: session.round,
    recommendation,
    actual,
    stakes: { ...zeroSides, ...extra, main: actual === "SKIPPED" ? 0 : main },
  });
}

describe("frozen hand settlement", () => {
  it("keeps 10♠+9♥ at 19 after other cards, then settles against the real dealer", () => {
    let session = withPlay(createShoe(), "SKIP", "PLAYED", 10);
    session = play(session, "10", "spades");
    session = play(session, "6", "clubs");
    session = play(session, "9", "hearts");
    expect(myHandTotal(session)).toBe(19);
    const reserved = cardsDealtPhysical(session);
    expect(holeReserved(session)).toBe(true);
    session = stand(session);
    expect(session.frozenHandIds).toHaveLength(2);
    session = play(session, "7", "diamonds");
    session = play(session, "3", "clubs");
    session = play(session, "K", "hearts");
    expect(myHandTotal(session)).toBe(19);
    expect(session.events.filter((event) => event.target === "other").map((event) => `${event.rank}${event.suit}`)).toEqual([
      "7diamonds",
      "3clubs",
      "Khearts",
    ]);
    expect(holeReserved(session)).toBe(true);
    expect(cardsDealtPhysical(session)).toBe(reserved + 3);
    session = requestHoleReveal(session);
    expect(expectedTarget(session)).toBe("dealer_hole");
    session = play(session, "8", "diamonds");
    expect(holeReserved(session)).toBe(false);
    expect(expectedTarget(session)).toBe("dealer_draw");
    expect(myHandTotal(session)).toBe(19);
    session = play(session, "5", "spades");
    expect(dealerFinished(session)).toBe(true);
    expect(expectedTarget(session)).toBeNull();
    const blocked = dealCard(session, "2", "hearts", "my_hand");
    expect(blocked.error).toMatch(/frozen/);
    expect(myHandTotal(blocked.session)).toBe(19);
    const moved = retargetEvent(session, session.events.find((event) => event.rank === "7")!.id, "my_hand");
    expect(myHandTotal(moved)).toBe(19);
    const money = settleSessionRound(session);
    expect(money?.status).toBe("SETTLED");
    expect(money?.playerTotal).toBe(19);
    expect(money?.dealerTotal).toBe(19);
    expect(money?.mainNet).toBe(0);
    expect(money?.recommendation).toBe("SKIP");
    expect(money?.actual).toBe("PLAYED");
  });

  it("stores all four recommendation and participation combinations", () => {
    const cases = [
      ["PLAY", "PLAYED"],
      ["PLAY", "SKIPPED"],
      ["SKIP", "PLAYED"],
      ["SKIP", "SKIPPED"],
    ] as const;
    for (const [recommendation, actual] of cases) {
      let session = withPlay(createShoe(), recommendation, actual, 5);
      session = play(session, "10", "spades");
      session = play(session, "10", "hearts");
      session = play(session, "9", "clubs");
      session = stand(session);
      session = requestHoleReveal(session);
      session = play(session, "7", "diamonds");
      const money = settleSessionRound(session);
      expect(money?.recommendation).toBe(recommendation);
      expect(money?.actual).toBe(actual);
      if (actual === "SKIPPED") {
        expect(money?.mainNet).toBe(0);
        expect(money?.mainCash).toBe(0);
        expect(money?.mainRoi).toBeNull();
      } else {
        expect(money?.playerTotal).toBe(19);
        expect(money?.dealerTotal).toBe(17);
        expect(money?.mainNet).toBe(5);
        expect(money?.mainRoi).toBe(1);
      }
    }
  });

  it("pushes dealer 22 and pays Charlie with the verified rule", () => {
    let push = withPlay(createShoe(), "PLAY", "PLAYED", 4);
    push = play(push, "10", "spades");
    push = play(push, "10", "hearts");
    push = play(push, "9", "clubs");
    push = stand(push);
    push = requestHoleReveal(push);
    push = play(push, "6", "diamonds");
    push = play(push, "6", "clubs");
    const pushed = settleSessionRound(push);
    expect(pushed?.dealerLabel).toBe("22");
    expect(pushed?.playerTotal).toBe(19);
    expect(pushed?.mainNet).toBe(0);

    let charlie = withPlay(createShoe(), "SKIP", "PLAYED", 2);
    charlie = play(charlie, "A", "spades");
    charlie = play(charlie, "10", "hearts");
    charlie = play(charlie, "2", "clubs");
    charlie = play(charlie, "3", "diamonds");
    charlie = play(charlie, "4", "spades");
    charlie = play(charlie, "5", "hearts");
    charlie = play(charlie, "6", "clubs");
    charlie = stand(charlie);
    expect(myHandTotal(charlie)).toBe(21);
    charlie = requestHoleReveal(charlie);
    charlie = play(charlie, "6", "diamonds");
    charlie = play(charlie, "6", "spades");
    const charlie22 = settleSessionRound(charlie);
    expect(charlie22?.dealerTotal).toBe(22);
    expect(charlie22?.mainNet).toBe(0);
    expect(charlie22?.mainNet).toBe(handProfit(
      { total: 21, bust: false, blackjack: false, charlie: true, cash: true, mode: "plain" },
      { type: "22" }
    ) * 2);
  });

  it("pays every side-bet category from the cards and leaves Bust It on 22 pending", () => {
    expect(PAYTABLE_V2.anyPair).toEqual({ perfect: 25, colored: 12, mixed: 6 });
    expect(PAYTABLE_V2.twentyOnePlusThree).toEqual({ suitedTrips: 100, straightFlush: 40, threeOfAKind: 25, straight: 10, flush: 5 });
    expect(PAYTABLE_V2.hot3).toEqual({ sevenSevenSeven: 100, suited21: 20, unsuited21: 4, total20: 2, total19: 1 });
    expect(PAYTABLE_V2.bustIt).toEqual({ 8: 250, 7: 100, 6: 50, 5: 9, 4: 2, 3: 1 });

    function sideRound(cards: Array<["A" | "2" | "3" | "4" | "5" | "6" | "7" | "8" | "K" | "10" | "9", "spades" | "hearts" | "diamonds" | "clubs"]>, stakes: Partial<RoundStakes>, dealerExtra: typeof cards = []) {
      let session = withPlay(createShoe(), "SKIP", "SKIPPED", 0, stakes);
      const [first, up, second, ...rest] = cards;
      session = play(session, first![0], first![1]);
      session = play(session, up![0], up![1]);
      session = play(session, second![0], second![1]);
      if (rest.length || dealerExtra.length) session = stand(session);
      else session = stand(session);
      for (const card of rest) session = play(session, card[0], card[1]);
      session = requestHoleReveal(session);
      const hole = dealerExtra[0] ?? (["7", "diamonds"] as const);
      session = play(session, hole[0], hole[1]);
      for (const card of dealerExtra.slice(1)) session = play(session, card[0], card[1]);
      return settleSessionRound(session);
    }

    const perfect = sideRound(
      [["A", "spades"], ["10", "hearts"], ["A", "spades"]],
      { anyPair: 2 }
    );
    expect(perfect?.sides.find((side) => side.id === "any_pair")).toMatchObject({ category: "perfect", net: 50, status: "SETTLED" });

    const colored = sideRound(
      [["A", "hearts"], ["10", "clubs"], ["A", "diamonds"]],
      { anyPair: 1 }
    );
    expect(colored?.sides.find((side) => side.id === "any_pair")?.net).toBe(12);

    const mixed = sideRound(
      [["A", "spades"], ["10", "clubs"], ["A", "hearts"]],
      { anyPair: 1 }
    );
    expect(mixed?.sides.find((side) => side.id === "any_pair")?.net).toBe(6);

    const trips = sideRound(
      [["A", "spades"], ["A", "spades"], ["A", "spades"]],
      { twentyOnePlusThree: 1 }
    );
    expect(trips?.sides.find((side) => side.id === "twenty_one_plus_three")?.net).toBe(100);

    const straightFlush = sideRound(
      [["A", "spades"], ["2", "spades"], ["3", "spades"]],
      { twentyOnePlusThree: 1 },
      [["K", "hearts"], ["5", "clubs"]]
    );
    expect(straightFlush?.sides.find((side) => side.id === "twenty_one_plus_three")?.category).toBe("straightFlush");
    expect(straightFlush?.sides.find((side) => side.id === "twenty_one_plus_three")?.net).toBe(40);

    const kind = sideRound(
      [["A", "spades"], ["A", "hearts"], ["A", "diamonds"]],
      { twentyOnePlusThree: 1 },
      [["6", "clubs"]]
    );
    expect(kind?.sides.find((side) => side.id === "twenty_one_plus_three")?.net).toBe(25);

    const straight = sideRound(
      [["A", "spades"], ["2", "hearts"], ["3", "diamonds"]],
      { twentyOnePlusThree: 1 },
      [["K", "clubs"], ["5", "spades"]]
    );
    expect(straight?.sides.find((side) => side.id === "twenty_one_plus_three")?.category).toBe("straight");

    const flush = sideRound(
      [["2", "spades"], ["9", "spades"], ["5", "spades"]],
      { twentyOnePlusThree: 1 },
      [["8", "hearts"]]
    );
    expect(flush?.sides.find((side) => side.id === "twenty_one_plus_three")?.category).toBe("flush");
    expect(flush?.sides.find((side) => side.id === "twenty_one_plus_three")?.net).toBe(5);

    const seven = sideRound(
      [["7", "spades"], ["7", "hearts"], ["7", "diamonds"]],
      { hot3: 1 },
      [["10", "clubs"]]
    );
    expect(seven?.sides.find((side) => side.id === "hot3")?.net).toBe(100);

    const suited21 = sideRound(
      [["K", "spades"], ["5", "spades"], ["6", "spades"]],
      { hot3: 1 },
      [["10", "hearts"], ["2", "clubs"]]
    );
    expect(suited21?.sides.find((side) => side.id === "hot3")?.category).toBe("suited21");
    expect(suited21?.sides.find((side) => side.id === "hot3")?.net).toBe(20);

    const unsuited = sideRound(
      [["K", "spades"], ["5", "hearts"], ["6", "diamonds"]],
      { hot3: 1 },
      [["10", "clubs"], ["2", "spades"]]
    );
    expect(unsuited?.sides.find((side) => side.id === "hot3")?.net).toBe(4);

    const total20 = sideRound(
      [["K", "spades"], ["5", "hearts"], ["5", "diamonds"]],
      { hot3: 1 },
      [["10", "clubs"], ["2", "spades"]]
    );
    expect(total20?.sides.find((side) => side.id === "hot3")?.net).toBe(2);

    const total19 = sideRound(
      [["K", "spades"], ["4", "hearts"], ["5", "diamonds"]],
      { hot3: 1 },
      [["10", "clubs"], ["3", "spades"]]
    );
    expect(total19?.sides.find((side) => side.id === "hot3")?.net).toBe(1);

    let bust = withPlay(createShoe(), "SKIP", "SKIPPED", 0, { bustIt: 1 });
    bust = play(bust, "10", "spades");
    bust = play(bust, "2", "hearts");
    bust = play(bust, "9", "clubs");
    bust = stand(bust);
    bust = requestHoleReveal(bust);
    bust = play(bust, "3", "diamonds");
    bust = play(bust, "4", "clubs");
    bust = play(bust, "5", "spades");
    bust = play(bust, "K", "hearts");
    const busted = settleSessionRound(bust);
    expect(busted?.dealerLabel.startsWith("bust")).toBe(true);
    expect(busted?.sides.find((side) => side.id === "bust_it")?.net).toBe(9);
    expect(busted?.sideRoi).toBe(9);
    expect(busted?.mainRoi).toBeNull();
    expect(busted?.roundRoi).toBe(9);

    let twentyTwo = withPlay(createShoe(), "PLAY", "PLAYED", 8, { bustIt: 3 });
    twentyTwo = play(twentyTwo, "10", "spades");
    twentyTwo = play(twentyTwo, "10", "hearts");
    twentyTwo = play(twentyTwo, "8", "clubs");
    twentyTwo = stand(twentyTwo);
    twentyTwo = requestHoleReveal(twentyTwo);
    twentyTwo = play(twentyTwo, "6", "diamonds");
    twentyTwo = play(twentyTwo, "6", "clubs");
    const pending = settleSessionRound(twentyTwo);
    expect(pending?.status).toBe("PENDING");
    expect(pending?.pendingReason).toMatch(/Bust It/);
    let ledger = emptyLedger(100);
    const first = applyToLedger(ledger, pending!);
    expect(first.applied).toBe(false);
    expect(first.ledger.bankroll).toBe(100);
    twentyTwo = answerBustIt22(twentyTwo, false);
    const declined = settleSessionRound(twentyTwo);
    expect(declined?.status).toBe("SETTLED");
    expect(declined?.sides.find((side) => side.id === "bust_it")?.net).toBe(-3);
    expect(declined?.mainNet).toBe(0);
    ledger = applyToLedger(first.ledger, declined!).ledger;
    expect(ledger.bankroll).toBe(97);
    const again = applyToLedger(ledger, declined!);
    expect(again.applied).toBe(false);
    expect(again.ledger.bankroll).toBe(ledger.bankroll);
    const paid = settleSessionRound(answerBustIt22(twentyTwo, true));
    expect(paid?.sides.find((side) => side.id === "bust_it")?.net).toBe(3);
    expect(shoeRollup(ledger, twentyTwo.id).winning).toBe(false);
    expect(lifetimeRollup(ledger).roundNet).toBe(-3);
    expect(roi(0, 0)).toBeNull();
  });

  it("does not invent profit for a skipped round and keeps the simulation on the same ledger", () => {
    let session = withPlay(createShoe(), "PLAY", "SKIPPED", 50, { anyPair: 0 });
    session = play(session, "A", "spades");
    session = play(session, "10", "hearts");
    session = play(session, "K", "clubs");
    session = stand(session);
    session = requestHoleReveal(session);
    session = play(session, "7", "diamonds");
    const skipped = settleSessionRound(session);
    expect(skipped?.mainNet).toBe(0);
    expect(skipped?.roundNet).toBe(0);
    expect(skipped?.roundCash).toBe(0);
    expect(skipped?.roundRoi).toBeNull();
    const ledger = applyToLedger(emptyLedger(250), skipped!);
    expect(ledger.ledger.bankroll).toBe(250);
    const duplicate = applyToLedger(ledger.ledger, skipped!);
    expect(duplicate.applied).toBe(false);
    expect(duplicate.ledger.bankroll).toBe(250);

    const sim = consumeShoe({ seed: 3, maxRounds: 4, backgroundCards: 0 });
    const summed = sim.ledger.entries.reduce((sum, entry) => sum + (entry.roundNet ?? 0), 0);
    expect(summed).toBeCloseTo(sim.net);
    expect(sim.ledger.entries.every((entry) => entry.actual === "PLAYED" && entry.sideCash === 0)).toBe(true);
    expect(lifetimeRollup(sim.ledger).roundRoi === null || typeof lifetimeRollup(sim.ledger).roundRoi === "number").toBe(true);
  });
});
