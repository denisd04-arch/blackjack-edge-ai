import { decisionHand, valueCards, type ShoeSession } from "@blackjack-edge/engine";

export type EngineTarget = "shared" | "dealer_up" | "dealer_hole" | "dealer_draw" | "my_hand" | "other";

export type EnglishTarget = "my_hand" | "dealer" | "other" | "hidden";

export const ENGLISH_TARGETS: readonly EnglishTarget[] = ["my_hand", "dealer", "other", "hidden"];

export function targetLabel(target: EnglishTarget): string {
  switch (target) {
    case "my_hand":
      return "Meine Hand";
    case "dealer":
      return "Dealer";
    case "other":
      return "Andere Spieler";
    case "hidden":
      return "Hole Card";
  }
}

export function actionLabel(action: string): string {
  switch (action) {
    case "HIT":
      return "Hit";
    case "STAND":
      return "Stand";
    case "DOUBLE_FREE":
      return "Free Double";
    case "DOUBLE_REGULAR":
      return "Regular Double";
    case "SPLIT_FREE":
      return "Free Split";
    case "SPLIT_REGULAR":
      return "Regular Split";
    case "INSURANCE":
      return "Insurance nehmen";
    case "SKIP_INSURANCE":
      return "Insurance auslassen";
    case "PLAY":
      return "PLAY";
    case "SKIP":
    case "SKIP_INSUFFICIENT":
      return "SKIP";
    case "NOT_DEFINITIVE":
      return "NOT DEFINITIVE";
    case "BET":
      return "Bet";
    case "UNVERIFIED":
      return "Unverified";
    default:
      return "Action";
  }
}

export function advisorDetail(call: string): string {
  switch (call) {
    case "SKIP_INSUFFICIENT":
      return "Zu wenig Daten für diesen Shoe.";
    case "NOT_DEFINITIVE":
      return "Nur teilweise verifiziert. Das ist kein PLAY.";
    case "PLAY":
      return "Der berechnete Edge liegt über deinem Minimum.";
    default:
      return "Der berechnete Edge liegt nicht über deinem Minimum.";
  }
}

export function sideBetName(id: string): string {
  switch (id) {
    case "any_pair":
      return "Any pair";
    case "twenty_one_plus_three":
      return "21+3";
    case "hot3":
      return "Hot 3";
    case "bust_it":
      return "Bust It";
    default:
      return "Side bet";
  }
}

export function sideDecisionLabel(decision: string, unverified: boolean): string {
  if (unverified || decision === "UNVERIFIED") return "Unverified";
  if (decision === "BET") return "Bet";
  if (decision === "SKIP_INSUFFICIENT") return "Not enough data";
  return "Skip";
}

export function qualityLabel(quality: string | null, solving: boolean, inventoryValid: boolean): string {
  if (!inventoryValid) return "Invalid shoe";
  if (solving || !quality) return "Solving";
  switch (quality) {
    case "EXACT":
      return "Exact";
    case "APPROXIMATE":
      return "Approximate";
    case "MONTE_CARLO":
      return "Sampled";
    case "INSUFFICIENT_DATA":
      return "Not enough data";
    default:
      return "Solving";
  }
}

export function presetLabel(id: string): string {
  switch (id) {
    case "CONSERVATIVE_EV":
      return "Conservative";
    case "POSITIVE_EV_ONLY":
      return "Positive edge";
    case "FREE_BET_OPPORTUNITY":
      return "Free bet comparison";
    case "COUNT_BASED":
      return "Count filter";
    case "SIDE_BET_EXPERIMENT":
      return "Side bet experiment";
    case "BALANCED":
      return "Balanced";
    case "CUSTOM":
      return "Custom";
    default:
      return "Preset";
  }
}

export function presetBlurb(id: string): string {
  switch (id) {
    case "CONSERVATIVE_EV":
      return "Raises the minimum edge and uses a smaller Kelly fraction. This changes the advisor and the stake size. It does not change the computed edge or the paytable.";
    case "POSITIVE_EV_ONLY":
      return "Minimum edge is zero. A positive number would qualify, and the main model is only partially verified, so the table still will not call Play.";
    case "FREE_BET_OPPORTUNITY":
      return "Shows the experimental free-bet stake beside Kelly. That figure is not an optimal stake and does not change expected value.";
    case "COUNT_BASED":
      return "Also skips when the true count is below a threshold. The count never replaces the composition edge.";
    case "SIDE_BET_EXPERIMENT":
      return "Turns on the side-bet and portfolio flags stored with the preset. Paytable version 2 stays. Bust It still cannot be a definitive bet.";
    case "BALANCED":
      return "A middle Kelly fraction, the Omega II count, side bets on, and the experimental comparison on. It does not change the paytable.";
    default:
      return "A field was edited. The paytable stays version 2. Editing a setting does not move this browser's session into the database.";
  }
}

export function countSystemLabel(id: string): string {
  switch (id) {
    case "hi_lo":
      return "Hi-Lo";
    case "ko":
      return "KO";
    case "omega_ii":
      return "Omega II";
    case "zen":
      return "Zen";
    default:
      return "Count";
  }
}

