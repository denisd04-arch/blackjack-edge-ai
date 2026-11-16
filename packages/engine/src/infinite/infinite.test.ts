import { describe, expect, it } from "vitest";
import { createDealerMemos, dealerDistribution } from "./dealer";
import { compositionHandEv, compositionNextRound, PRODUCT_ASSUMPTIONS } from "./composition-ev";
import { analyzeRemaining, MAIN_EV_VERIFICATION } from "./analysis";
import { evaluateActions, insuranceEv, nextRoundMainEv } from "./ev";
import { fullKellyFraction, kellyStake } from "./kelly";
import {
  bucketsFrom52,
  freshBuckets,
  freshShoe52,
  handProfit,
  playerEdgeFromEv,
  valueCards,
} from "./model";
import { freeBetProbabilities, isOpeningFreeDouble } from "./probabilities";
import { PRESETS } from "./presets";
import {
  FRESH_SHOE_HELP_REFERENCE,
  PAYTABLE_ID,
  PAYTABLE_V2,
  anyPairFromShoe,
  bustItFromShoe,
  freshShoeGapNotes,
  hot3FromShoe,
  sideBetsFromShoe,
  twentyOnePlusThreeFromShoe,
} from "./side-bets";
import {
  cardsDealtPhysical,
  createShoe,
  dealCard,
  holeReserved,
  newShoe,
  nextRound,
  retargetEvent,
  undo,
} from "./session";
import { decisionAtPrefix, monteCarloPerfectPairRate, shuffleShoe } from "./simulate";
import { runningCount } from "./counting";

describe("infinite hand values", () => {
  it("scores soft, hard, and natural blackjack", () => {
    const soft = valueCards([0, 5]);
    expect(soft.total).toBe(17);
    expect(soft.soft).toBe(true);
    expect(soft.hardTotal).toBeNull();
    const hard = valueCards([4, 5]);
    expect(hard.total).toBe(11);
    expect(hard.hardTotal).toBe(11);
    const bj = valueCards([0, 9]);
    expect(bj.blackjack).toBe(true);
    expect(bj.bust).toBe(false);
  });

  it("keeps dealer 22 distinct from a bust", () => {
    const counts = freshBuckets(1);
    counts.fill(0);
    counts[5] = 2;
    const dist = dealerDistribution(9, counts, createDealerMemos(), false);
    expect(dist.t22).toBeCloseTo(1, 8);
    expect(dist.bust).toBe(0);
    expect(handProfit(
      { total: 20, bust: false, blackjack: false, charlie: false, cash: true, mode: "plain" },
      { type: "22" }
    )).toBe(0);
    expect(handProfit(
      { total: 20, bust: true, blackjack: false, charlie: false, cash: true, mode: "plain" },
      { type: "22" }
    )).toBe(-1);
    expect(handProfit(
      { total: 21, bust: false, blackjack: true, charlie: false, cash: true, mode: "plain" },
      { type: "22" }
    )).toBe(1.5);
  });

  it("pays Charlie even money and pushes it against dealer 22", () => {
    const charlie = { total: 19, bust: false, blackjack: false, charlie: true, cash: true, mode: "plain" as const };
    expect(handProfit(charlie, { type: "total", total: 20 })).toBe(1);
    expect(handProfit(charlie, { type: "bust" })).toBe(1);
    expect(handProfit(charlie, { type: "22" })).toBe(0);
    expect(valueCards([1, 1, 1, 1, 1, 1]).charlie).toBe(true);
    expect(valueCards([9, 9, 9]).charlie).toBe(false);
  });

  it("separates casino stake from player cash", () => {
    const win = { total: 20, bust: false, blackjack: false, charlie: false, cash: true, mode: "free-double" as const };
    const lose = { ...win, total: 12 };
    expect(handProfit(win, { type: "total", total: 17 })).toBe(2);
    expect(handProfit(lose, { type: "total", total: 17 })).toBe(-1);
    expect(handProfit({ ...lose, mode: "regular-double" }, { type: "total", total: 17 })).toBe(-2);
    expect(handProfit(
      { total: 15, bust: false, blackjack: false, charlie: false, cash: false, mode: "plain" },
      { type: "total", total: 20 }
    )).toBe(0);
    expect(handProfit(
      { total: 20, bust: false, blackjack: false, charlie: false, cash: false, mode: "plain" },
      { type: "total", total: 17 }
    )).toBe(1);
  });
});

