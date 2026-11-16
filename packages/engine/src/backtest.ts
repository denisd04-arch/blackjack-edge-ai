import { CARD_RANKS, type CardRank } from "./cards";
import type { ResolvedBlackjackRules } from "./blackjack-rules";
import { rulesFromProfile } from "./blackjack-rules";
import type { DecisionLogEntry } from "./decision-log";
import { isDeviation } from "./decision-log";
import { analyzeDecision, recommendContinuation } from "./decision-analysis";
import type { PlayerAction } from "./ev-core";
import { settleUnitProfit } from "./ev-core";
import {
  freeDoubleEligible,
  freeSplitEligible,
  mapFreeDoubleProfit,
  mapFreeSplitSideProfit,
} from "./evolution/free-bet-rules";
import { evaluateHand, holeMakesBlackjack, isEqualValuePair } from "./hand";
import type { GameProfile } from "./types";
import { createFullShoeInventory, type RankInventory } from "./shoe";

export interface BacktestResult {
  hands: number;
  deviations: number;
  avgRecommendedEv: number | null;
  definitive: boolean;
  messageDe: string;
}

export function backtestFromDecisionLog(
  entries: readonly DecisionLogEntry[]
): BacktestResult {
  const definitive = entries.some((e) => e.definitive);
  if (entries.length === 0) {
    return {
      hands: 0,
      deviations: 0,
      avgRecommendedEv: null,
      definitive: false,
      messageDe: "Keine Entscheidungspunkte — zuerst am Tisch spielen.",
    };
  }
  const deviations = entries.filter(isDeviation).length;
  const evs = entries
    .map((e) => e.recommendedEv)
    .filter((v): v is number => v != null);
  const avg =
    evs.length === 0
      ? null
      : Math.round((evs.reduce((a, b) => a + b, 0) / evs.length) * 10000) /
        10000;
  return {
    hands: entries.length,
    deviations,
    avgRecommendedEv: avg,
    definitive,
    messageDe:
      "Replay aus Session-Log (keine synthetischen Gewinne — nur Empfehlungs-EV & Abweichungen).",
  };
}

export interface ScriptedHand {
  player: CardRank[];
  dealerUp: CardRank;
}

export function scriptedHandCount(hands: readonly ScriptedHand[]): number {
  return hands.length;
}

export interface ShoeSimulationResult {
  handsPlayed: number;
  totalProfit: number | null;
  meanProfitPerHand: number | null;
  seed: number;
  /** Sum of the EV locked when the hand was dealt, before the hole was used. */
  expectedProfit: number | null;
  /** Sum of settled player profit. Free stake is not a loss. */
  realizedProfit: number | null;
  /** A finite model run is never a verified edge. */
  claimsProfit: false;
  /** There is no profitable label on a short run. */
  profitableLabel: null;
  definitive: false;
  messageDe: string;
}

/**
 * Deals a shuffled shoe and settles the main bet with the same rules as the EV engine.
 * Insurance is not taken. The mean is a model statistic, not a house edge or a profit claim.
 * Incomplete profiles (unverified split rules) are refused.
 */
