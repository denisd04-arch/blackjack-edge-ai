import { cardIndex, FULL_RANKS, freshShoe52, SUITS, valueCards, type FullRank, type Suit } from "./model";
import { DEFAULT_CUT, type CutConfig } from "./presets";

export interface RoundStakes {
  main: number;
  anyPair: number;
  twentyOnePlusThree: number;
  hot3: number;
  bustIt: number;
}

/** What the assistant said, kept apart from what the user actually did. */
export interface RoundParticipation {
  round: number;
  recommendation: string;
  actual: "PLAYED" | "SKIPPED";
  stakes: RoundStakes;
}

export type CardTarget = "shared" | "dealer_up" | "dealer_hole" | "dealer_draw" | "my_hand" | "other";

export interface ShoeEvent {
  id: string;
  seq: number;
  round: number;
  rank: FullRank;
  suit: Suit;
  target: CardTarget;
  handIndex: number;
}

export interface ShoeReport {
  shoeId: string;
  cardsDealt: number;
  cardsRemaining: number;
  roundsStarted: number;
  cut: CutConfig;
  finished: true;
}

export interface ShoeSession {
  id: string;
  round: number;
  events: ShoeEvent[];
  redo: ShoeEvent[];
  phase: "deal" | "decision" | "after_stand" | "complete";
  activeHand: number;
  handCount: number;
  cut: CutConfig;
  manualCut: boolean;
  report: ShoeReport | null;
  quickMode: boolean;
  /** Advanced retarget uses this when quickMode is false. */
  forcedTarget: CardTarget | null;
  overrides: { round: number; recommended: string; chosen: string }[];
  frozenAdvice: unknown;
  /** Event ids locked when the user stands. Later cards cannot join this hand. */
  frozenHandIds: string[] | null;
  /** Next card resolves the reserved hole. After that, draws go to the dealer. */
  revealHole: boolean;
  participation: RoundParticipation | null;
  /** Null until the user answers for a dealer-22 Bust It. Never assumed. */
  bustIt22Pays: boolean | null;
  decks: number;
}

let seq = 1;
function nextId(): string {
  seq += 1;
  return `e${seq}`;
}

export function createShoe(cut: CutConfig = DEFAULT_CUT, decks = 8): ShoeSession {
  return {
    id: `shoe-${Date.now().toString(36)}-${seq}`,
    round: 1,
    events: [],
    redo: [],
    phase: "deal",
    activeHand: 0,
    handCount: 1,
    cut,
    manualCut: false,
    report: null,
    quickMode: true,
    forcedTarget: null,
    overrides: [],
    frozenAdvice: null,
    frozenHandIds: null,
    revealHole: false,
    participation: null,
    bustIt22Pays: null,
    decks,
  };
}

export function normalizeSession(input: ShoeSession): ShoeSession {
  return {
    ...input,
    overrides: input.overrides ?? [],
    redo: input.redo ?? [],
    frozenHandIds: input.frozenHandIds ?? null,
    revealHole: input.revealHole ?? false,
    participation: input.participation ?? null,
    bustIt22Pays: input.bustIt22Pays ?? null,
  };
}

export function newShoe(previous: ShoeSession): ShoeSession {
  return createShoe(previous.cut, previous.decks);
}

export function seenShoe(session: ShoeSession): Uint8Array {
  const shoe = freshShoe52(session.decks);
  for (const event of session.events) {
    const index = cardIndex(event.rank, event.suit);
    shoe[index] = Math.max(0, (shoe[index] ?? 0) - 1);
  }
  return shoe;
}

export function inventoryValid(session: ShoeSession): boolean {
  const shoe = freshShoe52(session.decks);
  for (const event of session.events) {
    const index = cardIndex(event.rank, event.suit);
    if ((shoe[index] ?? 0) <= 0) return false;
    shoe[index] = (shoe[index] ?? 0) - 1;
  }
  return true;
}

export function holeReserved(session: ShoeSession): boolean {
  const ev = session.events.filter((e) => e.round === session.round);
  const shared = ev.filter((e) => e.target === "shared").length;
  const up = ev.some((e) => e.target === "dealer_up");
  const hole = ev.some((e) => e.target === "dealer_hole");
  return shared >= 2 && up && !hole && session.phase !== "complete";
}

