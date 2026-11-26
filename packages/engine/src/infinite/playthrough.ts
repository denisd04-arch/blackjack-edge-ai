import { compositionHandEv } from "./composition-ev";
import { insuranceEv, mulberry32 } from "./ev";
import { freshBuckets, freshShoe52, handProfit, valueCards, type DealerKind, type SettledHand, type StakeMode } from "./model";
import { rulesFromFields } from "./rules";
import { applyToLedger, emptyLedger, roi, settlementFromUnit, type Ledger } from "./settlement";
import { classifyDealtHot3, classifyDealtPair, classifyDealtPlus3, PAYTABLE_V2 } from "./side-bets";
function shuffleOrder(seed: number, decks: number): number[] {
  const cards: number[] = [];
  const shoe = freshShoe52(decks);
  for (let i = 0; i < shoe.length; i += 1) {
    for (let n = 0; n < (shoe[i] ?? 0); n += 1) cards.push(i);
  }
  const rng = mulberry32(seed);
  for (let i = cards.length - 1; i > 0; i -= 1) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = cards[i]!;
    cards[i] = cards[j]!;
    cards[j] = tmp;
  }
  return cards;
}

export type StakePlan = "flat" | "always" | "verified-edge" | "kelly" | "side-only" | "main-only";

export interface PlaythroughInput {
  seed: number;
  decks?: number;
  cutDealt?: number;
  maxRounds?: number;
  otherPlayers?: number;
  extraBurns?: number;
  stake?: StakePlan;
  flatStake?: number;
  bankroll?: number;
  sideBets?: boolean;
  /** Same ordered shoe. The policy never receives the undealt tail or the hole. */
  order?: readonly number[];
}

export interface ShoeMetrics {
  seed: number;
  shoes: number;
  rounds: number;
  played: number;
  skipped: number;
  win: number;
  loss: number;
  push: number;
  blackjack: number;
  bust: number;
  dealerBust: number;
  dealer22: number;
  freeDoubles: number;
  freeSplits: number;
  regularDoubles: number;
  splits: number;
  mainNet: number;
  sideNet: number;
  totalNet: number;
  turnover: number;
  cashAtRisk: number;
  roi: number | null;
  averageStake: number | null;
  maxDrawdown: number;
  bankrollPath: number[];
  cardsDealt: number;
  after5: number | null;
  after10: number | null;
  ledger: Ledger;
  /** Backtest output is not a profitability claim while the main model is partially verified. */
  profitableClaim: false;
  policy: "composition";
}

interface LiveHand {
  cards: number[];
  cash: boolean;
  mode: StakeMode;
  aceLock: boolean;
  naturalOk: boolean;
}

const rules = () => rulesFromFields().rules;

function bucket(card: number): number {
  const rank = Math.floor(card / 4);
  return rank >= 9 ? 9 : rank;
}

function remove(counts: Uint8Array, card: number): void {
  const b = bucket(card);
  counts[b] = Math.max(0, (counts[b] ?? 0) - 1);
}

function dealerKind(cards: number[]): DealerKind {
  const value = valueCards(cards);
  if (cards.length === 2 && value.total === 21) return { type: "bj" };
  if (value.total === 22) return { type: "22" };
  if (value.bust || value.total > 21) return { type: "bust" };
  return { type: "total", total: value.total };
}

function playDealer(cards: number[], draw: () => number | undefined, counts: Uint8Array): number[] {
  let value = valueCards(cards);
  if (cards.length === 2 && value.total === 21) return cards;
  while (value.total < 17) {
    const next = draw();
    if (next === undefined) break;
    remove(counts, next);
    cards.push(bucket(next));
    value = valueCards(cards);
  }
  return cards;
}

function actionFor(counts: Uint8Array, cards: number[], up: number): string {
  try {
    return compositionHandEv(counts.slice(), cards, up).action;
  } catch {
    return "STAND";
  }
}

/** Decision from cards already dealt. The ordered tail is not an argument. */
export function visibleAction(counts: Uint8Array, cards: readonly number[], up: number): string {
  return actionFor(counts, [...cards], up);
}

