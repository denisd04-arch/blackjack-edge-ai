import { handProfit, type DealerKind, type SettledHand, type StakeMode, valueCards } from "./model";
import { cardIndex, type FullRank, type Suit } from "./model";
import { rulesFromFields } from "./rules";
import {
  dealerCards,
  myHandEvents,
  type PlayerHand,
  type RoundParticipation,
  type RoundStakes,
  type ShoeEvent,
  type ShoeSession,
} from "./session";
import {
  classifyDealtHot3,
  classifyDealtPair,
  classifyDealtPlus3,
  PAYTABLE_V2,
  type Hot3Category,
  type PairCategory,
  type Plus3Category,
} from "./side-bets";

export type MainOutcome =
  | "WIN"
  | "LOSS"
  | "PUSH"
  | "BLACKJACK"
  | "BUST"
  | "DEALER_BUST"
  | "DEALER_22"
  | "SKIPPED"
  | "MIXED";

export interface HandLine {
  handIndex: number;
  outcome: MainOutcome;
  total: number;
  net: number;
  cash: number;
  cashFunded: boolean;
}

export interface SideLine {
  id: "any_pair" | "twenty_one_plus_three" | "hot3" | "bust_it";
  name: string;
  stake: number;
  category: string;
  net: number | null;
  status: "SETTLED" | "PENDING";
}

export interface RoundSettlement {
  key: string;
  shoeId: string;
  round: number;
  recommendation: string;
  actual: "PLAYED" | "SKIPPED";
  status: "SETTLED" | "PENDING";
  pendingReason: string | null;
  playerTotal: number | null;
  dealerTotal: number | null;
  dealerLabel: string;
  mainCash: number;
  mainNet: number | null;
  sideCash: number;
  sideNet: number | null;
  roundCash: number;
  roundNet: number | null;
  mainRoi: number | null;
  sideRoi: number | null;
  roundRoi: number | null;
  sides: SideLine[];
  outcome: MainOutcome | null;
  hands: HandLine[];
  insuranceCash: number;
  insuranceNet: number | null;
}

export interface Ledger {
  storage: "browser-local";
  startingBankroll: number;
  bankroll: number;
  entries: RoundSettlement[];
}

export interface Rollup {
  mainNet: number;
  mainCash: number;
  sideNet: number;
  sideCash: number;
  roundNet: number;
  roundCash: number;
  mainRoi: number | null;
  sideRoi: number | null;
  roundRoi: number | null;
  /** A winning shoe is net profit above zero, not a count of winning rounds. */
  winning: boolean | null;
}

export function emptyLedger(startingBankroll: number): Ledger {
  return { storage: "browser-local", startingBankroll, bankroll: startingBankroll, entries: [] };
}

export function roi(net: number | null, cash: number): number | null {
  if (net === null || !(cash > 0)) return null;
  return net / cash;
}

function whole(value: number): number | null {
  if (!Number.isFinite(value) || value < 0 || !Number.isInteger(value)) return null;
  return value;
}

function stakesAreWhole(stakes: RoundStakes): boolean {
  return [stakes.main, stakes.anyPair, stakes.twentyOnePlusThree, stakes.hot3, stakes.bustIt].every(
    (value) => whole(value) !== null
  );
}

export function stakeModeFromActions(actions: readonly string[]): StakeMode | "SPLIT" {
  for (let i = actions.length - 1; i >= 0; i -= 1) {
    const action = actions[i];
    if (action === "SPLIT_FREE" || action === "SPLIT_REGULAR") return "SPLIT";
    if (action === "DOUBLE_FREE") return "free-double";
    if (action === "DOUBLE_REGULAR") return "regular-double";
  }
  return "plain";
}

function cashUnits(mode: StakeMode): number {
  return mode === "regular-double" ? 2 : 1;
}

export function readDealer(cards: readonly number[]): {
  kind: DealerKind;
  total: number;
  finished: boolean;
  count: number;
} {
  const value = cards.length ? valueCards(cards) : null;
  const total = value?.total ?? 0;
  if (cards.length < 2 || !value) {
    return { kind: { type: "total", total }, total, finished: false, count: cards.length };
  }
  if (cards.length === 2 && value.total === 21) {
    return { kind: { type: "bj" }, total: 21, finished: true, count: 2 };
  }
  if (value.total === 22) return { kind: { type: "22" }, total: 22, finished: true, count: cards.length };
  if (value.bust || value.total > 21) {
    return { kind: { type: "bust" }, total: value.total, finished: true, count: cards.length };
  }
  if (value.total >= 17) return { kind: { type: "total", total: value.total }, total: value.total, finished: true, count: cards.length };
  return { kind: { type: "total", total: value.total }, total: value.total, finished: false, count: cards.length };
}

