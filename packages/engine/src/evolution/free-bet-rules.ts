import type { CardRank } from "../cards";
import { evaluateHand, isEqualValuePair, isTenValue } from "../hand";
import type { GameProfile, RuleProfileFields } from "../types";

export interface EvolutionRuleReport {
  variantId: string;
  labelDe: string;
  incomplete: boolean;
  missingFields: string[];
  capabilities: {
    pushOn22: boolean;
    infiniteFreeActions: boolean;
    charlieSixCard: boolean;
    freeSplitOn: RuleProfileFields["freeSplitOn"];
    freeDoubleOn: RuleProfileFields["freeDoubleOn"];
  };
  notesDe: string[];
}

export function evolutionRuleReport(profile: GameProfile): EvolutionRuleReport {
  const r = profile.rules;
  const notes: string[] = [];
  if (r.pushOn22 === true) {
    notes.push(
      "Dealer 22 ist Push, außer die Spielerhand ist bust. Blackjack des Spielers gewinnt gegen 22 (3:2)."
    );
  }
  if (r.charlieSixCard === true) {
    notes.push(
      "Six Card Charlie: sechs Karten mit 21 oder weniger gewinnen 1:1. Gegen Dealer 22 bleibt der Push (keine Charlie-Ausnahme im Regeltext)."
    );
  } else if (r.charlieSixCard === false) {
    notes.push("Kein Six Card Charlie in diesem Regeltext.");
  }
  if (r.dealerHitsSoft17 === false) {
    notes.push("Dealer steht auf Soft 17.");
  }
  if (r.dealerPeeksForBlackjack === true) {
    notes.push(
      "Dealer prüft Blackjack, bevor der Spieler handelt. Double/Split setzt den zweiten Einsatz dann nicht."
    );
  }
  if (r.freeSplitOn && r.freeSplitOn.includes("pair")) {
    notes.push(
      "Free Split auf alle Paare außer 10/J/Q/K. Zweite Hand: Gewinn zahlt 1:1 auf den Einsatz, Verlust und Push kosten 0."
    );
  }
  if (r.freeDoubleOn && r.freeDoubleOn.length > 0) {
    notes.push(
      `Free Double nur auf hart ${r.freeDoubleOn.join(", ")}: Gewinn +2, Verlust −1, Push 0 (nur der ursprüngliche Einsatz im Risiko).`
    );
  }
  if (r.doubleAfterSplit === null || r.maxSplitsPerHand === null) {
    notes.push(
      "Split-Folgeregeln (Double after Split, Resplit) sind nicht belegt — Paarhände ohne definitive Empfehlung."
    );
  }
  if (r.penetration === null) {
    notes.push(
      "Penetration/CSM ist nicht belegt. Entscheidungen nutzen nur den erfassten Schuh, keinen Hausvorteil."
    );
  }
  return {
    variantId: profile.id,
    labelDe: profile.labelDe,
    incomplete: profile.incomplete,
    missingFields: [...profile.missingFields],
    capabilities: {
      pushOn22: r.pushOn22 === true,
      infiniteFreeActions: r.infiniteFreeActions === true,
      charlieSixCard: r.charlieSixCard === true,
      freeSplitOn: r.freeSplitOn ?? [],
      freeDoubleOn: r.freeDoubleOn ?? [],
    },
    notesDe: notes,
  };
}

export function freeSplitEligible(
  cards: readonly CardRank[],
  freeSplitOn: RuleProfileFields["freeSplitOn"]
): boolean {
  if (!freeSplitOn || freeSplitOn.length === 0 || !isEqualValuePair(cards)) {
    return false;
  }
  const rank = cards[0];
  if (rank === undefined) return false;
  if (isTenValue(rank) || isTenValue(cards[1]!)) {
    return freeSplitOn.includes("10");
  }
  if (freeSplitOn.includes("pair")) return true;
  if (rank === "8" && freeSplitOn.includes("8")) return true;
  if (rank === "9" && freeSplitOn.includes("9")) return true;
  return false;
}

export function freeDoubleEligible(
  cards: readonly CardRank[],
  freeDoubleOn: RuleProfileFields["freeDoubleOn"]
): boolean {
  if (!freeDoubleOn || freeDoubleOn.length === 0 || cards.length !== 2) {
    return false;
  }
  const totals = evaluateHand(cards);
  if (totals.soft || totals.blackjack) return false;
  if (totals.total === 9 && freeDoubleOn.includes("9")) return true;
  if (totals.total === 10 && freeDoubleOn.includes("10")) return true;
  if (totals.total === 11 && freeDoubleOn.includes("11")) return true;
  return false;
}

/**
 * Free double, per final comparison of the one-card hand (unit profit +1 / 0 / −1).
 * Win pays the original and the matched free stake (+2). Loss forfeits only the original (−1).
 * Verified wording: BetMGM / Infinite PDF, matched with the even-money free-stake settlement.
 */
export function mapFreeDoubleProfit(unitProfit: number): number {
  if (unitProfit > 0) return unitProfit + 1;
  return unitProfit;
}

/** Second hand of a free split: win pays the matched stake, loss and push pay 0. */
export function mapFreeSplitSideProfit(unitProfit: number): number {
  return unitProfit > 0 ? unitProfit : 0;
}
