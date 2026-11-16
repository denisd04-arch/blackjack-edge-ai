import { describe, expect, it } from "vitest";
import { kellyOnNet } from "./bankroll";
import { simulateMainBetShoe } from "./backtest";
import { rulesFromProfile } from "./blackjack-rules";
import { adviseParticipation } from "./participation";
import { analyzeDecision } from "./decision-analysis";
import type { DecisionAnalysisResult } from "./decision-analysis";
import { dealerDistributionWithUpcard } from "./dealer-outcomes";
import {
  analysisInventory,
  dealerBlackjackProbability,
  settleUnitProfit,
} from "./ev-core";
import { forwardTestProjection } from "./forward-test";
import { inventoryMatchesDealt } from "./inventory-integrity";
import {
  EVOLUTION_FREE_BET,
  EVOLUTION_INFINITE_FREE_BET,
  STANDARD_H17_8DECK_BASELINE,
} from "./profiles";
import { createFullShoeInventory } from "./shoe";
import { DigitalTableSession } from "./table-session";

const infiniteRules = rulesFromProfile(EVOLUTION_INFINITE_FREE_BET)!;

describe("verified settlement", () => {
  const player20 = { total: 20, soft: false, bust: false, blackjack: false };
  const playerBust = { total: 22, soft: false, bust: true, blackjack: false };
  const playerBj = { total: 21, soft: true, bust: false, blackjack: true };
  const charlie = { total: 15, soft: false, bust: false, blackjack: false };

  it("pushes dealer 22 except a bust, and pays blackjack 3:2", () => {
    expect(
      settleUnitProfit(player20, 2, "s:22:0", infiniteRules, false)
    ).toBe(0);
    expect(
      settleUnitProfit(playerBust, 3, "s:22:0", infiniteRules, false)
    ).toBe(-1);
    expect(
      settleUnitProfit(playerBj, 2, "s:22:0", infiniteRules, false)
    ).toBe(1.5);
    expect(settleUnitProfit(playerBj, 2, "bj", infiniteRules, false)).toBe(0);
    expect(settleUnitProfit(player20, 2, "bj", infiniteRules, false)).toBe(-1);
  });

  it("pays charlie even money and still pushes 22", () => {
    expect(settleUnitProfit(charlie, 6, "s:20:0", infiniteRules, false)).toBe(1);
    expect(settleUnitProfit(charlie, 6, "s:22:0", infiniteRules, false)).toBe(0);
    expect(settleUnitProfit(charlie, 6, "bust", infiniteRules, false)).toBe(1);
    expect(settleUnitProfit(charlie, 6, "bj", infiniteRules, false)).toBe(-1);
  });

  it("does not pay split ace-ten as blackjack", () => {
    expect(settleUnitProfit(playerBj, 2, "s:20:0", infiniteRules, true)).toBe(1);
    expect(settleUnitProfit(playerBj, 2, "bj", infiniteRules, true)).toBe(-1);
  });

  it("computes insurance odds from the shoe, payoff 2:1", () => {
    const unseen = analysisInventory(createFullShoeInventory(1), ["5", "6"], "A")!;
    const p = dealerBlackjackProbability("A", unseen);
    expect(p).toBeCloseTo(16 / 49, 8);
    expect(3 * p - 1).toBeLessThan(0);
  });

  it("keeps dealer 22 out of the bust bucket", () => {
    const shoe = createFullShoeInventory(2);
    const unseen = analysisInventory(shoe, ["10", "6"], "6")!;
    const { dealer, push22Pct } = dealerDistributionWithUpcard(
      "6",
      unseen,
      infiniteRules,
      new Map()
    );
    expect(push22Pct).toBeGreaterThan(0);
    expect(dealer.get("bj") ?? 0).toBe(0);
    let stand22 = 0;
    for (const [key, prob] of dealer) {
      if (key.startsWith("s:22:")) stand22 += prob;
    }
    expect(stand22).toBeCloseTo(push22Pct, 8);
  });
});

describe("free-bet economics on a short shoe", () => {
  it("risks one unit on a free double and two on a paid double", () => {
    const shoe = createFullShoeInventory(1);
    const free = analyzeDecision({
      profile: EVOLUTION_INFINITE_FREE_BET,
      playerCards: ["9", "2"],
      dealerUpcard: "6",
      shoeRemainingByRank: shoe,
    });
    const paid = analyzeDecision({
      profile: EVOLUTION_INFINITE_FREE_BET,
      playerCards: ["A", "7"],
      dealerUpcard: "6",
      shoeRemainingByRank: shoe,
    });
    const freeDouble = free.actions.find((a) => a.action === "double");
    const paidDouble = paid.actions.find((a) => a.action === "double");
    expect(free.definitive).toBe(true);
    expect(freeDouble?.available).toBe(true);
    expect(freeDouble?.maxLoss).toBe(1);
    expect(paidDouble?.available).toBe(true);
    expect(paidDouble?.maxLoss).toBe(2);
  });

  it("risks one unit on a free split and two on tens", () => {
    const shoe = createFullShoeInventory(1);
    const free = analyzeDecision({
      profile: EVOLUTION_INFINITE_FREE_BET,
      playerCards: ["8", "8"],
      dealerUpcard: "6",
      shoeRemainingByRank: shoe,
    });
    const paid = analyzeDecision({
      profile: EVOLUTION_INFINITE_FREE_BET,
      playerCards: ["10", "K"],
      dealerUpcard: "6",
      shoeRemainingByRank: shoe,
    });
    expect(free.actions.find((a) => a.action === "split")?.maxLoss).toBe(1);
    expect(paid.actions.find((a) => a.action === "split")?.maxLoss).toBe(2);
    expect(paid.recommended).not.toBe("split");
  }, 30000);
});