function dealerLabel(kind: DealerKind, total: number): string {
  if (kind.type === "bj") return "blackjack";
  if (kind.type === "22") return "22";
  if (kind.type === "bust") return `bust ${total}`;
  return String(total);
}

function bucketsOf(events: readonly ShoeEvent[]): number[] {
  return events.map((event) => {
    const index = cardIndex(event.rank, event.suit);
    const rank = Math.floor(index / 4);
    return rank >= 9 ? 9 : rank;
  });
}

function indexesOf(events: readonly ShoeEvent[]): number[] {
  return events.map((event) => cardIndex(event.rank, event.suit));
}

function pairOdds(category: PairCategory): number {
  if (category === "lose") return -1;
  return PAYTABLE_V2.anyPair[category];
}

function plusOdds(category: Plus3Category): number {
  if (category === "lose") return -1;
  return PAYTABLE_V2.twentyOnePlusThree[category];
}

function hotOdds(category: Hot3Category): number {
  if (category === "lose") return -1;
  if (category === "seven") return PAYTABLE_V2.hot3.sevenSevenSeven;
  if (category === "suited21") return PAYTABLE_V2.hot3.suited21;
  if (category === "unsuited21") return PAYTABLE_V2.hot3.unsuited21;
  if (category === "total20") return PAYTABLE_V2.hot3.total20;
  return PAYTABLE_V2.hot3.total19;
}

function line(id: SideLine["id"], name: string, stake: number, category: string, odds: number | null, pending: string | null): SideLine {
  if (stake === 0) return { id, name, stake: 0, category: "not played", net: 0, status: "SETTLED" };
  if (pending || odds === null) return { id, name, stake, category, net: null, status: "PENDING" };
  const net = odds < 0 ? -stake : odds * stake;
  return { id, name, stake, category, net, status: "SETTLED" };
}

function bustOdds(count: number): number {
  if (count >= 8) return PAYTABLE_V2.bustIt[8];
  if (count === 7) return PAYTABLE_V2.bustIt[7];
  if (count === 6) return PAYTABLE_V2.bustIt[6];
  if (count === 5) return PAYTABLE_V2.bustIt[5];
  if (count === 4) return PAYTABLE_V2.bustIt[4];
  if (count === 3) return PAYTABLE_V2.bustIt[3];
  return -1;
}