describe("paytable v2", () => {
  it("uses the screenshot payouts and not the retired v1 numbers", () => {
    expect(PAYTABLE_ID).toBe("EVOLUTION_INFINITE_FREE_BET_PAYTABLE_V2");
    expect(PAYTABLE_V2.anyPair).toEqual({ perfect: 25, colored: 12, mixed: 6 });
    expect(PAYTABLE_V2.twentyOnePlusThree.threeOfAKind).toBe(25);
    expect(PAYTABLE_V2.twentyOnePlusThree.threeOfAKind).not.toBe(30);
    expect(PAYTABLE_V2.bustIt[5]).toBe(9);
    expect(PAYTABLE_V2.bustIt[5]).not.toBe(7);
    expect(PAYTABLE_V2.hot3).toEqual({
      sevenSevenSeven: 100,
      suited21: 20,
      unsuited21: 4,
      total20: 2,
      total19: 1,
    });
    expect(JSON.stringify(PAYTABLE_V2)).not.toContain("\"mixed\":8");
  });

  it("makes side-bet categories sum to 1 on a fresh shoe", () => {
    const shoe = freshShoe52(8);
    for (const bet of [anyPairFromShoe(shoe), twentyOnePlusThreeFromShoe(shoe), hot3FromShoe(shoe)]) {
      const mass = Object.values(bet.probabilities).reduce((s, p) => s + p, 0);
      expect(mass).toBeCloseTo(1, 6);
    }
  });

  it("recomputes pair probabilities after a removal instead of scaling the help RTP", () => {
    const full = freshShoe52(8);
    const removed = full.slice();
    removed[0] = (removed[0] ?? 0) - 8;
    const before = anyPairFromShoe(full);
    const after = anyPairFromShoe(removed);
    expect(after.probabilities.perfect).not.toBeCloseTo(before.probabilities.perfect ?? 0, 8);
    expect(after.ev).not.toBeCloseTo(before.ev, 6);
    expect(before.computedRtp).toBeCloseTo(1 + before.ev, 8);
    expect(before.computedRtp).not.toBe(FRESH_SHOE_HELP_REFERENCE.perfectPairs);
  });
});

describe("live composition, not a count-scaled house edge", () => {
  it("changes free-bet chances when the composition changes at the same Hi-Lo running count", () => {
    const fiveAndTen = freshBuckets(8);
    fiveAndTen[4] = (fiveAndTen[4] ?? 0) - 1;
    fiveAndTen[9] = (fiveAndTen[9] ?? 0) - 1;
    const twoAndThree = freshBuckets(8);
    twoAndThree[1] = (twoAndThree[1] ?? 0) - 1;
    twoAndThree[2] = (twoAndThree[2] ?? 0) - 1;
    expect(runningCount(["5", "10"], "hi_lo")).toBe(0);
    expect(runningCount(["2", "3"], "hi_lo")).toBe(2);
    const sameCountA = fiveAndTen;
    const sameCountB = freshBuckets(8);
    sameCountB[1] = (sameCountB[1] ?? 0) - 1;
    sameCountB[9] = (sameCountB[9] ?? 0) - 1;
    expect(runningCount(["5", "10"], "hi_lo")).toBe(runningCount(["2", "10"], "hi_lo"));
    const a = freeBetProbabilities(sameCountA);
    const b = freeBetProbabilities(sameCountB);
    expect(a.pEither).toBeCloseTo(a.pFreeDouble + a.pFreeSplit - a.pBoth, 10);
    expect(a.pNeither).toBeCloseTo(1 - a.pEither, 10);
    expect(a.pFreeDouble).not.toBeCloseTo(b.pFreeDouble, 8);
    expect(playerEdgeFromEv(-0.2)).toBe(-0.2);
    expect(playerEdgeFromEv(-0.2)).not.toBeCloseTo(FRESH_SHOE_HELP_REFERENCE.blackjack - 1, 4);
  });

  it("prices insurance from the remaining tens", () => {
    const counts = freshBuckets(8);
    counts[0] = (counts[0] ?? 0) - 1;
    const quote = insuranceEv(counts);
    expect(quote.probabilityTen).toBeCloseTo(128 / 415, 8);
    expect(quote.evPerUnit).toBeCloseTo(3 * (128 / 415) - 1, 8);
    expect(quote.recommendation).toBe("SKIP");
  });
});