function finishHand(hand: LiveHand, dealer: DealerKind, unit: number): { net: number; cash: number; label: string } {
  const info = valueCards(hand.cards);
  const settled: SettledHand = {
    total: info.total,
    bust: info.bust,
    blackjack: hand.naturalOk && info.blackjack,
    charlie: rules().charlie && info.charlie,
    cash: hand.cash,
    mode: hand.mode,
  };
  const profit = handProfit(settled, dealer);
  const cash = hand.cash ? (hand.mode === "regular-double" ? 2 : 1) * unit : 0;
  let label = "PUSH";
  if (settled.bust) label = "BUST";
  else if (settled.blackjack && dealer.type !== "bj") label = "BLACKJACK";
  else if (dealer.type === "22") label = "DEALER_22";
  else if (dealer.type === "bust") label = "DEALER_BUST";
  else if (profit > 0) label = "WIN";
  else if (profit < 0) label = "LOSS";
  return { net: profit * unit, cash, label };
}

function take(draw: () => number | undefined, counts: Uint8Array, seen: boolean): number | undefined {
  const card = draw();
  if (card === undefined) return undefined;
  if (seen) remove(counts, card);
  return card;
}

function hitOther(cards: number[], draw: () => number | undefined, counts: Uint8Array): void {
  let value = valueCards(cards);
  while (!value.bust && value.total < 17 && cards.length < 6) {
    const card = take(draw, counts, true);
    if (card === undefined) return;
    cards.push(bucket(card));
    value = valueCards(cards);
  }
}

function playUser(
  hand: LiveHand,
  up: number,
  counts: Uint8Array,
  draw: () => number | undefined,
  handCount: number,
  stats: ShoeMetrics
): LiveHand[] {
  const profile = rules();
  while (true) {
    const info = valueCards(hand.cards);
    if (info.bust || (hand.naturalOk && info.blackjack) || (profile.charlie && info.charlie)) return [hand];
    if (hand.aceLock && hand.cards.length >= 2) return [hand];
    if (hand.mode !== "plain") return [hand];
    const action = actionFor(counts, hand.cards, up);
    if (action === "HIT") {
      const card = draw();
      if (card === undefined) return [hand];
      remove(counts, card);
      hand.cards.push(bucket(card));
      continue;
    }
    if (action === "DOUBLE_FREE" || action === "DOUBLE_REGULAR") {
      if (hand.cards.length !== 2 || (handCount > 1 && !profile.doubleAfterSplit) || hand.aceLock) return [hand];
      const card = draw();
      if (card === undefined) return [hand];
      remove(counts, card);
      hand.cards.push(bucket(card));
      hand.mode = action === "DOUBLE_FREE" ? "free-double" : "regular-double";
      if (action === "DOUBLE_FREE") stats.freeDoubles += 1;
      else stats.regularDoubles += 1;
      return [hand];
    }
    if ((action === "SPLIT_FREE" || action === "SPLIT_REGULAR") && hand.cards.length === 2 && hand.cards[0] === hand.cards[1] && handCount < profile.maxHands) {
      const rank = hand.cards[0]!;
      const aces = rank === 0;
      if (aces && handCount > 1 && !profile.resplitAces) return [hand];
      if (handCount > 1 && !profile.resplit) return [hand];
      stats.splits += 1;
      if (action === "SPLIT_FREE") stats.freeSplits += 1;
      const leftCard = draw();
      const rightCard = draw();
      if (leftCard === undefined || rightCard === undefined) return [hand];
      remove(counts, leftCard);
      remove(counts, rightCard);
      const rightCash = action === "SPLIT_REGULAR";
      const left: LiveHand = { cards: [rank, bucket(leftCard)], cash: hand.cash, mode: "plain", aceLock: aces, naturalOk: false };
      const right: LiveHand = { cards: [rank, bucket(rightCard)], cash: rightCash, mode: "plain", aceLock: aces, naturalOk: false };
      return [
        ...playUser(left, up, counts, draw, handCount + 1, stats),
        ...playUser(right, up, counts, draw, handCount + 1, stats),
      ];
    }
    return [hand];
  }
}