export function settleRound(input: {
  shoeId: string;
  round: number;
  participation: RoundParticipation;
  playerEvents: readonly ShoeEvent[];
  dealerEvents: readonly ShoeEvent[];
  actions: readonly string[];
  bustIt22Pays: boolean | null;
  handFrozen: boolean;
  hands?: readonly { index: number; events: readonly ShoeEvent[]; frozen: boolean; cash: boolean; mode: StakeMode; naturalOk: boolean }[];
  insuranceStake?: number | null;
}): RoundSettlement {
  const actual = input.participation.actual;
  const stakes = actual === "SKIPPED" ? { ...input.participation.stakes, main: 0 } : input.participation.stakes;
  const base: RoundSettlement = {
    key: `${input.shoeId}:${input.round}`,
    shoeId: input.shoeId,
    round: input.round,
    recommendation: input.participation.recommendation,
    actual,
    status: "PENDING",
    pendingReason: null,
    playerTotal: null,
    dealerTotal: null,
    dealerLabel: "unfinished",
    mainCash: 0,
    mainNet: null,
    sideCash: 0,
    sideNet: null,
    roundCash: 0,
    roundNet: null,
    mainRoi: null,
    sideRoi: null,
    roundRoi: null,
    sides: [],
    outcome: null,
    hands: [],
    insuranceCash: 0,
    insuranceNet: null,
  };
  if (!stakesAreWhole(stakes)) {
    return { ...base, pendingReason: "Stakes have to be whole units of currency." };
  }
  const mode = stakeModeFromActions(input.actions);
  const recorded = input.hands ?? [];
  if (mode === "SPLIT" && actual === "PLAYED" && stakes.main > 0 && recorded.length < 2) {
    return { ...base, pendingReason: "A split was chosen. Record each hand before the round can be settled." };
  }
  const playerBuckets = bucketsOf(input.playerEvents);
  const playerValue = playerBuckets.length ? valueCards(playerBuckets) : null;
  const dealer = readDealer(bucketsOf(input.dealerEvents));
  const played = actual === "PLAYED" && stakes.main > 0;
  if (!dealer.finished) {
    return {
      ...base,
      playerTotal: playerValue?.total ?? null,
      pendingReason: "The dealer has not finished. Nothing is settled yet.",
    };
  }
  if (played && !input.handFrozen) {
    return { ...base, playerTotal: playerValue?.total ?? null, dealerTotal: dealer.total, pendingReason: "Stand to freeze your hand before it is settled." };
  }
  if (played && playerBuckets.length < 2) {
    return { ...base, dealerTotal: dealer.total, pendingReason: "Your frozen hand needs two cards before it can be settled." };
  }
  if (played && input.playerEvents.some((event) => event.target === "other")) {
    return { ...base, pendingReason: "Your hand includes another player's card." };
  }

  let mainNet = 0;
  let mainCash = 0;
  let handLines: HandLine[] = [];
  const rules = rulesFromFields().rules;
  if (played && dealer.finished && recorded.length > 0) {
    if (recorded.some((hand) => !hand.frozen)) {
      return { ...base, playerTotal: playerValue?.total ?? null, dealerTotal: dealer.total, pendingReason: "Freeze every hand before it is settled." };
    }
    for (const hand of recorded) {
      const buckets = bucketsOf(hand.events);
      const value = valueCards(buckets);
      const stakeMode: StakeMode = hand.mode;
      const settled: SettledHand = {
        total: value.total,
        bust: value.bust,
        blackjack: hand.naturalOk && value.blackjack,
        charlie: rules.charlie && value.charlie,
        cash: hand.cash,
        mode: stakeMode,
      };
      let unit = handProfit(settled, dealer.kind);
      if (rules.dealerPeeks && dealer.kind.type === "bj" && stakeMode === "regular-double" && hand.cash) unit = -1;
      const net = unit * stakes.main;
      const cash = hand.cash ? cashUnits(stakeMode) * stakes.main : 0;
      mainNet += net;
      mainCash += cash;
      handLines.push({
        handIndex: hand.index,
        outcome: classifyMain(settled, dealer.kind),
        total: value.total,
        net,
        cash,
        cashFunded: hand.cash,
      });
    }
  } else if (played && playerValue && dealer.finished && mode !== "SPLIT") {
    const stakeMode: StakeMode = mode;
    const hand: SettledHand = {
      total: playerValue.total,
      bust: playerValue.bust,
      blackjack: playerValue.blackjack,
      charlie: rules.charlie && playerValue.charlie,
      cash: true,
      mode: stakeMode,
    };
    let unit = handProfit(hand, dealer.kind);
    if (rules.dealerPeeks && dealer.kind.type === "bj" && stakeMode === "regular-double") unit = -1;
    mainNet = unit * stakes.main;
    mainCash = cashUnits(stakeMode) * stakes.main;
    handLines = [
      {
        handIndex: 0,
        outcome: classifyMain(hand, dealer.kind),
        total: playerValue.total,
        net: mainNet,
        cash: mainCash,
        cashFunded: true,
      },
    ];
  }

  const playerIndex = indexesOf(input.playerEvents);
  const dealerIndex = indexesOf(input.dealerEvents);
  const pair = playerIndex.length >= 2 ? classifyDealtPair(playerIndex[0]!, playerIndex[1]!) : null;
  const up = dealerIndex[0];
  const plus = pair && up !== undefined ? classifyDealtPlus3(playerIndex[0]!, playerIndex[1]!, up) : null;
  const hot = pair && up !== undefined ? classifyDealtHot3(playerIndex[0]!, playerIndex[1]!, up) : null;

  const anyPair = line("any_pair", "Any pair", stakes.anyPair, pair ?? "waiting", pair ? pairOdds(pair) : null, pair ? null : stakes.anyPair > 0 ? "Any pair needs your first two cards." : null);
  const plus3 = line("twenty_one_plus_three", "21+3", stakes.twentyOnePlusThree, plus ?? "waiting", plus ? plusOdds(plus) : null, plus ? null : stakes.twentyOnePlusThree > 0 ? "21+3 needs your first two cards and the dealer upcard." : null);
  const hot3 = line("hot3", "Hot 3", stakes.hot3, hot ?? "waiting", hot ? hotOdds(hot) : null, hot ? null : stakes.hot3 > 0 ? "Hot 3 needs your first two cards and the dealer upcard." : null);

  let bustPending: string | null = null;
  let bustOddsValue: number | null = -1;
  let bustCategory = "lose";
  if (stakes.bustIt > 0) {
    if (!dealer.finished) {
      bustPending = "Bust It waits until the dealer has finished.";
      bustOddsValue = null;
      bustCategory = "waiting";
    } else if (dealer.kind.type === "22") {
      bustCategory = `dealer 22 in ${dealer.count} cards`;
      if (input.bustIt22Pays === null) {
        bustPending = "Dealer 22 is unverified for Bust It. Confirm whether this table paid it.";
        bustOddsValue = null;
      } else if (input.bustIt22Pays) {
        bustOddsValue = bustOdds(dealer.count);
        bustCategory = `paid on 22 in ${dealer.count} cards`;
      } else {
        bustOddsValue = -1;
        bustCategory = "22 did not pay";
      }
    } else if (dealer.kind.type === "bust") {
      bustOddsValue = bustOdds(dealer.count);
      bustCategory = `bust in ${dealer.count} cards`;
    } else {
      bustOddsValue = -1;
      bustCategory = "dealer did not bust";
    }
  }
  const bust = line("bust_it", "Bust It", stakes.bustIt, bustCategory, bustOddsValue, bustPending);
  const sides = [anyPair, plus3, hot3, bust];
  const sidePending = sides.find((side) => side.status === "PENDING");
  if (sidePending) {
    return {
      ...base,
      playerTotal: playerValue?.total ?? null,
      dealerTotal: dealer.total,
      dealerLabel: dealerLabel(dealer.kind, dealer.total),
      sides,
      pendingReason: bustPending ?? `${sidePending.name} is not ready to settle.`,
    };
  }
  const insuranceStake = played ? Math.max(0, input.insuranceStake ?? 0) : 0;
  if (insuranceStake > Math.floor(stakes.main / 2)) {
    return { ...base, playerTotal: playerValue?.total ?? null, dealerTotal: dealer.total, pendingReason: "Insurance is above half the main stake." };
  }
  const insuranceNet = insuranceStake === 0 ? 0 : dealer.kind.type === "bj" ? insuranceStake * 2 : -insuranceStake;
  const sideNet = sides.reduce((sum, side) => sum + (side.net ?? 0), 0);
  const sideCash = sides.reduce((sum, side) => sum + side.stake, 0);
  const roundNet = mainNet + sideNet + insuranceNet;
  const roundCash = mainCash + sideCash + insuranceStake;
  const outcome = !played ? "SKIPPED" : handLines.length > 1 && new Set(handLines.map((hand) => hand.outcome)).size > 1 ? "MIXED" : handLines[0]?.outcome ?? "PUSH";
  return {
    ...base,
    status: "SETTLED",
    pendingReason: null,
    playerTotal: played ? playerValue?.total ?? null : playerValue?.total ?? null,
    dealerTotal: dealer.finished ? dealer.total : null,
    dealerLabel: dealer.finished ? dealerLabel(dealer.kind, dealer.total) : "not needed",
    mainCash,
    mainNet,
    sideCash,
    sideNet,
    roundCash,
    roundNet,
    mainRoi: roi(mainNet, mainCash),
    sideRoi: roi(sideNet, sideCash),
    roundRoi: roi(roundNet, roundCash),
    sides,
    outcome,
    hands: handLines,
    insuranceCash: insuranceStake,
    insuranceNet,
  };
}