describe("kelly", () => {
  it("stakes 0 when EV is not positive", () => {
    expect(fullKellyFraction([{ profit: -1, p: 0.6 }, { profit: 1, p: 0.4 }])).toBe(0);
    const stake = kellyStake({
      bankroll: 1000,
      userFraction: 0.5,
      dist: [{ profit: -0.02, p: 1 }],
    });
    expect(stake.stake).toBe(0);
    expect(stake.experimentalStake).toBeNull();
  });
});

describe("shoe session", () => {
  it("keeps NEW SHOE distinct from NEXT ROUND and blocks a round after the cut", () => {
    let session = createShoe({ mode: "CUT_AFTER_CARDS_DEALT", cardsDealt: 3 });
    session = dealCard(session, "A", "spades").session;
    session = dealCard(session, "10", "hearts").session;
    session = dealCard(session, "5", "clubs").session;
    expect(cardsDealtPhysical(session)).toBeGreaterThanOrEqual(3);
    const blocked = nextRound({ ...session, phase: "complete" });
    expect(blocked.error).toBeTruthy();
    const reset = newShoe(session);
    expect(reset.events).toHaveLength(0);
    expect(reset.round).toBe(1);
    expect(reset.id).not.toBe(session.id);
  });

  it("removes shared cards once and does not remove a revealed hole twice", () => {
    let session = createShoe();
    session = dealCard(session, "A", "spades").session;
    session = dealCard(session, "K", "hearts").session;
    session = dealCard(session, "9", "diamonds").session;
    expect(holeReserved(session)).toBe(true);
    const reserved = cardsDealtPhysical(session);
    expect(reserved).toBe(session.events.length + 1);
    session = dealCard(session, "5", "clubs", "dealer_hole").session;
    expect(holeReserved(session)).toBe(false);
    expect(cardsDealtPhysical(session)).toBe(reserved);
    const shoe = session.events.filter((e) => e.rank === "A" && e.suit === "spades");
    expect(shoe).toHaveLength(1);
  });

  it("rejects a ninth copy and retargets without a second removal", () => {
    let session = createShoe({ mode: "CUT_AFTER_CARDS_DEALT", cardsDealt: 400 }, 1);
    for (let i = 0; i < 4; i += 1) {
      session = dealCard(session, "A", "spades", "other").session;
    }
    const rejected = dealCard(session, "A", "spades", "other");
    expect(rejected.error).toBeTruthy();
    const id = session.events[0]!.id;
    const moved = retargetEvent(session, id, "my_hand");
    expect(moved.events).toHaveLength(session.events.length);
    expect(moved.events[0]!.target).toBe("my_hand");
    const undone = undo(moved);
    expect(undone.events).toHaveLength(moved.events.length - 1);
  });
});

describe("future cards stay hidden", () => {
  it("does not change the recommendation when only the undealt order changes", () => {
    const order = shuffleShoe(11);
    const swapped = order.slice(0, 3).concat(order.slice(3).reverse());
    expect(decisionAtPrefix(order, 3)).toBe(decisionAtPrefix(swapped, 3));
  });
});

