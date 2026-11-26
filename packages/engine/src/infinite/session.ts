import { cardIndex, FULL_RANKS, freshShoe52, SUITS, valueCards, type FullRank, type StakeMode, type Suit } from "./model";
import { DEFAULT_CUT, type CutConfig } from "./presets";
import { rulesFromFields } from "./rules";

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

export type HandTerminal = "stand" | "bust" | "blackjack" | "charlie" | "split-ace";

/** One personal hand. A split round has two or more of these, each frozen and settled alone. */
export interface PlayerHand {
  index: number;
  cardIds: string[];
  frozen: boolean;
  terminal: HandTerminal | null;
  /** False when the casino funded this hand (free split). */
  cash: boolean;
  mode: StakeMode;
  actions: string[];
  aceLock: boolean;
  /** Natural blackjack is only the original two-card 21, never a split hand. */
  naturalOk: boolean;
}

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
  /** Empty until a split, double, or terminal freeze records hands separately. */
  hands: PlayerHand[];
  /** Null until insurance is taken or declined. Whole units, at most half the main stake. */
  insuranceStake: number | null;
  /** Distinct from an empty shoe. The participation dialog waits for this. */
  roundStarted: boolean;
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
    hands: [],
    insuranceStake: null,
    roundStarted: false,
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
    hands: input.hands ?? [],
    insuranceStake: input.insuranceStake ?? null,
    roundStarted: input.roundStarted ?? false,
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
  // The hole is a reservation, not a second removal. Revealing replaces it.
  return shared >= 2 && up && !hole && session.phase !== "complete";
}