function classifyMain(hand: SettledHand, dealer: DealerKind): MainOutcome {
  if (hand.bust) return "BUST";
  if (hand.blackjack && dealer.type === "bj") return "PUSH";
  if (hand.blackjack) return "BLACKJACK";
  if (hand.charlie && dealer.type !== "bj" && dealer.type !== "22") return "WIN";
  if (dealer.type === "22") return "DEALER_22";
  if (dealer.type === "bust") return "DEALER_BUST";
  if (dealer.type === "bj") return "LOSS";
  if (hand.total > dealer.total) return "WIN";
  if (hand.total < dealer.total) return "LOSS";
  return "PUSH";
}

export function settleSessionRound(session: ShoeSession): RoundSettlement | null {
  const participation = session.participation;
  if (!participation || participation.round !== session.round) return null;
  const actions = session.overrides.filter((row) => row.round === session.round).map((row) => row.chosen);
  const roundEvents = session.events.filter((event) => event.round === session.round);
  const byId = new Map(roundEvents.map((event) => [event.id, event]));
  return settleRound({
    shoeId: session.id,
    round: session.round,
    participation,
    playerEvents: myHandEvents(session),
    dealerEvents: dealerCards(session),
    actions,
    bustIt22Pays: session.bustIt22Pays,
    handFrozen: Boolean(session.frozenHandIds && session.frozenHandIds.length >= 2) || session.hands.some((hand) => hand.frozen),
    insuranceStake: session.insuranceStake,
    hands: session.hands.map((hand) => handPayload(hand, byId)),
  });
}