describe("actions on a short shoe", () => {
  it("compares free double and free split without adding them", () => {
    const counts = new Uint8Array(10);
    counts[4] = 2;
    counts[5] = 3;
    counts[9] = 4;
    counts[1] = 2;
    const actions = evaluateActions(counts, [4, 4], 5);
    const freeDouble = actions.actions.find((a) => a.action === "DOUBLE_FREE");
    const regular = actions.actions.find((a) => a.action === "DOUBLE_REGULAR");
    const freeSplit = actions.actions.find((a) => a.action === "SPLIT_FREE");
    expect(freeDouble).toBeTruthy();
    expect(freeSplit).toBeTruthy();
    expect(regular).toBeTruthy();
    expect(freeDouble!.ev).toBeGreaterThanOrEqual(regular!.ev - 1e-9);
    const bestOfFree = Math.max(freeDouble!.ev, freeSplit!.ev);
    expect(actions.moments.ev).toBeCloseTo(
      Math.max(...actions.actions.map((a) => a.ev)),
      8
    );
    expect(freeDouble!.ev + freeSplit!.ev).not.toBeCloseTo(bestOfFree, 4);
  });

  it("solves a hard 11 from the remaining shoe", () => {
    const counts = freshBuckets(1);
    counts[4] = (counts[4] ?? 0) - 1;
    counts[5] = (counts[5] ?? 0) - 1;
    counts[6] = (counts[6] ?? 0) - 1;
    const actions = evaluateActions(counts, [4, 5], 6);
    expect(actions.best === "DOUBLE_FREE" || actions.best === "HIT" || actions.best === "STAND").toBe(true);
    expect(actions.quality).toBe("EXACT");
  });
});

describe("fresh-shoe reference is not forced to match", () => {
  it("explains the gap for the screenshot paytable", () => {
    const notes = freshShoeGapNotes();
    expect(notes.explanation).toContain("not this shoe");
    expect(notes.explanation).toContain("9:1");
    expect(notes.pairs).toBeGreaterThan(0.5);
    expect(notes.pairs).toBeLessThan(1.2);
    expect(notes.bustItIf22Pays).not.toBe(FRESH_SHOE_HELP_REFERENCE.bustIt);
  }, 60_000);
});

describe("next round consumes the composition", () => {
  it("changes EV when the shoe changes and does not echo the help edge", () => {
    const base = new Uint8Array(10);
    base[9] = 4;
    base[4] = 2;
    base[5] = 2;
    const first = nextRoundMainEv(base.slice());
    const shifted = base.slice();
    shifted[4] = (shifted[4] ?? 0) - 1;
    shifted[9] = (shifted[9] ?? 0) + 1;
    const second = nextRoundMainEv(shifted);
    expect(first.quality).toBe("EXACT");
    expect(second.quality).toBe("EXACT");
    expect(first.ev).not.toBeCloseTo(second.ev, 5);
    expect(playerEdgeFromEv(first.ev)).toBe(first.ev);
    expect(first.ev).not.toBeCloseTo(FRESH_SHOE_HELP_REFERENCE.blackjack - 1, 3);
  });
});

describe("long shoe edge follows the remaining composition", () => {
  it("matches the exact best action and moves when tens replace small cards", () => {
    const counts = freshBuckets(8);
    counts[9] = (counts[9] ?? 0) - 1;
    counts[5] = (counts[5] ?? 0) - 1;
    counts[6] = (counts[6] ?? 0) - 1;
    const exact = evaluateActions(counts.slice(), [9, 5], 6);
    const approx = compositionHandEv(counts.slice(), [9, 5], 6);
    expect(approx.action).toBe(exact.best);
    expect(approx.moments.ev).toBeCloseTo(exact.moments.ev, 2);

    const fresh = compositionNextRound(freshBuckets(8));
    const tenRich = freshBuckets(8);
    tenRich[1] = (tenRich[1] ?? 0) - 20;
    tenRich[9] = (tenRich[9] ?? 0) + 20;
    const richer = compositionNextRound(tenRich);
    expect(fresh.quality).toBe("APPROXIMATE");
    expect(richer.ev).toBeGreaterThan(fresh.ev);
    expect(fresh.ev).not.toBeCloseTo(FRESH_SHOE_HELP_REFERENCE.blackjack - 1, 4);
    expect(playerEdgeFromEv(fresh.ev)).toBe(fresh.ev);
  });
});