export function simulateMainBetShoe(input: {
  profile: GameProfile;
  hands: number;
  decks?: number;
  seed: number;
}): ShoeSimulationResult {
  const refused = unfinished(
    input.seed,
    "Keine Schuhsimulation — das Profil ist unvollständig oder die Split-Folgeregeln sind nicht belegt. Kein Hausvorteil und kein Profit."
  );
  const rules = rulesFromProfile(input.profile);
  if (!rules || input.profile.incomplete || !rules.allowSplit) return refused;

  const decks = input.decks ?? rulesFromDecks(input.profile);
  const rest = buildShuffledShoe(decks, input.seed);
  let totalProfit = 0;
  let expectedProfit = 0;
  let played = 0;
  const target = Math.max(0, Math.floor(input.hands));

  while (played < target && rest.length >= 8) {
    const p1 = rest.pop();
    const p2 = rest.pop();
    const up = rest.pop();
    const hole = rest.pop();
    if (!p1 || !p2 || !up || !hole) break;

    const rootCards: CardRank[] = [p1, p2];
    const opening = analyzeDecision({
      profile: input.profile,
      playerCards: rootCards,
      dealerUpcard: up,
      shoeRemainingByRank: countsOf([...rest, hole, ...rootCards, up]),
    });
    const expectedRow = opening.actions.find(
      (row) => row.action === opening.recommended && row.available
    );
    if (!opening.definitive || !opening.recommended || !expectedRow) {
      return unfinished(
        input.seed,
        "Simulation abgebrochen — eine Hand hatte keinen definitiven EV. Teilergebnis ist kein Vorteil."
      );
    }
    expectedProfit += expectedRow.ev;

    if (holeMakesBlackjack(up, hole)) {
      const natural = evaluateHand(rootCards).blackjack;
      totalProfit += natural ? 0 : -1;
      played += 1;
      continue;
    }

    if (opening.recommended === "split" && isEqualValuePair(rootCards)) {
      const c1 = rest.pop();
      const c2 = rest.pop();
      if (!c1 || !c2) break;
      const left = playToEnd(input.profile, [p1, c1], up, hole, rest, true);
      const right = playToEnd(input.profile, [p2, c2], up, hole, rest, true);
      if (!left || !right) {
        return unfinished(
          input.seed,
          "Simulation abgebrochen — Splithand ohne definitive Fortsetzung. Kein Vorteil."
        );
      }
      const terminal = dealerTerminal(up, hole, rest, rules);
      let profitLeft = settlePlayed(left, terminal, rules, true);
      let profitRight = settlePlayed(right, terminal, rules, true);
      const free = freeSplitEligible(rootCards, rules.freeSplitOn);
      totalProfit += free
        ? profitLeft + mapFreeSplitSideProfit(profitRight)
        : profitLeft + profitRight;
      played += 1;
      continue;
    }

    const finished = playToEnd(
      input.profile,
      rootCards,
      up,
      hole,
      rest,
      false,
      opening.recommended
    );
    if (!finished) {
      return unfinished(
        input.seed,
        "Simulation abgebrochen — Fortsetzung ohne definitiven EV. Kein Vorteil."
      );
    }
    if (finished.busted) {
      totalProfit += finished.doubled && !freeDoubleEligible(rootCards, rules.freeDoubleOn)
        ? -2
        : -1;
      played += 1;
      continue;
    }
    const terminal = dealerTerminal(up, hole, rest, rules);
    totalProfit += settlePlayed(finished, terminal, rules, false, rootCards);
    played += 1;
  }

  const mean =
    played === 0 ? null : Math.round((totalProfit / played) * 10000) / 10000;
  const realized = Math.round(totalProfit * 10000) / 10000;
  const expected = Math.round(expectedProfit * 10000) / 10000;
  return {
    handsPlayed: played,
    totalProfit: realized,
    meanProfitPerHand: mean,
    seed: input.seed,
    expectedProfit: expected,
    realizedProfit: realized,
    claimsProfit: false,
    profitableLabel: null,
    definitive: false,
    messageDe: `Seed ${input.seed}. Erwartet ${expected}, realisiert ${realized}. Kein belegter Hausvorteil. Kein Profit-Label.`,
  };
}

function unfinished(seed: number, messageDe: string): ShoeSimulationResult {
  return {
    handsPlayed: 0,
    totalProfit: null,
    meanProfitPerHand: null,
    seed,
    expectedProfit: null,
    realizedProfit: null,
    claimsProfit: false,
    profitableLabel: null,
    definitive: false,
    messageDe,
  };
}

function rulesFromDecks(profile: GameProfile): number {
  return profile.rules.decks ?? 8;
}