function sideNet(a: number, b: number, up: number, dealerCards: number[], unit: number, dealer: DealerKind): number {
  const pair = classifyDealtPair(a, b);
  const plus = classifyDealtPlus3(a, b, up);
  const hot = classifyDealtHot3(a, b, up);
  const pairPay = pair === "lose" ? -1 : PAYTABLE_V2.anyPair[pair];
  const plusPay = plus === "lose" ? -1 : PAYTABLE_V2.twentyOnePlusThree[plus];
  const hotPay = hot === "lose" ? -1 : hot === "seven" ? PAYTABLE_V2.hot3.sevenSevenSeven : hot === "suited21" ? PAYTABLE_V2.hot3.suited21 : hot === "unsuited21" ? PAYTABLE_V2.hot3.unsuited21 : hot === "total20" ? PAYTABLE_V2.hot3.total20 : PAYTABLE_V2.hot3.total19;
  let net = (pairPay + plusPay + hotPay) * unit;
  if (dealer.type === "22") return net;
  if (dealer.type === "bust") {
    const count = dealerCards.length;
    const pay = count >= 8 ? 250 : count === 7 ? 100 : count === 6 ? 50 : count === 5 ? 9 : count === 4 ? 2 : count === 3 ? 1 : -1;
    net += pay * unit;
  } else net -= unit;
  return net;
}