describe("monte carlo is a separate shuffle", () => {
  it("estimates perfect pairs without reading the closed form", () => {
    const analytical = anyPairFromShoe(freshShoe52(8)).probabilities.perfect ?? 0;
    const sampled = monteCarloPerfectPairRate(3, 4000);
    expect(Math.abs(sampled - analytical)).toBeLessThan(0.01);
  });
});

describe("opening free double", () => {
  it("rejects an ace, a ten, and a three-card 11", () => {
    for (let card = 0; card < 10; card += 1) {
      expect(isOpeningFreeDouble([0, card])).toBe(false);
      expect(isOpeningFreeDouble([9, card])).toBe(false);
    }
    expect(valueCards([1, 2, 5]).hardTotal).toBe(11);
    expect(isOpeningFreeDouble([1, 2, 5])).toBe(false);
  });

  it("accepts 2-7, 2-8, 2-9 and fives, and rejects 2-6", () => {
    expect(isOpeningFreeDouble([1, 6])).toBe(true);
    expect(isOpeningFreeDouble([1, 7])).toBe(true);
    expect(isOpeningFreeDouble([1, 8])).toBe(true);
    expect(isOpeningFreeDouble([1, 5])).toBe(false);
    expect(isOpeningFreeDouble([4, 4])).toBe(true);
  });

  it("ignores suit when the rank counts match", () => {
    const hearts = freshShoe52(8);
    const spades = freshShoe52(8);
    hearts[4 * 4 + 0] = (hearts[4 * 4 + 0] ?? 0) - 1;
    spades[4 * 4 + 3] = (spades[4 * 4 + 3] ?? 0) - 1;
    const removedHeart = freeBetProbabilities(bucketsFrom52(hearts)).pFreeDouble;
    const removedSpade = freeBetProbabilities(bucketsFrom52(spades)).pFreeDouble;
    expect(removedHeart).toBeCloseTo(removedSpade, 12);
    expect(removedHeart).not.toBeCloseTo(freeBetProbabilities(bucketsFrom52(freshShoe52(8))).pFreeDouble, 8);
  });
});

describe("fresh main RTP stays unresolved", () => {
  it("does not fit 98.45% and does not turn a positive edge into PLAY", () => {
    const base = compositionNextRound(freshBuckets(8));
    const limited = compositionNextRound(freshBuckets(8), {
      ...PRODUCT_ASSUMPTIONS,
      doubleAfterSplit: false,
      maxHands: 2,
    });
    expect(1 + base.ev).toBeCloseTo(0.99347, 4);
    expect(1 + base.ev).not.toBeCloseTo(FRESH_SHOE_HELP_REFERENCE.blackjack, 4);
    expect(1 + limited.ev).toBeCloseTo(0.983751, 4);
    expect(Math.abs(1 + limited.ev - FRESH_SHOE_HELP_REFERENCE.blackjack)).toBeLessThan(
      Math.abs(1 + base.ev - FRESH_SHOE_HELP_REFERENCE.blackjack)
    );

    const shoe = freshShoe52(8);
    for (let i = 0; i < 20; i += 1) {
      shoe[1 * 4 + (i % 4)] = (shoe[1 * 4 + (i % 4)] ?? 0) - 1;
      shoe[9 * 4 + (i % 4)] = (shoe[9 * 4 + (i % 4)] ?? 0) + 1;
    }
    const live = analyzeRemaining({
      shoe52: shoe,
      physicalRemaining: 416,
      inventoryValid: true,
      settings: PRESETS.POSITIVE_EV_ONLY,
      main: true,
    });
    expect(live.playerEdge).toBeGreaterThan(0);
    expect(live.mainVerification).toBe(MAIN_EV_VERIFICATION);
    expect(live.recommendation).toBe("NOT_DEFINITIVE");
    expect(live.kelly.stake).toBe(0);

    const bust = bustItFromShoe(freshShoe52(8));
    expect(bust.verification).toBe("UNVERIFIED");
    expect(bust.decision).not.toBe("BET");
    expect(bust.alternateEv).not.toBe(bust.ev);
  }, 30_000);
});

void sideBetsFromShoe;