export function cardsDealtPhysical(session: ShoeSession): number {
  return session.events.length + (holeReserved(session) ? 1 : 0);
}

export function cutReached(session: ShoeSession): boolean {
  const dealt = cardsDealtPhysical(session);
  const total = 52 * session.decks;
  const remaining = total - dealt;
  switch (session.cut.mode) {
    case "CUT_AFTER_CARDS_DEALT":
      return dealt >= session.cut.cardsDealt;
    case "CUT_AFTER_REMAINING":
      return remaining <= session.cut.cardsRemaining;
    case "PERCENT_PENETRATION":
      return dealt / total >= session.cut.penetration;
    case "MANUAL":
      return session.manualCut || session.cut.fired;
    default:
      return false;
  }
}

export function expectedTarget(session: ShoeSession): CardTarget | null {
  if (!session.quickMode && session.forcedTarget) return session.forcedTarget;
  if (session.phase === "complete") return null;
  const ev = session.events.filter((e) => e.round === session.round);
  const shared = ev.filter((e) => e.target === "shared").length;
  const up = ev.some((e) => e.target === "dealer_up");
  if (shared === 0) return "shared";
  if (!up) return "dealer_up";
  if (shared < 2) return "shared";
  if (session.frozenHandIds) {
    const hole = ev.some((e) => e.target === "dealer_hole");
    if (!hole) return session.revealHole ? "dealer_hole" : "other";
    if (dealerFinished(session)) return null;
    return "dealer_draw";
  }
  if (session.phase === "after_stand") return "other";
  return "my_hand";
}

export function dealCard(
  session: ShoeSession,
  rank: FullRank,
  suit: Suit,
  target?: CardTarget,
  frozenAdvice?: unknown
): { session: ShoeSession; error?: string } {
  if (session.phase === "complete") {
    return { session, error: "Round is complete. Use NEXT ROUND or NEW SHOE." };
  }
  if (cutReached(session) && session.events.every((e) => e.round !== session.round)) {
    return { session, error: "Cut card reached. Only NEW SHOE can start another round." };
  }
  const shoe = seenShoe(session);
  const index = cardIndex(rank, suit);
  if ((shoe[index] ?? 0) <= 0) {
    return { session, error: "That card is no longer in the shoe." };
  }
  const chosen = target ?? expectedTarget(session);
  if (!chosen) return { session, error: "No card target." };
  if (session.frozenHandIds && (chosen === "my_hand" || chosen === "shared")) {
    return { session, error: "Your hand is frozen." };
  }
  if (dealerFinished(session) && (chosen === "dealer_draw" || chosen === "dealer_up" || chosen === "dealer_hole")) {
    return { session, error: "The dealer has finished." };
  }
  const event: ShoeEvent = {
    id: nextId(),
    seq: session.events.length + 1,
    round: session.round,
    rank,
    suit,
    target: chosen,
    handIndex: chosen === "my_hand" ? session.activeHand : 0,
  };
  const events = [...session.events, event];
  let phase = session.phase;
  const roundEvents = events.filter((e) => e.round === session.round);
  const shared = roundEvents.filter((e) => e.target === "shared").length;
  const up = roundEvents.some((e) => e.target === "dealer_up");
  if (shared >= 2 && up && phase === "deal") phase = "decision";
  const next: ShoeSession = {
    ...session,
    events,
    redo: [],
    phase,
    frozenAdvice: session.events.some((e) => e.round === session.round)
      ? session.frozenAdvice
      : (frozenAdvice ?? session.frozenAdvice),
  };
  return { session: withReport(next) };
}

export function stand(session: ShoeSession): ShoeSession {
  if (session.phase !== "decision") return session;
  const ids = myHandEvents(session).map((event) => event.id);
  if (ids.length < 2) return session;
  return { ...session, phase: "after_stand", frozenHandIds: ids, revealHole: false };
}

export function requestHoleReveal(session: ShoeSession): ShoeSession {
  if (session.phase !== "after_stand" || !session.frozenHandIds) return session;
  if (session.events.some((event) => event.round === session.round && event.target === "dealer_hole")) return session;
  return { ...session, revealHole: true };
}

