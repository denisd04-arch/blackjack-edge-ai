import { inventoryTotal } from "./inventory-math";
import type { RankInventory } from "./shoe";

/**
 * Names that appear on Evolution Free Bet / Infinite materials.
 * Paytables are not in the verified rules text used here, so none of these
 * produce a payout, RTP, or EV.
 */
export type SideBetType =
  | "perfect_pairs"
  | "twenty_one_plus_three"
  | "hot_3"
  | "bust_it"
  | "bet_behind";

export interface SideBetSlot {
  id: SideBetType;
  labelDe: string;
  /** No definitive EV until a sourced paytable exists. */
  incomplete: true;
  messageDe: string;
}

export const SIDE_BET_CATALOG: SideBetSlot[] = [
  {
    id: "perfect_pairs",
    labelDe: "Perfect Pairs",
    incomplete: true,
    messageDe:
      "Auszahlungstabelle nicht belegt — kein EV, kein RTP.",
  },
  {
    id: "twenty_one_plus_three",
    labelDe: "21+3",
    incomplete: true,
    messageDe: "Auszahlungstabelle nicht belegt — kein EV, kein RTP.",
  },
  {
    id: "hot_3",
    labelDe: "Hot 3",
    incomplete: true,
    messageDe:
      "Nur als Name in einzelnen Regelwerken. Paytable nicht belegt — kein EV.",
  },
  {
    id: "bust_it",
    labelDe: "Bust It",
    incomplete: true,
    messageDe: "Paytable nicht belegt — kein EV.",
  },
  {
    id: "bet_behind",
    labelDe: "Bet Behind",
    incomplete: true,
    messageDe:
      "Folgt der Hand eines anderen Platzes. Eigene Auszahlungsmathematik ist nicht separat belegt — kein EV.",
  },
];

export interface SideBetAnalysisInput {
  type: SideBetType;
  shoe: RankInventory;
}

export interface SideBetAnalysisResult {
  type: SideBetType;
  definitive: false;
  messageDe: string;
  compositionHintDe: string;
}

export function analyzeSideBet(
  input: SideBetAnalysisInput
): SideBetAnalysisResult {
  const slot = SIDE_BET_CATALOG.find((s) => s.id === input.type);
  const remaining = inventoryTotal(input.shoe);
  return {
    type: input.type,
    definitive: false,
    messageDe: slot?.messageDe ?? "Unbekannte Nebenwette — kein EV.",
    compositionHintDe: `Aktueller Schuh: ${remaining} Karten. Ohne belegte Paytable keine Wahrscheinlichkeit als EV.`,
  };
}