describe("honesty gates", () => {
  it("refuses a shoe simulation on the incomplete seven-seat profile", () => {
    const sim = simulateMainBetShoe({
      profile: EVOLUTION_FREE_BET,
      hands: 1,
      decks: 1,
      seed: 1,
    });
    expect(sim.claimsProfit).toBe(false);
    expect(sim.definitive).toBe(false);
    expect(sim.handsPlayed).toBe(0);
    expect(sim.meanProfitPerHand).toBeNull();
  });

  it("labels a complete-profile simulation as a model, not an edge", () => {
    const sim = simulateMainBetShoe({
      profile: EVOLUTION_INFINITE_FREE_BET,
      hands: 1,
      decks: 1,
      seed: 7,
    });
    expect(sim.claimsProfit).toBe(false);
    expect(sim.definitive).toBe(false);
    expect(sim.messageDe).toMatch(/kein belegter Hausvorteil/i);
    expect(sim.handsPlayed).toBe(1);
  });

  it("does not project a dollar edge forward", () => {
    const session = new DigitalTableSession({ decks: 8 });
    const result = forwardTestProjection({
      counts: session.snapshot().counts,
      participationHandsRemaining: 4,
    });
    expect(result.definitive).toBe(false);
    expect(result.claimsProfit).toBe(false);
    expect(result.nonClaimsDe.join(" ")).toMatch(/RTP/);
  });

  it("caps Kelly by the amount that can actually be lost", () => {
    const open = kellyOnNet({
      ev: 0.5,
      variance: 0.1,
      maxLoss: 1,
      definitive: false,
    });
    expect(open.definitive).toBe(false);
    expect(open.fraction).toBe(0);
    const sized = kellyOnNet({
      ev: 0.2,
      variance: 0.05,
      maxLoss: 2,
      definitive: true,
    });
    expect(sized.fraction).toBeLessThanOrEqual(0.5);
    expect(sized.fraction).toBeGreaterThan(0);
  });

  it("matches dealt cards to the remaining shoe", () => {
    const session = new DigitalTableSession({ decks: 1 });
    session.startRound();
    session.dealCard("A", "spades", "player");
    session.dealCard("9", "hearts", "dealer");
    const snap = session.snapshot();
    const ok = inventoryMatchesDealt({
      decks: 1,
      dealtRanks: snap.dealt.map((c) => c.rank),
      remainingByRank: snap.shoe.remainingByRank,
    });
    expect(ok.ok).toBe(true);
    const broken = inventoryMatchesDealt({
      decks: 1,
      dealtRanks: ["A", "A"],
      remainingByRank: snap.shoe.remainingByRank,
    });
    expect(broken.ok).toBe(false);
  });
});

describe("participation", () => {
  it("sits out when conditional EV is not positive", () => {
    const analysis = {
      definitive: true,
      messageDe: "x",
      rulesLabelDe: "t",
      recommended: "stand",
      dealerBustPct: 0,
      dealer22PushPct: 0,
      insurance: {
        offered: false,
        definitive: false,
        dealerBlackjackPct: null,
        evPerInsuranceUnit: null,
        messageDe: "",
      },
      actions: [
        {
          action: "stand",
          labelDe: "Stehen",
          ev: -0.2,
          variance: 1,
          winPct: 40,
          pushPct: 0,
          lossPct: 60,
          maxLoss: 1,
          available: true,
        },
      ],
    } as DecisionAnalysisResult;
    const advice = adviseParticipation(analysis);
    expect(advice.definitive).toBe(true);
    expect(advice.participate).toBe(false);
    expect(advice.messageDe).toMatch(/kein Hinweis/i);
  });

  it("does not advise on an open profile hand", () => {
    const res = analyzeDecision({
      profile: EVOLUTION_FREE_BET,
      playerCards: ["9", "9"],
      dealerUpcard: "6",
      shoeRemainingByRank: createFullShoeInventory(1),
    });
    expect(adviseParticipation(res).participate).toBeNull();
  });
});

describe("baseline still doubles 11 vs 6", () => {
  it("keeps the reference action", () => {
    const res = analyzeDecision({
      profile: STANDARD_H17_8DECK_BASELINE,
      playerCards: ["9", "2"],
      dealerUpcard: "6",
      shoeRemainingByRank: createFullShoeInventory(1),
    });
    expect(res.recommended).toBe("double");
    expect(res.actions.find((a) => a.action === "double")?.maxLoss).toBe(2);
  });
});
