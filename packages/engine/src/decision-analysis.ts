import type { CardRank } from "./cards";
import type { GameProfile } from "./types";
import { rulesFromProfile, type ResolvedBlackjackRules } from "./blackjack-rules";
import type { RankInventory } from "./shoe";
import {
  actionBreakdown,
  analysisInventory,
  createPlayContext,
  dealerMeta,
  optimalPlayStats,
  type OutcomeStats,
  type PlayerAction,
} from "./ev-core";

export interface ActionEvResult extends OutcomeStats {
  action: PlayerAction;
  available: boolean;
  labelDe: string;
}

export interface DecisionAnalysisResult {
  /** Definitive EV allowed for this profile. */
  definitive: boolean;
  messageDe: string;
  rulesLabelDe: string;
  recommended: PlayerAction | null;
  actions: ActionEvResult[];
  dealerBustPct: number;
  dealer22PushPct: number;
}

const ACTION_LABEL_DE: Record<PlayerAction, string> = {
  stand: "Stehen",
  hit: "Karte",
  double: "Verdoppeln",
  split: "Teilen",
};

export interface AnalyzeDecisionInput {
  profile: GameProfile;
  playerCards: readonly CardRank[];
  dealerUpcard: CardRank;
  shoeRemainingByRank: RankInventory;
}

export function analyzeDecision(
  input: AnalyzeDecisionInput
): DecisionAnalysisResult {
  const rules = rulesFromProfile(input.profile);
  if (input.profile.incomplete || !rules) {
    return incompleteResult(input.profile);
  }
  if (input.playerCards.length < 2) {
    return {
      definitive: false,
      messageDe: "Mindestens zwei Spielerkarten erforderlich.",
      rulesLabelDe: input.profile.labelDe,
      recommended: null,
      actions: [],
      dealerBustPct: 0,
      dealer22PushPct: 0,
    };
  }

  const inventory = analysisInventory(
    input.shoeRemainingByRank,
    input.playerCards,
    input.dealerUpcard
  );
  if (!inventory) {
    return {
      definitive: false,
      messageDe:
        "Schuh hat nicht genug Karten für diese Analyse — Inventar prüfen.",
      rulesLabelDe: input.profile.labelDe,
      recommended: null,
      actions: [],
      dealerBustPct: 0,
      dealer22PushPct: 0,
    };
  }

  const ctx = createPlayContext(input.dealerUpcard, rules);
  const optimal = optimalPlayStats(input.playerCards, inventory, ctx, {
    canDouble: rules.allowDouble,
    canSplit: rules.allowSplit,
    isSplitHand: false,
  });

  const breakdown = actionBreakdown(input.playerCards, inventory, ctx);
  const { bustPct, push22Pct } = dealerMeta(
    inventory,
    input.dealerUpcard,
    rules,
    ctx.dealerMemo
  );

  const actions: ActionEvResult[] = (
    ["stand", "hit", "double", "split"] as const
  ).map((action) => ({
    action,
    labelDe: ACTION_LABEL_DE[action],
    ...breakdown[action],
  }));

  return {
    definitive: true,
    messageDe:
      "EV aus endlichem Schuh mit optimaler Fortsetzung bei „Karte“.",
    rulesLabelDe: input.profile.labelDe,
    recommended: optimal.bestAction,
    actions,
    dealerBustPct: round2(bustPct * 100),
    dealer22PushPct: rules.pushOn22 ? round2(push22Pct * 100) : 0,
  };
}

function incompleteResult(profile: GameProfile): DecisionAnalysisResult {
  const missing =
    profile.missingFields.length > 0
      ? profile.missingFields.join(", ")
      : "Regelfelder";
  return {
    definitive: false,
    messageDe: `Unvollständiges Profil — kein definitiver EV (${missing}).`,
    rulesLabelDe: profile.labelDe,
    recommended: null,
    actions: [],
    dealerBustPct: 0,
    dealer22PushPct: 0,
  };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}