export function confirmParticipation(session: ShoeSession, input: RoundParticipation): ShoeSession {
  if (session.participation && session.participation.round === session.round) return session;
  const stakes = input.actual === "SKIPPED" ? { ...input.stakes, main: 0 } : input.stakes;
  return {
    ...session,
    participation: { ...input, round: session.round, stakes },
  };
}

export function answerBustIt22(session: ShoeSession, pays: boolean): ShoeSession {
  return { ...session, bustIt22Pays: pays };
}

export function completeRound(session: ShoeSession): ShoeSession {
  return withReport({ ...session, phase: "complete" });
}

export function markRoundSettled(session: ShoeSession): ShoeSession {
  if (session.phase === "complete") return session;
  return completeRound(session);
}

export function nextRound(session: ShoeSession): { session: ShoeSession; error?: string } {
  const checked = withReport(session);
  if (cutReached(checked) || checked.report) {
    return { session: checked, error: "Cut card reached. Only NEW SHOE starts a new shoe." };
  }
  if (checked.phase !== "complete" && checked.events.some((e) => e.round === checked.round)) {
    return { session: checked, error: "Finish the round before NEXT ROUND." };
  }
  return {
    session: {
      ...checked,
      round: checked.round + 1,
      phase: "deal",
      activeHand: 0,
      handCount: 1,
      frozenAdvice: null,
      frozenHandIds: null,
      revealHole: false,
      participation: null,
      bustIt22Pays: null,
      report: null,
    },
  };
}

export function undo(session: ShoeSession): ShoeSession {
  const events = session.events.slice();
  const last = events.pop();
  if (!last) return session;
  return withReport({ ...keepFreeze(session, events), redo: [...session.redo, last] });
}

export function redo(session: ShoeSession): ShoeSession {
  const redoStack = session.redo.slice();
  const event = redoStack.pop();
  if (!event) return session;
  const events = [...session.events, event];
  return withReport({ ...keepFreeze(session, events), redo: redoStack });
}

export function deleteEvent(session: ShoeSession, id: string): ShoeSession {
  if (session.frozenHandIds?.includes(id)) return session;
  const events = session.events.filter((e) => e.id !== id).map((e, i) => ({ ...e, seq: i + 1 }));
  return withReport({ ...keepFreeze(session, events), redo: [] });
}

export function editEvent(
  session: ShoeSession,
  id: string,
  rank: FullRank,
  suit: Suit
): { session: ShoeSession; error?: string } {
  const without = session.events.filter((e) => e.id !== id);
  const probe: ShoeSession = { ...session, events: without };
  const shoe = seenShoe(probe);
  if ((shoe[cardIndex(rank, suit)] ?? 0) <= 0) {
    return { session, error: "That card is no longer in the shoe." };
  }
  if (session.frozenHandIds?.includes(id)) {
    return { session, error: "That card is in your frozen hand." };
  }
  return {
    session: withReport({
      ...session,
      redo: [],
      events: session.events.map((e) => (e.id === id ? { ...e, rank, suit } : e)),
    }),
  };
}

/** Moves a card between targets. The shoe removal does not change. A frozen hand stays put. */
export function retargetEvent(session: ShoeSession, id: string, target: CardTarget): ShoeSession {
  if (session.frozenHandIds?.includes(id)) return session;
  if (session.frozenHandIds && (target === "my_hand" || target === "shared")) return session;
  return {
    ...session,
    redo: [],
    events: session.events.map((e) =>
      e.id === id ? { ...e, target, handIndex: target === "my_hand" ? session.activeHand : e.handIndex } : e
    ),
  };
}

export function recordOverride(session: ShoeSession, recommended: string, chosen: string): ShoeSession {
  return {
    ...session,
    overrides: [...session.overrides, { round: session.round, recommended, chosen }],
  };
}

export function fireManualCut(session: ShoeSession): ShoeSession {
  return withReport({ ...session, manualCut: true });
}

export function seenRanks(session: ShoeSession): FullRank[] {
  return session.events.map((e) => e.rank);
}

