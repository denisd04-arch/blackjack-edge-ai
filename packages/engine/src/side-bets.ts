import { inventoryTotal } from "./inventory-math";
import type { RankInventory } from "./shoe";

export type SideBetType = "perfect_pairs" | "twenty_one_plus_three" | "lucky_ladies";

export interface SideBetSlot {
  id: SideBetType;
  labelDe: string;
  /** No definitive EV until Phase 7+ house math is sourced. */
  incomplete: true;
  messageDe: string;
}

export const SIDE_BET_CATALOG: SideBetSlot[] = [
  {
    id: "perfect_pairs",
    labelDe: "Perfect Pairs",
    incomplete: true,
    messageDe:
      "EV nicht freigegeben — paarweise Wahrscheinlichkeiten aus Schuh-Inventar folgen in späterer Engine-Version.",
  },
  {
    id: "twenty_one_plus_three",
    labelDe: "21+3",
    incomplete: true,
    messageDe:
      "EV nicht freigegeben — benötigt bestätigte Auszahlungstabelle Evolution.",
  },
  {
    id: "lucky_ladies",
    labelDe: "Lucky Ladies (falls aktiv)",
    incomplete: true,
    messageDe:
      "Nicht aktiv ohne verifizierte Tischregel — kein definitiver EV.",
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
    messageDe: slot?.messageDe ?? "Unbekannte Nebenwette.",
    compositionHintDe: `Aktueller Schuh: ${remaining} Karten — Kompositions-EV erfordert freigegebene Mathe.`,
  };
}