import { trueCount, type CountSystemId } from "./counting";
import { compositionNextRound } from "./composition-ev";
import { evaluateActions, insuranceEv, nextRoundMainEv, type ActionEval, type RoundEv } from "./ev";
import { kellyStake, type KellyResult } from "./kelly";
import {
  bucketsFrom52,
  freshBuckets,
  freshShoe52,
  playerEdgeFromEv,
  sum52,
  sumBuckets,
  type FullRank,
  type Suit,
} from "./model";
import { freeBetProbabilities, type FreeBetChances } from "./probabilities";
import type { TableSettings } from "./presets";
import { definitiveRulesAllowed } from "./rules";
import {
  FRESH_SHOE_HELP_REFERENCE,
  PAYTABLE_ID,
  sideBetsFromShoe,
  type SideBetResult,
} from "./side-bets";

export type PlayCall = "PLAY" | "SKIP" | "SKIP_INSUFFICIENT" | "NOT_DEFINITIVE";

/**
 * The fresh-shoe main RTP does not match the help screen, and DAS / resplit / max hands
 * are still a conflicting reading. A positive computed edge is not a PLAY.
 */
export const MAIN_EV_VERIFICATION = "PARTIALLY_VERIFIED" as const;

export interface HandInPlay {
  cards: number[];
  up: number;
}

export interface LiveAnalysis {
  /** Static help-screen label. Not updated from the count and not a live edge. */
  helpReference: typeof FRESH_SHOE_HELP_REFERENCE;
  helpReferenceIsLiveEdge: false;
  paytableId: typeof PAYTABLE_ID;
  nextRound: RoundEv;
  /** Equals next-round EV per initial unit. Null when the shoe cannot support it. */
  playerEdge: number | null;
  freeBet: FreeBetChances;
  sideBets: SideBetResult[];
  hand: { actions: ActionEval[]; best: ActionEval; fallback: "COMPOSITION" | "BASIC_STRATEGY" } | null;
  insurance: ReturnType<typeof insuranceEv> | null;
  recommendation: PlayCall;
  mainVerification: typeof MAIN_EV_VERIFICATION;
  kelly: KellyResult;
  trueCount: number | null;
  trueCountStatus: "OK" | "INVALID";
}

/**
 * Recompute every live number from the remaining shoe.
 * The published house edge is not scaled by a count.
 */
export function analyzeRemaining(input: {
  shoe52: Uint8Array;
  seenRanks?: readonly FullRank[];
  physicalRemaining: number;
  inventoryValid: boolean;
  reservedUnknown?: number;
  hand?: HandInPlay | null;
  settings: TableSettings;
  countSystem?: CountSystemId;
  /** Skip the full next-round solve. Side bets and free-bet chances still recompute. */
  main?: boolean;
}): LiveAnalysis {
  const counts = bucketsFrom52(input.shoe52);
  const freeBet = freeBetProbabilities(counts);
  const sideBets = input.inventoryValid
    ? sideBetsFromShoe(input.shoe52, input.settings.minEdge)
    : [];
  const count = trueCount({
    seen: input.seenRanks ?? [],
    system: input.countSystem ?? input.settings.countSystem,
    physicalCardsRemaining: input.physicalRemaining,
    inventoryValid: input.inventoryValid,
  });
  const rulesOk = definitiveRulesAllowed();
  const canSolve = input.inventoryValid && rulesOk && sumBuckets(counts) >= 4;
  let nextRound: RoundEv;
  if (input.main === false) {
    nextRound = { ev: 0, variance: 0, win: 0, push: 0, loss: 0, bust: 0, quality: "INSUFFICIENT_DATA" };
  } else if (!canSolve) {
    nextRound = { ev: 0, variance: 0, win: 0, push: 0, loss: 0, bust: 0, quality: "INSUFFICIENT_DATA" };
  } else {
    nextRound = sumBuckets(counts) > 80
      ? compositionNextRound(counts.slice())
      : nextRoundMainEv(counts.slice());
  }
  const playerEdge =
    input.main === false || nextRound.quality === "INSUFFICIENT_DATA"
      ? null
      : playerEdgeFromEv(nextRound.ev);

  let hand: LiveAnalysis["hand"] = null;
  if (input.hand && rulesOk) {
    const source = canSolve ? counts.slice() : freshBuckets();
    // Known hand cards are already absent from a valid remaining shoe.
    const solved = evaluateActions(source, input.hand.cards, input.hand.up);
    const best = solved.actions.reduce((a, b) => (b.ev > a.ev ? b : a));
    hand = {
      actions: solved.actions,
      best,
      fallback: canSolve ? "COMPOSITION" : "BASIC_STRATEGY",
    };
  }

  const insurance =
    input.hand && input.hand.up === 0 && canSolve ? insuranceEv(counts.slice()) : null;

  let recommendation: PlayCall;
  if (!canSolve || playerEdge === null) recommendation = "SKIP_INSUFFICIENT";
  else if (
    input.settings.countThreshold !== null &&
    (count.trueCount === null || count.trueCount < input.settings.countThreshold)
  ) {
    recommendation = "SKIP";
  } else if (playerEdge > input.settings.minEdge) {
    // MAIN_EV_VERIFICATION is PARTIALLY_VERIFIED. A positive edge is not a PLAY.
    recommendation = "NOT_DEFINITIVE";
  } else recommendation = "SKIP";

  const kelly = kellyStake({
    bankroll: input.settings.bankroll,
    userFraction: input.settings.kellyFraction,
    dist: [{ profit: Math.min(nextRound.ev, 0), p: 1 }],
    experimental: input.settings.experimentalFreeBetComparison ? { pEither: freeBet.pEither } : null,
  });

  return {
    helpReference: FRESH_SHOE_HELP_REFERENCE,
    helpReferenceIsLiveEdge: false,
    paytableId: PAYTABLE_ID,
    nextRound,
    playerEdge,
    freeBet,
    sideBets,
    hand,
    insurance,
    recommendation,
    mainVerification: MAIN_EV_VERIFICATION,
    kelly,
    trueCount: count.trueCount,
    trueCountStatus: count.status,
  };
}

export function freshReferenceShoe(): Uint8Array {
  return freshShoe52(8);
}

/** Used by tests: live edge after a removal is the recomputed EV, not the help edge. */
export function removalChangesFreeBet(before: Uint8Array, after: Uint8Array): boolean {
  const a = freeBetProbabilities(bucketsFrom52(before));
  const b = freeBetProbabilities(bucketsFrom52(after));
  return Math.abs(a.pFreeDouble - b.pFreeDouble) > 1e-12 || Math.abs(a.pFreeSplit - b.pFreeSplit) > 1e-12;
}

