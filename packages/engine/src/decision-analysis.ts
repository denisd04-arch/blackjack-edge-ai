import type { CardRank } from "./cards";
import type { GameProfile } from "./types";
import {
  missingSplitFieldNames,
  rulesFromProfile,
  splitRulesUnresolved,
} from "./blackjack-rules";
import { isEqualValuePair } from "./hand";
import type { RankInventory } from "./shoe";
import {
  actionBreakdown,
  analysisInventory,
  createPlayContext,
  dealerBlackjackProbability,
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

export interface InsuranceQuote {
  offered: boolean;
  /** Composition math at the verified 2:1 payoff. Not a house-edge claim. */
  definitive: boolean;
  dealerBlackjackPct: number | null;
  /** Profit per 1 unit staked on insurance. Positive only when P(BJ) > 1/3. */
  evPerInsuranceUnit: number | null;
  messageDe: string;
}

export interface DecisionAnalysisResult {
  /** Definitive EV allowed for this hand under the verified rules that affect it. */
  definitive: boolean;
  messageDe: string;
  rulesLabelDe: string;
  recommended: PlayerAction | null;
  actions: ActionEvResult[];
  dealerBustPct: number;
  dealer22PushPct: number;
  insurance: InsuranceQuote;
}

const ACTION_LABEL_DE: Record<PlayerAction, string> = {
  stand: "Stehen",
  hit: "Karte",
  double: "Verdoppeln",
  split: "Teilen",
};

const CONDITIONAL_NOTE =
  "Bedingter EV zum erfassten Schuh. Kein Hausvorteil, kein RTP und kein Profit-Claim.";

export interface AnalyzeDecisionInput {
  profile: GameProfile;
  playerCards: readonly CardRank[];
  dealerUpcard: CardRank;
  /** Shoe that still contains the visible player cards and the dealer upcard. */
  shoeRemainingByRank: RankInventory;
}

export function analyzeDecision(
  input: AnalyzeDecisionInput
): DecisionAnalysisResult {
  const rules = rulesFromProfile(input.profile);
  if (!rules) {
    return incompleteResult(
      input.profile,
      `Unvollständiges Profil — kein definitiver EV (${joinMissing(input.profile)}).`
    );
  }
  if (input.playerCards.length < 2) {
    return {
      ...emptyBody(input.profile),
      messageDe: "Mindestens zwei Spielerkarten erforderlich.",
    };
  }

  const inventory = analysisInventory(
    input.shoeRemainingByRank,
    input.playerCards,
    input.dealerUpcard
  );
  if (!inventory) {
    return {
      ...emptyBody(input.profile),
      messageDe:
        "Schuh hat nicht genug Karten für diese Analyse — Inventar prüfen.",
    };
  }

  const insurance = quoteInsurance(input.dealerUpcard, inventory);

  const pair = isEqualValuePair(input.playerCards);
  if (pair && splitRulesUnresolved(rules)) {
    const fields = missingSplitFieldNames(input.profile).join(", ");
    return {
      ...emptyBody(input.profile),
      insurance,
      messageDe: `Paarhand ohne definitive Empfehlung — Split-Folgeregeln nicht belegt (${fields}).`,
    };
  }

  const blocking = input.profile.missingFields.filter(
    (field) =>
      field !== "penetration" &&
      field !== "doubleAfterSplit" &&
      field !== "resplitAces" &&
      field !== "maxSplitsPerHand"
  );
  if (blocking.length > 0) {
    return {
      ...emptyBody(input.profile),
      insurance,
      messageDe: `Unvollständiges Profil — kein definitiver EV (${blocking.join(", ")}).`,
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
    messageDe: CONDITIONAL_NOTE,
    rulesLabelDe: input.profile.labelDe,
    recommended: optimal.bestAction,
    actions,
    dealerBustPct: round2(bustPct * 100),
    dealer22PushPct: rules.pushOn22 ? round2(push22Pct * 100) : 0,
    insurance,
  };
}

/** Next action for a hand already in progress, including split hands. */
export function recommendContinuation(input: {
  profile: GameProfile;
  playerCards: readonly CardRank[];
  dealerUpcard: CardRank;
  shoeIncludingVisible: RankInventory;
  fromSplit: boolean;
}): { definitive: boolean; action: PlayerAction | null } {
  const rules = rulesFromProfile(input.profile);
  if (!rules || input.playerCards.length < 2) {
    return { definitive: false, action: null };
  }
  if (input.fromSplit && splitRulesUnresolved(rules)) {
    return { definitive: false, action: null };
  }
  const inventory = analysisInventory(
    input.shoeIncludingVisible,
    input.playerCards,
    input.dealerUpcard
  );
  if (!inventory) return { definitive: false, action: null };
  const ctx = createPlayContext(input.dealerUpcard, rules, {
    fromSplit: input.fromSplit,
  });
  const optimal = optimalPlayStats(input.playerCards, inventory, ctx, {
    canDouble: input.fromSplit ? rules.doubleAfterSplit === true : rules.allowDouble,
    canSplit: input.fromSplit ? false : rules.allowSplit,
    isSplitHand: input.fromSplit,
  });
  return { definitive: true, action: optimal.bestAction };
}

function quoteInsurance(
  upcard: CardRank,
  unseenAfterUpcard: RankInventory
): InsuranceQuote {
  if (upcard !== "A") {
    return {
      offered: false,
      definitive: false,
      dealerBlackjackPct: null,
      evPerInsuranceUnit: null,
      messageDe: "Versicherung wird nur bei Dealer-Ass angeboten.",
    };
  }
  const p = dealerBlackjackProbability(upcard, unseenAfterUpcard);
  const ev = 3 * p - 1;
  return {
    offered: true,
    definitive: true,
    dealerBlackjackPct: round2(p * 100),
    evPerInsuranceUnit: round4(ev),
    messageDe:
      "Versicherung zahlt 2:1 (Evolution-Regeltext). EV ist nur die Schuhzusammensetzung, kein Tischvorteil.",
  };
}

function incompleteResult(
  profile: GameProfile,
  messageDe: string
): DecisionAnalysisResult {
  return { ...emptyBody(profile), messageDe };
}

function emptyBody(profile: GameProfile): DecisionAnalysisResult {
  return {
    definitive: false,
    messageDe: "",
    rulesLabelDe: profile.labelDe,
    recommended: null,
    actions: [],
    dealerBustPct: 0,
    dealer22PushPct: 0,
    insurance: {
      offered: false,
      definitive: false,
      dealerBlackjackPct: null,
      evPerInsuranceUnit: null,
      messageDe: "Keine Versicherungsangabe.",
    },
  };
}

function joinMissing(profile: GameProfile): string {
  return profile.missingFields.length > 0
    ? profile.missingFields.join(", ")
    : "Regelfelder";
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}
