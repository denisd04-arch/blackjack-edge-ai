import type { CardRank } from "../cards";
import { evaluateHand, isPair } from "../hand";
import type { GameProfile, RuleProfileFields } from "../types";

export interface EvolutionRuleReport {
  variantId: string;
  labelDe: string;
  incomplete: boolean;
  missingFields: string[];
  capabilities: {
    pushOn22: boolean;
    infiniteFreeActions: boolean;
    freeSplitOn: RuleProfileFields["freeSplitOn"];
    freeDoubleOn: RuleProfileFields["freeDoubleOn"];
  };
  notesDe: string[];
}

export function evolutionRuleReport(profile: GameProfile): EvolutionRuleReport {
  const r = profile.rules;
  const notes: string[] = [];
  if (r.pushOn22) {
    notes.push("Dealer 22 = Push (Free Bet Variantenregel, EV nur bei vollständigem Profil).");
  }
  if (r.infiniteFreeActions) {
    notes.push("Infinite: kostenlose Split/Double gemäß bestätigter Tischregeln.");
  }
  if (r.freeSplitOn && r.freeSplitOn.length > 0) {
    notes.push(`Kostenloses Teilen wenn: ${r.freeSplitOn.join(", ")}.`);
  }
  if (r.freeDoubleOn && r.freeDoubleOn.length > 0) {
    notes.push(`Kostenloses Verdoppeln wenn: ${r.freeDoubleOn.join(", ")}.`);
  }
  return {
    variantId: profile.id,
    labelDe: profile.labelDe,
    incomplete: profile.incomplete,
    missingFields: [...profile.missingFields],
    capabilities: {
      pushOn22: r.pushOn22 === true,
      infiniteFreeActions: r.infiniteFreeActions === true,
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
  if (!freeSplitOn || freeSplitOn.length === 0 || !isPair(cards)) return false;
  const rank = cards[0];
  if (rank === "10" || rank === "J" || rank === "Q" || rank === "K") {
    return freeSplitOn.includes("10");
  }
  if (rank === "A") return freeSplitOn.includes("pair");
  const n = Number(rank);
  if (n === 8 && freeSplitOn.includes("8")) return true;
  if (n === 9 && freeSplitOn.includes("9")) return true;
  return false;
}

export function freeDoubleEligible(
  cards: readonly CardRank[],
  freeDoubleOn: RuleProfileFields["freeDoubleOn"]
): boolean {
  if (!freeDoubleOn || freeDoubleOn.length === 0 || cards.length !== 2) return false;
  const totals = evaluateHand(cards);
  if (totals.soft && freeDoubleOn.includes("soft")) return true;
  if (totals.total === 9 && freeDoubleOn.includes("9")) return true;
  if (totals.total === 10 && freeDoubleOn.includes("10")) return true;
  if (totals.total === 11 && freeDoubleOn.includes("11")) return true;
  return false;
}