export function ruleStatusLabel(status: string): string {
  switch (status) {
    case "VERIFIED":
      return "Verified";
    case "USER_CONFIRMED":
      return "Confirmed";
    case "PARTIALLY_VERIFIED":
      return "Partially verified";
    case "UNVERIFIED":
      return "Unverified";
    case "MISSING":
      return "Missing";
    case "CONFLICTING":
      return "Conflicting sources";
    default:
      return "Unknown";
  }
}

export function probabilityLabel(key: string): string {
  const named: Record<string, string> = {
    perfect: "Perfect pair",
    colored: "Colored pair",
    mixed: "Mixed pair",
    lose: "Lose",
    suitedTrips: "Suited trips",
    straightFlush: "Straight flush",
    threeOfAKind: "Three of a kind",
    straight: "Straight",
    flush: "Flush",
    seven: "7-7-7",
    suited21: "Suited 21",
    unsuited21: "Unsuited 21",
    total20: "Total 20",
    total19: "Total 19",
    exact22: "Dealer 22 exactly",
    loseIf22Pays: "Lose if 22 pays",
    loseIf22DoesNotPay: "Lose if 22 does not pay",
  };
  if (named[key]) return named[key];
  const excluding = /^cards(\d+)Excluding22$/.exec(key);
  if (excluding) return `${excluding[1]} cards, 22 not paid`;
  const cards = /^cards(\d+)$/.exec(key);
  if (cards) return `${cards[1]} cards, 22 paid`;
  return "Outcome";
}

const SUIT_NAME = {
  hearts: "Herz",
  diamonds: "Karo",
  clubs: "Kreuz",
  spades: "Pik",
} as const;

export function cardAria(rank: string, suit: keyof typeof SUIT_NAME, left: number): string {
  return `${rank} ${SUIT_NAME[suit]}, noch ${left}`;
}

export interface TargetContext {
  phase: ShoeSession["phase"];
  shared: number;
  hasUp: boolean;
  hasHole: boolean;
  handFinished: boolean;
  dealerTurn: boolean;
  cutBlocksNewRound: boolean;
}

export interface ResolvedTarget {
  english: EnglishTarget;
  engine: EngineTarget;
}

/** Automatic card destination for the current moment in the round. */
export function autoTarget(ctx: TargetContext): ResolvedTarget | null {
  if (ctx.phase === "complete" || ctx.cutBlocksNewRound) return null;
  if (ctx.shared === 0) return { english: "my_hand", engine: "shared" };
  if (!ctx.hasUp) return { english: "dealer", engine: "dealer_up" };
  if (ctx.shared < 2) return { english: "my_hand", engine: "shared" };
  const handDone = ctx.handFinished || ctx.phase === "after_stand" || ctx.dealerTurn;
  if (!handDone) return { english: "my_hand", engine: "my_hand" };
  if (!ctx.dealerTurn) return { english: "other", engine: "other" };
  if (!ctx.hasHole) return { english: "hidden", engine: "dealer_hole" };
  return { english: "dealer", engine: "dealer_draw" };
}

export function engineTargetFor(english: EnglishTarget, ctx: TargetContext): EngineTarget {
  if (english === "other") return "other";
  if (english === "hidden") return "dealer_hole";
  if (english === "dealer") return ctx.hasUp ? "dealer_draw" : "dealer_up";
  return ctx.shared < 2 ? "shared" : "my_hand";
}

export function handIsFinished(session: ShoeSession): boolean {
  if (session.phase === "after_stand") return true;
  if (session.phase !== "decision") return false;
  const hand = decisionHand(session);
  if (!hand) return false;
  const value = valueCards(hand.cards);
  return value.bust || value.charlie || value.blackjack;
}

export function englishFromEngine(target: EngineTarget): EnglishTarget {
  if (target === "other") return "other";
  if (target === "dealer_hole") return "hidden";
  if (target === "dealer_up" || target === "dealer_draw") return "dealer";
  return "my_hand";
}

export function retargetEngine(english: EnglishTarget, current: EngineTarget): EngineTarget {
  if (english === "other") return "other";
  if (english === "hidden") return "dealer_hole";
  if (english === "dealer") return current === "dealer_up" ? "dealer_up" : "dealer_draw";
  return current === "shared" ? "shared" : "my_hand";
}

export function roundIsActive(session: ShoeSession): boolean {
  const started = session.events.some((event) => event.round === session.round);
  return started && session.phase !== "complete";
}

export function targetContext(
  session: ShoeSession,
  dealerTurn: boolean,
  cutBlocksNewRound: boolean
): TargetContext {
  const events = session.events.filter((event) => event.round === session.round);
  return {
    phase: session.phase,
    shared: events.filter((event) => event.target === "shared").length,
    hasUp: events.some((event) => event.target === "dealer_up"),
    hasHole: events.some((event) => event.target === "dealer_hole"),
    handFinished: handIsFinished(session),
    dealerTurn,
    cutBlocksNewRound,
  };
}