export function beginRound(session: ShoeSession): ShoeSession {
  if (session.phase === "complete") return session;
  return { ...session, roundStarted: true };
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
  if (session.participation?.actual === "SKIPPED") {
    const hole = ev.some((e) => e.target === "dealer_hole");
    if (!hole) return session.revealHole ? "dealer_hole" : "other";
    if (dealerFinished(session)) return null;
    return "dealer_draw";
  }
  if (session.hands.some((hand) => !hand.frozen)) return "my_hand";
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
  const openHand = session.hands.some((hand) => !hand.frozen);
  if (session.hands.length > 0) {
    if (!openHand && (chosen === "my_hand" || chosen === "shared")) {
      return { session, error: "Your hand is frozen." };
    }
  } else if (session.frozenHandIds && (chosen === "my_hand" || chosen === "shared")) {
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
  let hands = session.hands;
  if (chosen === "my_hand" && hands.length > 0) {
    hands = hands.map((hand) =>
      hand.index === session.activeHand && !hand.frozen ? { ...hand, cardIds: [...hand.cardIds, event.id] } : hand
    );
  }
  const next: ShoeSession = {
    ...session,
    events,
    redo: [],
    phase,
    hands,
    roundStarted: true,
    frozenAdvice: session.events.some((e) => e.round === session.round)
      ? session.frozenAdvice
      : (frozenAdvice ?? session.frozenAdvice),
  };
  return { session: withReport(sealAfterCard(next)) };
}

export function stand(session: ShoeSession): ShoeSession {
  if (session.phase !== "decision") return session;
  if (session.participation?.actual === "SKIPPED") return session;
  if (session.hands.length === 0) {
    const ids = myHandEvents(session).map((event) => event.id);
    if (ids.length < 2) return session;
    return sealHands(session, [
      {
        index: 0,
        cardIds: ids,
        frozen: true,
        terminal: "stand",
        cash: true,
        mode: "plain",
        actions: ["STAND"],
        aceLock: false,
        naturalOk: false,
      },
    ]);
  }
  const hands = session.hands.map((hand) =>
    hand.index === session.activeHand && !hand.frozen
      ? { ...hand, frozen: true, terminal: "stand" as const, actions: [...hand.actions, "STAND"] }
      : hand
  );
  return sealHands(session, hands);
}

export function splitHand(
  session: ShoeSession,
  kind: "SPLIT_FREE" | "SPLIT_REGULAR"
): { session: ShoeSession; error?: string } {
  if (session.phase !== "decision") return { session, error: "Split is only available on your turn." };
  if (session.participation?.actual === "SKIPPED") return { session, error: "A skipped round has no hand to split." };
  const rules = rulesFromFields().rules;
  const source = session.hands.find((hand) => hand.index === session.activeHand && !hand.frozen);
  const cards = source ? cardsFor(session, source.cardIds) : myHandEvents(session);
  if (cards.length !== 2) return { session, error: "Split needs exactly two cards." };
  const left = bucketOf(cards[0]!.rank);
  const right = bucketOf(cards[1]!.rank);
  if (left !== right) return { session, error: "Those cards are not a pair." };
  const tens = left === 9;
  if (kind === "SPLIT_FREE" && (tens || !rules.freeSplitExceptTens)) {
    return { session, error: "This pair is not a free split." };
  }
  if (kind === "SPLIT_REGULAR" && (!tens || !rules.regularSplitTens)) {
    return { session, error: "Regular split is only the ten-value pair." };
  }
  const alreadySplit = session.hands.length > 1 || session.hands.some((hand) => hand.actions.some((action) => action.startsWith("SPLIT")));
  if (alreadySplit && !rules.resplit) return { session, error: "Resplit is not active in this profile." };
  if (left === 0 && alreadySplit && !rules.resplitAces) return { session, error: "Aces are not resplit." };
  const nextCount = Math.max(session.hands.length, 1) + 1;
  if (nextCount > rules.maxHands) return { session, error: "Maximum hands reached." };
  const aceLock = left === 0 && rules.splitAcesOneCard;
  const first = cards[0]!.id;
  const second = cards[1]!.id;
  if (session.hands.length === 0) {
    const hands: PlayerHand[] = [
      freshHand(0, [first], true, aceLock, [kind]),
      freshHand(1, [second], kind === "SPLIT_REGULAR", aceLock, []),
    ];
    return { session: { ...session, hands, activeHand: 0, handCount: 2, phase: "decision" } };
  }
  const newIndex = Math.max(...session.hands.map((hand) => hand.index)) + 1;
  const hands = session.hands.map((hand) =>
    hand.index === session.activeHand
      ? { ...hand, cardIds: [first], actions: [...hand.actions, kind], aceLock, naturalOk: false }
      : hand
  );
  hands.push(freshHand(newIndex, [second], kind === "SPLIT_REGULAR", aceLock, []));
  return { session: { ...session, hands, activeHand: session.activeHand, handCount: hands.length, phase: "decision" } };
}

export function doubleHand(
  session: ShoeSession,
  mode: "free-double" | "regular-double"
): { session: ShoeSession; error?: string } {
  if (session.phase !== "decision") return { session, error: "Double is only available on your turn." };
  if (session.participation?.actual === "SKIPPED") return { session, error: "A skipped round has no hand to double." };
  const rules = rulesFromFields().rules;
  let hands = session.hands;
  if (hands.length === 0) {
    const ids = myHandEvents(session).map((event) => event.id);
    if (ids.length !== 2) return { session, error: "Double needs the opening two cards." };
    hands = [freshHand(0, ids, true, false, [])];
    hands[0] = { ...hands[0]!, naturalOk: true };
  }
  const active = hands.find((hand) => hand.index === session.activeHand && !hand.frozen);
  if (!active) return { session, error: "That hand is already frozen." };
  if (active.aceLock) return { session, error: "Split aces take one card and cannot double." };
  if (hands.length > 1 && !rules.doubleAfterSplit) {
    return { session, error: "Double after split is not an active rule." };
  }
  const value = valueCards(cardsFor(session, active.cardIds).map((event) => bucketOf(event.rank)));
  const allowed = mode === "free-double" ? rules.freeDoubleHard : rules.regularDoubleHard;
  if (value.hardTotal === null || !allowed.includes(value.hardTotal)) {
    return { session, error: "Double is only hard 9, 10, or 11." };
  }
  const action = mode === "free-double" ? "DOUBLE_FREE" : "DOUBLE_REGULAR";
  return {
    session: {
      ...session,
      hands: hands.map((hand) =>
        hand.index === active.index ? { ...hand, mode, actions: [...hand.actions, action] } : hand
      ),
    },
  };
}

export function setInsurance(session: ShoeSession, stake: number): { session: ShoeSession; error?: string } {
  const up = session.events.find((event) => event.round === session.round && event.target === "dealer_up");
  if (!up || bucketOf(up.rank) !== 0) return { session, error: "Insurance is only offered on a dealer ace." };
  if (session.events.some((event) => event.round === session.round && event.target === "dealer_hole")) {
    return { session, error: "Insurance closes when the hole is revealed." };
  }
  if (!Number.isInteger(stake) || stake < 0) return { session, error: "Insurance has to be a whole unit." };
  const main = session.participation?.actual === "PLAYED" ? session.participation.stakes.main : 0;
  if (stake > Math.floor(main / 2)) return { session, error: "Insurance cannot exceed half the main stake." };
  return { session: { ...session, insuranceStake: stake, roundStarted: true } };
}

export function requestHoleReveal(session: ShoeSession): ShoeSession {
  if (session.events.some((event) => event.round === session.round && event.target === "dealer_hole")) return session;
  const ev = session.events.filter((event) => event.round === session.round);
  const shared = ev.filter((event) => event.target === "shared").length;
  const up = ev.some((event) => event.target === "dealer_up");
  if (shared < 2 || !up) return session;
  const skipped = session.participation?.actual === "SKIPPED";
  const personalDone = Boolean(session.frozenHandIds && session.frozenHandIds.length >= 2) || session.hands.some((hand) => hand.frozen);
  const open = session.hands.some((hand) => !hand.frozen);
  if (!skipped && (!personalDone || open)) return session;
  return { ...session, revealHole: true };
}

export function confirmParticipation(session: ShoeSession, input: RoundParticipation): ShoeSession {
  if (session.participation && session.participation.round === session.round) return session;
  const stakes = input.actual === "SKIPPED" ? { ...input.stakes, main: 0 } : input.stakes;
  return {
    ...session,
    roundStarted: true,
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
      hands: [],
      insuranceStake: null,
      roundStarted: false,
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
  if (session.hands.some((hand) => hand.frozen && hand.cardIds.includes(id))) return session;
  if (session.frozenHandIds?.includes(id)) return session;
  if ((session.frozenHandIds || session.hands.some((hand) => hand.frozen)) && (target === "my_hand" || target === "shared")) {
    return session;
  }
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

function freshHand(index: number, cardIds: string[], cash: boolean, aceLock: boolean, actions: string[]): PlayerHand {
  return {
    index,
    cardIds,
    frozen: false,
    terminal: null,
    cash,
    mode: "plain",
    actions,
    aceLock,
    naturalOk: false,
  };
}

function cardsFor(session: ShoeSession, ids: readonly string[]): ShoeEvent[] {
  const ev = session.events.filter((event) => event.round === session.round);
  const byId = new Map(ev.map((event) => [event.id, event]));
  return ids.flatMap((id) => {
    const event = byId.get(id);
    return event ? [event] : [];
  });
}

function sealHands(session: ShoeSession, hands: PlayerHand[]): ShoeSession {
  const open = hands.find((hand) => !hand.frozen);
  const frozenIds = hands.filter((hand) => hand.frozen).flatMap((hand) => hand.cardIds);
  if (open) {
    return {
      ...session,
      hands,
      activeHand: open.index,
      handCount: hands.length,
      phase: "decision",
      frozenHandIds: frozenIds.length > 0 ? frozenIds : null,
    };
  }
  return {
    ...session,
    hands,
    handCount: hands.length,
    phase: "after_stand",
    frozenHandIds: frozenIds,
    revealHole: false,
  };
}

/** Bust, natural blackjack, and Six Card Charlie freeze without a stand click. */
function sealAfterCard(session: ShoeSession): ShoeSession {
  if (session.participation?.actual === "SKIPPED") return session;
  if (session.hands.length > 0) return freezeRecorded(session);
  if (session.frozenHandIds) return session;
  const events = myHandEvents(session);
  if (events.length < 2) return session;
  const value = valueCards(events.map((event) => bucketOf(event.rank)));
  const rules = rulesFromFields().rules;
  let terminal: HandTerminal | null = null;
  if (value.bust) terminal = "bust";
  else if (value.blackjack) terminal = "blackjack";
  else if (rules.charlie && value.charlie) terminal = "charlie";
  if (!terminal) return session;
  return sealHands(session, [
    {
      index: 0,
      cardIds: events.map((event) => event.id),
      frozen: true,
      terminal,
      cash: true,
      mode: "plain",
      actions: [],
      aceLock: false,
      naturalOk: terminal === "blackjack",
    },
  ]);
}

function freezeRecorded(session: ShoeSession): ShoeSession {
  const rules = rulesFromFields().rules;
  const hands = session.hands.map((hand) => {
    if (hand.frozen) return hand;
    const cards = cardsFor(session, hand.cardIds).map((event) => bucketOf(event.rank));
    if (cards.length < 2) return hand;
    const value = valueCards(cards);
    let terminal: HandTerminal | null = null;
    if (value.bust) terminal = "bust";
    else if (hand.naturalOk && value.blackjack) terminal = "blackjack";
    else if (rules.charlie && value.charlie) terminal = "charlie";
    else if (hand.aceLock) terminal = "split-ace";
    else if (hand.mode !== "plain" && cards.length >= 3) terminal = "stand";
    if (!terminal) return hand;
    return { ...hand, frozen: true, terminal };
  });
  if (hands.every((hand, index) => hand === session.hands[index])) return session;
  return sealHands(session, hands);
}

function bucketOf(rank: FullRank): number {
  const index = FULL_RANKS.indexOf(rank);
  return index >= 9 ? 9 : index;
}

export function myHandEvents(session: ShoeSession): ShoeEvent[] {
  const ev = session.events.filter((event) => event.round === session.round);
  if (session.hands.length > 0) {
    const hand = session.hands.find((row) => row.index === session.activeHand) ?? session.hands[0]!;
    return cardsFor(session, hand.cardIds);
  }
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
  if (session.participation?.actual === "SKIPPED") return null;
  const active = session.hands.find((hand) => hand.index === session.activeHand);
  if (active?.frozen) return null;
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
    hands: intact ? session.hands : [],
    revealHole: Boolean(intact && session.revealHole && !hole),
    phase: intact ? session.phase : derivePhase(events, session.round),
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
