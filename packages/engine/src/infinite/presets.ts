import { PAYTABLE_ID } from "./side-bets";
import type { CountSystemId } from "./counting";

export type PresetId =
  | "CONSERVATIVE_EV"
  | "POSITIVE_EV_ONLY"
  | "FREE_BET_OPPORTUNITY"
  | "COUNT_BASED"
  | "SIDE_BET_EXPERIMENT"
  | "BALANCED"
  | "CUSTOM";

export interface TableSettings {
  version: 2;
  presetId: PresetId;
  paytableId: typeof PAYTABLE_ID;
  currency: "EUR" | "USD" | "units";
  bankroll: number;
  /** Applied on the next shoe. The open shoe keeps the deck count it started with. */
  decks: number;
  kellyFraction: number;
  minEdge: number;
  countSystem: CountSystemId;
  /** Extra filter. Never a substitute for composition EV. */
  countThreshold: number | null;
  sideBets: boolean;
  experimentalFreeBetComparison: boolean;
  portfolio: boolean;
  cut: CutConfig;
}

export type CutConfig =
  | { mode: "CUT_AFTER_CARDS_DEALT"; cardsDealt: number }
  | { mode: "CUT_AFTER_REMAINING"; cardsRemaining: number }
  | { mode: "PERCENT_PENETRATION"; penetration: number }
  | { mode: "MANUAL"; fired: boolean };

export const DEFAULT_CUT: CutConfig = { mode: "CUT_AFTER_CARDS_DEALT", cardsDealt: 312 };

export const PRESETS: Record<Exclude<PresetId, "CUSTOM">, TableSettings> = {
  CONSERVATIVE_EV: {
    version: 2,
    presetId: "CONSERVATIVE_EV",
    paytableId: PAYTABLE_ID,
    currency: "EUR",
    bankroll: 1000,
    decks: 8,
    kellyFraction: 0.25,
    minEdge: 0.005,
    countSystem: "hi_lo",
    countThreshold: null,
    sideBets: false,
    experimentalFreeBetComparison: false,
    portfolio: false,
    cut: DEFAULT_CUT,
  },
  POSITIVE_EV_ONLY: {
    version: 2,
    presetId: "POSITIVE_EV_ONLY",
    paytableId: PAYTABLE_ID,
    currency: "EUR",
    bankroll: 1000,
    decks: 8,
    kellyFraction: 0.5,
    minEdge: 0,
    countSystem: "hi_lo",
    countThreshold: null,
    sideBets: false,
    experimentalFreeBetComparison: false,
    portfolio: false,
    cut: DEFAULT_CUT,
  },
  FREE_BET_OPPORTUNITY: {
    version: 2,
    presetId: "FREE_BET_OPPORTUNITY",
    paytableId: PAYTABLE_ID,
    currency: "EUR",
    bankroll: 1000,
    decks: 8,
    kellyFraction: 0.5,
    minEdge: 0,
    countSystem: "hi_lo",
    countThreshold: null,
    sideBets: false,
    experimentalFreeBetComparison: true,
    portfolio: false,
    cut: DEFAULT_CUT,
  },
  COUNT_BASED: {
    version: 2,
    presetId: "COUNT_BASED",
    paytableId: PAYTABLE_ID,
    currency: "EUR",
    bankroll: 1000,
    decks: 8,
    kellyFraction: 0.25,
    minEdge: 0,
    countSystem: "hi_lo",
    countThreshold: 1,
    sideBets: false,
    experimentalFreeBetComparison: false,
    portfolio: false,
    cut: DEFAULT_CUT,
  },
  SIDE_BET_EXPERIMENT: {
    version: 2,
    presetId: "SIDE_BET_EXPERIMENT",
    paytableId: PAYTABLE_ID,
    currency: "EUR",
    bankroll: 1000,
    decks: 8,
    kellyFraction: 0.1,
    minEdge: 0,
    countSystem: "hi_lo",
    countThreshold: null,
    sideBets: true,
    experimentalFreeBetComparison: false,
    portfolio: true,
    cut: DEFAULT_CUT,
  },
  BALANCED: {
    version: 2,
    presetId: "BALANCED",
    paytableId: PAYTABLE_ID,
    currency: "EUR",
    bankroll: 1000,
    decks: 8,
    kellyFraction: 0.35,
    minEdge: 0,
    countSystem: "omega_ii",
    countThreshold: null,
    sideBets: true,
    experimentalFreeBetComparison: true,
    portfolio: false,
    cut: DEFAULT_CUT,
  },
};

export function settingsSnapshot(settings: TableSettings): TableSettings {
  return structuredClone(settings);
}