function bucketOf(rank: FullRank): number {
  const index = FULL_RANKS.indexOf(rank);
  return index >= 9 ? 9 : index;
}

export function myHandEvents(session: ShoeSession): ShoeEvent[] {
  const ev = session.events.filter((event) => event.round === session.round);
  if (session.frozenHandIds && session.frozenHandIds.length > 0) {
    const byId = new Map(ev.map((event) => [event.id, event]));
    return session.frozenHandIds.flatMap((id) => {
      const event = byId.get(id);
      return event ? [event] : [];
    });
  }
  const shared = ev.filter((event) => event.target === "shared");
  const split = session.handCount > 1;
  const base = split ? [shared[session.activeHand] ?? shared[0]!].filter(Boolean) : shared;
  const extra = ev.filter((event) => event.target === "my_hand" && event.handIndex === session.activeHand);
  return [...base, ...extra];
}

export function dealerCards(session: ShoeSession): ShoeEvent[] {
  const ev = session.events.filter((event) => event.round === session.round);
  return [
    ...ev.filter((event) => event.target === "dealer_up"),
    ...ev.filter((event) => event.target === "dealer_hole"),
    ...ev.filter((event) => event.target === "dealer_draw"),
  ];
}

export function myHandTotal(session: ShoeSession): number | null {
  const cards = myHandEvents(session).map((event) => bucketOf(event.rank));
  if (cards.length === 0) return null;
  return valueCards(cards).total;
}

/** Dealer stands on soft 17. 22 and bust are finished hands, not a prompt for another card. */
export function dealerFinished(session: ShoeSession): boolean {
  const cards = dealerCards(session).map((event) => bucketOf(event.rank));
  if (cards.length < 2) return false;
  const value = valueCards(cards);
  if (cards.length === 2 && value.total === 21) return true;
  return value.total >= 17;
}

/** Cards of the active hand plus the dealer upcard, once the opening is complete. */
export function decisionHand(session: ShoeSession): { cards: number[]; up: number } | null {
  if (session.phase === "deal" || session.phase === "complete") return null;
  const hand = myHandEvents(session);
  const up = session.events.find((event) => event.round === session.round && event.target === "dealer_up");
  if (hand.length < 2 || !up) return null;
  return {
    cards: hand.map((event) => bucketOf(event.rank)),
    up: bucketOf(up.rank),
  };
}

function keepFreeze(session: ShoeSession, events: ShoeEvent[]): ShoeSession {
  const frozen = session.frozenHandIds;
  const intact = Boolean(frozen && frozen.length > 0 && frozen.every((id) => events.some((event) => event.id === id)));
  const hole = events.some((event) => event.round === session.round && event.target === "dealer_hole");
  return {
    ...session,
    events,
    frozenHandIds: intact ? frozen : null,
    revealHole: Boolean(intact && session.revealHole && !hole),
    phase: intact ? "after_stand" : derivePhase(events, session.round),
  };
}

function derivePhase(events: ShoeEvent[], round: number): ShoeSession["phase"] {
  const ev = events.filter((e) => e.round === round);
  const shared = ev.filter((e) => e.target === "shared").length;
  const up = ev.some((e) => e.target === "dealer_up");
  if (shared >= 2 && up) return "decision";
  return "deal";
}

function withReport(session: ShoeSession): ShoeSession {
  if (!cutReached(session)) return { ...session, report: null };
  const total = 52 * session.decks;
  const dealt = cardsDealtPhysical(session);
  return {
    ...session,
    report: {
      shoeId: session.id,
      cardsDealt: dealt,
      cardsRemaining: total - dealt,
      roundsStarted: session.round,
      cut: session.cut,
      finished: true,
    },
  };
}

export function parseRankSuit(label: string): { rank: FullRank; suit: Suit } | null {
  const suitChar = label.slice(-1);
  const rank = label.slice(0, -1) as FullRank;
  const suit = SUITS.find((s) => (s === "hearts" && suitChar === "h") || (s === "diamonds" && suitChar === "d") || (s === "clubs" && suitChar === "c") || (s === "spades" && suitChar === "s"));
  if (!suit || !FULL_RANKS.includes(rank)) return null;
  return { rank, suit };
}