function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function buildShuffledShoe(decks: number, seed: number): CardRank[] {
  const shoe: CardRank[] = [];
  for (let d = 0; d < decks; d += 1) {
    for (const rank of CARD_RANKS) {
      for (let s = 0; s < 4; s += 1) shoe.push(rank);
    }
  }
  const rng = mulberry32(seed);
  for (let i = shoe.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const swap = shoe[i]!;
    shoe[i] = shoe[j]!;
    shoe[j] = swap;
  }
  return shoe;
}

function countsOf(cards: readonly CardRank[]): RankInventory {
  const inv = createFullShoeInventory(0);
  for (const rank of CARD_RANKS) inv[rank] = 0;
  for (const card of cards) inv[card] += 1;
  return inv;
}

interface FinishedHand {
  cards: CardRank[];
  doubled: boolean;
  busted: boolean;
}

function playToEnd(
  profile: GameProfile,
  start: CardRank[],
  up: CardRank,
  hole: CardRank,
  rest: CardRank[],
  fromSplit: boolean,
  firstAction?: PlayerAction
): FinishedHand | null {
  const cards = [...start];
  let doubled = false;
  let pending = firstAction;
  while (true) {
    const totals = evaluateHand(cards);
    if (totals.bust) return { cards, doubled, busted: true };
    if (fromSplit && cards.length === 2 && cards[0] === "A") {
      return { cards, doubled, busted: false };
    }
    if (cards.length >= 6 || totals.total >= 21) {
      return { cards, doubled, busted: false };
    }
    const action =
      pending ??
      recommendContinuation({
        profile,
        playerCards: cards,
        dealerUpcard: up,
        shoeIncludingVisible: countsOf([...rest, hole, ...cards, up]),
        fromSplit,
      }).action;
    pending = undefined;
    if (!action) return null;
    if (action === "stand" || action === "split") {
      return { cards, doubled, busted: false };
    }
    if (action === "double" && cards.length === 2) {
      const drawn = rest.pop();
      if (!drawn) return { cards, doubled, busted: false };
      cards.push(drawn);
      doubled = true;
      return { cards, doubled, busted: evaluateHand(cards).bust };
    }
    if (action === "hit") {
      const drawn = rest.pop();
      if (!drawn) return { cards, doubled, busted: false };
      cards.push(drawn);
      continue;
    }
    return { cards, doubled, busted: false };
  }
}

function dealerTerminal(
  up: CardRank,
  hole: CardRank,
  rest: CardRank[],
  rules: ResolvedBlackjackRules
): string {
  const cards: CardRank[] = [up, hole];
  let totals = evaluateHand(cards);
  if (cards.length === 2 && totals.blackjack) return "bj";
  while (!totals.bust && wantsDealerCard(totals, rules)) {
    const drawn = rest.pop();
    if (!drawn) break;
    cards.push(drawn);
    totals = evaluateHand(cards);
  }
  if (totals.bust) {
    if (rules.pushOn22 && totals.total === 22) return "s:22:0";
    return "bust";
  }
  return `s:${totals.total}:${totals.soft ? 1 : 0}`;
}

function wantsDealerCard(
  totals: ReturnType<typeof evaluateHand>,
  rules: ResolvedBlackjackRules
): boolean {
  if (totals.bust) return false;
  if (totals.total < 17) return true;
  return totals.total === 17 && totals.soft && rules.dealerHitsSoft17;
}

function settlePlayed(
  hand: FinishedHand,
  terminal: string,
  rules: ResolvedBlackjackRules,
  fromSplit: boolean,
  originalTwo?: readonly CardRank[]
): number {
  const unit = settleUnitProfit(
    evaluateHand(hand.cards),
    hand.cards.length,
    terminal,
    rules,
    fromSplit
  );
  if (!hand.doubled) return unit;
  const origin = originalTwo ?? hand.cards.slice(0, 2);
  return freeDoubleEligible(origin, rules.freeDoubleOn)
    ? mapFreeDoubleProfit(unit)
    : 2 * unit;
}