export function playShoeEngine(input: PlaythroughInput): ShoeMetrics {
  const decks = input.decks ?? 8;
  const order = input.order ? [...input.order] : shuffleOrder(input.seed, decks);
  const cut = input.cutDealt ?? 312;
  const unit = input.flatStake ?? 1;
  const plan = input.stake ?? "flat";
  const playMain = plan !== "verified-edge" && plan !== "kelly" && plan !== "side-only";
  let cursor = 0;
  const draw = () => {
    if (cursor >= order.length || cursor >= cut) return undefined;
    const card = order[cursor];
    cursor += 1;
    return card;
  };
  const metrics: ShoeMetrics = {
    seed: input.seed,
    shoes: 1,
    rounds: 0,
    played: 0,
    skipped: 0,
    win: 0,
    loss: 0,
    push: 0,
    blackjack: 0,
    bust: 0,
    dealerBust: 0,
    dealer22: 0,
    freeDoubles: 0,
    freeSplits: 0,
    regularDoubles: 0,
    splits: 0,
    mainNet: 0,
    sideNet: 0,
    totalNet: 0,
    turnover: 0,
    cashAtRisk: 0,
    roi: null,
    averageStake: null,
    maxDrawdown: 0,
    bankrollPath: [input.bankroll ?? 0],
    cardsDealt: 0,
    after5: null,
    after10: null,
    ledger: emptyLedger(input.bankroll ?? 0),
    profitableClaim: false,
    policy: "composition",
  };
  let peak = input.bankroll ?? 0;
  let bankroll = input.bankroll ?? 0;
  while (cursor + 4 < Math.min(order.length, cut) && metrics.rounds < (input.maxRounds ?? 1000)) {
    const counts = freshBuckets(decks);
    for (let i = 0; i < cursor; i += 1) remove(counts, order[i]!);
    const others = input.otherPlayers ?? 0;
    const otherCards: number[][] = [];
    for (let seat = 0; seat < others; seat += 1) {
      const card = take(draw, counts, true);
      if (card === undefined) break;
      otherCards.push([bucket(card)]);
    }
    const c1 = take(draw, counts, true);
    const upCard = take(draw, counts, true);
    if (c1 === undefined || upCard === undefined) break;
    for (const seat of otherCards) {
      const card = take(draw, counts, true);
      if (card === undefined) break;
      seat.push(bucket(card));
    }
    const c2 = take(draw, counts, true);
    const hole = take(draw, counts, false);
    if (c2 === undefined || hole === undefined) break;
    const up = bucket(upCard);
    const opening: LiveHand = { cards: [bucket(c1), bucket(c2)], cash: true, mode: "plain", aceLock: false, naturalOk: true };
    let insurance = 0;
    if (playMain && up === 0) {
      const quote = insuranceEv(counts.slice());
      if (quote.recommendation === "BET") {
        const stake = Math.floor(unit / 2);
        if (stake > 0) insurance = stake;
      }
    }
    const hands = playMain ? playUser(opening, up, counts, draw, 1, metrics) : [opening];
    for (const seat of otherCards) hitOther(seat, draw, counts);
    remove(counts, hole);
    const dealerCards = playDealer([up, bucket(hole)], draw, counts);
    const dealer = dealerKind(dealerCards);
    let main = 0;
    let cash = 0;
    if (playMain) {
      for (const hand of hands) {
        const settled = finishHand(hand, dealer, unit);
        main += settled.net;
        cash += settled.cash;
        if (settled.label === "WIN" || settled.label === "DEALER_BUST") metrics.win += 1;
        else if (settled.label === "LOSS") metrics.loss += 1;
        else if (settled.label === "BUST") metrics.bust += 1;
        else if (settled.label === "BLACKJACK") metrics.blackjack += 1;
        else metrics.push += 1;
      }
      metrics.played += 1;
    } else metrics.skipped += 1;
    if (dealer.type === "bust") metrics.dealerBust += 1;
    if (dealer.type === "22") metrics.dealer22 += 1;
    if (insurance > 0) {
      cash += insurance;
      insurance = dealer.type === "bj" ? insurance * 2 : -insurance;
    }
    const sides = input.sideBets && plan !== "main-only" ? sideNet(c1, c2, upCard, dealerCards, unit, dealer) : 0;
    const sideRecorded = dealer.type === "22" ? 0 : sides;
    metrics.mainNet += main + insurance;
    metrics.sideNet += sideRecorded;
    metrics.totalNet += main + insurance + sideRecorded;
    metrics.turnover += cash + (sideRecorded === 0 ? 0 : unit);
    metrics.cashAtRisk += cash;
    bankroll += main + insurance + sideRecorded;
    metrics.bankrollPath.push(bankroll);
    peak = Math.max(peak, bankroll);
    metrics.maxDrawdown = Math.max(metrics.maxDrawdown, peak - bankroll);
    metrics.rounds += 1;
    if (metrics.rounds === 5) metrics.after5 = metrics.totalNet;
    if (metrics.rounds === 10) metrics.after10 = metrics.totalNet;
    metrics.ledger = applyToLedger(
      metrics.ledger,
      settlementFromUnit({
        shoeId: `sim-${input.seed}`,
        round: metrics.rounds,
        unitNet: main + insurance + sideRecorded,
        cashUnits: playMain ? Math.max(cash, 1) : 0,
        recommendation: playMain ? "PLAY" : "SKIP",
      })
    ).ledger;
    if (!playMain) {
      const last = metrics.ledger.entries[metrics.ledger.entries.length - 1];
      if (last) last.actual = "SKIPPED";
    }
    for (let i = 0; i < (input.extraBurns ?? 0); i += 1) {
      const burned = draw();
      if (burned !== undefined) remove(counts, burned);
    }
  }
  metrics.cardsDealt = cursor;
  metrics.roi = roi(metrics.totalNet, metrics.cashAtRisk);
  metrics.averageStake = metrics.played > 0 ? metrics.cashAtRisk / metrics.played : null;
  return metrics;
}

export function compareStrategies(seed: number, rounds = 2): Record<StakePlan, ShoeMetrics> {
  const plans: StakePlan[] = ["flat", "always", "kelly", "verified-edge", "side-only", "main-only"];
  const order = shuffleOrder(seed, 8);
  const out = {} as Record<StakePlan, ShoeMetrics>;
  for (const stake of plans) {
    out[stake] = playShoeEngine({
      seed,
      order,
      stake,
      maxRounds: rounds,
      sideBets: stake === "side-only" || stake === "flat",
      otherPlayers: 1,
      extraBurns: 0,
    });
  }
  return out;
}