function handPayload(hand: PlayerHand, byId: Map<string, ShoeEvent>) {
  return {
    index: hand.index,
    events: hand.cardIds.flatMap((id) => {
      const event = byId.get(id);
      return event ? [event] : [];
    }),
    frozen: hand.frozen,
    cash: hand.cash,
    mode: hand.mode,
    naturalOk: hand.naturalOk,
  };
}

export function applyToLedger(ledger: Ledger, entry: RoundSettlement): { ledger: Ledger; applied: boolean } {
  const existing = ledger.entries.find((row) => row.key === entry.key);
  if (existing?.status === "SETTLED") return { ledger, applied: false };
  const entries = existing
    ? ledger.entries.map((row) => (row.key === entry.key ? entry : row))
    : [...ledger.entries, entry];
  if (entry.status !== "SETTLED" || entry.roundNet === null) {
    return { ledger: { ...ledger, entries }, applied: false };
  }
  return {
    applied: true,
    ledger: {
      ...ledger,
      entries,
      bankroll: ledger.bankroll + entry.roundNet,
    },
  };
}

export function rollup(entries: readonly RoundSettlement[]): Rollup {
  const settled = entries.filter((entry) => entry.status === "SETTLED");
  const mainNet = settled.reduce((sum, entry) => sum + (entry.mainNet ?? 0), 0);
  const mainCash = settled.reduce((sum, entry) => sum + entry.mainCash, 0);
  const sideNet = settled.reduce((sum, entry) => sum + (entry.sideNet ?? 0), 0);
  const sideCash = settled.reduce((sum, entry) => sum + entry.sideCash, 0);
  const roundNet = settled.reduce((sum, entry) => sum + (entry.roundNet ?? 0), 0);
  const roundCash = settled.reduce((sum, entry) => sum + entry.roundCash, 0);
  return {
    mainNet,
    mainCash,
    sideNet,
    sideCash,
    roundNet,
    roundCash,
    mainRoi: roi(mainNet, mainCash),
    sideRoi: roi(sideNet, sideCash),
    roundRoi: roi(roundNet, roundCash),
    winning: settled.length === 0 ? null : roundNet > 0,
  };
}

export function shoeRollup(ledger: Ledger, shoeId: string): Rollup {
  return rollup(ledger.entries.filter((entry) => entry.shoeId === shoeId));
}

export function lifetimeRollup(ledger: Ledger): Rollup {
  return rollup(ledger.entries);
}

/** Simulation and autoplay record the same ledger shape. Unit profit is the existing hand result, not a new engine. */
export function settlementFromUnit(input: {
  shoeId: string;
  round: number;
  unitNet: number;
  cashUnits: number;
  recommendation?: string;
}): RoundSettlement {
  const mainNet = input.unitNet;
  const mainCash = input.cashUnits;
  return {
    key: `${input.shoeId}:${input.round}`,
    shoeId: input.shoeId,
    round: input.round,
    recommendation: input.recommendation ?? "PLAY",
    actual: "PLAYED",
    status: "SETTLED",
    pendingReason: null,
    playerTotal: null,
    dealerTotal: null,
    dealerLabel: "simulated",
    mainCash,
    mainNet,
    sideCash: 0,
    sideNet: 0,
    roundCash: mainCash,
    roundNet: mainNet,
    mainRoi: roi(mainNet, mainCash),
    sideRoi: null,
    roundRoi: roi(mainNet, mainCash),
    sides: [],
    outcome: mainNet > 0 ? "WIN" : mainNet < 0 ? "LOSS" : "PUSH",
    hands: [],
    insuranceCash: 0,
    insuranceNet: 0,
  };
}

export function cardIndexOf(rank: FullRank, suit: Suit): number {
  return cardIndex(rank, suit);
}
