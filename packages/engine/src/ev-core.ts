import { CARD_RANKS, type CardRank } from "./cards";
import {
  evaluateHand,
  handCacheKey,
  holeMakesBlackjack,
  isEqualValuePair,
  isTenValue,
  type HandTotals,
} from "./hand";
import type { ResolvedBlackjackRules } from "./blackjack-rules";
import {
  freeDoubleEligible,
  freeSplitEligible,
  mapFreeDoubleProfit,
  mapFreeSplitSideProfit,
} from "./evolution/free-bet-rules";
import {
  dealerDistributionWithUpcard,
  parseTerminalKey,
  type PayoffDistribution,
} from "./dealer-outcomes";
import {
  cloneInventory,
  drawProbability,
  inventoryKey,
  inventoryTotal,
  removeCard,
  removeCards,
} from "./inventory-math";
import type { RankInventory } from "./shoe";

export type PlayerAction = "stand" | "hit" | "double" | "split";

export interface OutcomeStats {
  ev: number;
  variance: number;
  winPct: number;
  pushPct: number;
  lossPct: number;
  /** Largest loss in the profit distribution (original-bet units). */
  maxLoss: number;
}

interface DistStats extends OutcomeStats {
  dist: Map<number, number>;
}

interface PlayContext {
  rules: ResolvedBlackjackRules;
  dealerUp: CardRank;
  dealerMemo: Map<string, PayoffDistribution>;
  playerMemo: Map<string, DistStats & { bestAction: PlayerAction }>;
  fromSplit: boolean;
  /** Drop dealer-blackjack mass and renormalize (caller mixes the peek loss). */
  ignoreDealerBlackjack: boolean;
}

interface PlayOptions {
  canDouble: boolean;
  canSplit: boolean;
  isSplitHand: boolean;
}

export function settleUnitProfit(
  player: HandTotals,
  playerCardCount: number,
  terminalKey: string,
  rules: ResolvedBlackjackRules,
  fromSplit: boolean
): number {
  const terminal = parseTerminalKey(terminalKey);
  if (!terminal) return 0;
  const natural =
    player.blackjack && !fromSplit && playerCardCount === 2;
  if (terminal.kind === "blackjack") {
    return natural ? 0 : -1;
  }
  if (player.bust) return -1;
  if (
    rules.pushOn22 &&
    terminal.kind === "stand" &&
    terminal.total === 22
  ) {
    return natural ? rules.blackjackPayout : 0;
  }
  if (
    rules.charlieSixCard &&
    playerCardCount >= 6 &&
    !player.bust &&
    player.total <= 21
  ) {
    return 1;
  }
  if (terminal.kind === "bust") {
    return natural ? rules.blackjackPayout : 1;
  }
  if (natural) return rules.blackjackPayout;
  if (terminal.kind !== "stand") return 0;
  if (player.total > terminal.total) return 1;
  if (player.total < terminal.total) return -1;
  return 0;
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

function addMass(
  dist: Map<number, number>,
  payoff: number,
  prob: number
): void {
  if (prob === 0) return;
  const key = round4(payoff);
  dist.set(key, (dist.get(key) ?? 0) + prob);
}

function pointMass(payoff: number): DistStats {
  const dist = new Map<number, number>([[round4(payoff), 1]]);
  return statsFromDist(dist);
}

function statsFromDist(dist: Map<number, number>): DistStats {
  let ev = 0;
  let ex2 = 0;
  let win = 0;
  let push = 0;
  let loss = 0;
  let maxLoss = 0;
  for (const [payoff, prob] of dist) {
    ev += prob * payoff;
    ex2 += prob * payoff * payoff;
    if (payoff > 0) win += prob;
    else if (payoff === 0) push += prob;
    else {
      loss += prob;
      maxLoss = Math.max(maxLoss, -payoff);
    }
  }
  return {
    dist,
    ev: round4(ev),
    variance: round4(Math.max(0, ex2 - ev * ev)),
    winPct: round4(win * 100),
    pushPct: round4(push * 100),
    lossPct: round4(loss * 100),
    maxLoss: round4(maxLoss),
  };
}

function mapDist(
  dist: Map<number, number>,
  fn: (payoff: number) => number
): Map<number, number> {
  const out = new Map<number, number>();
  for (const [payoff, prob] of dist) addMass(out, fn(payoff), prob);
  return out;
}

function convolve(
  a: Map<number, number>,
  b: Map<number, number>
): Map<number, number> {
  const out = new Map<number, number>();
  for (const [pa, prA] of a) {
    for (const [pb, prB] of b) addMass(out, pa + pb, prA * prB);
  }
  return out;
}

function mixDist(
  parts: { dist: Map<number, number>; prob: number }[]
): DistStats {
  const out = new Map<number, number>();
  for (const part of parts) {
    for (const [payoff, prob] of part.dist) {
      addMass(out, payoff, part.prob * prob);
    }
  }
  return statsFromDist(out);
}

function standRows(
  playerCards: readonly CardRank[],
  inventory: RankInventory,
  ctx: PlayContext
): { payoff: number; prob: number; dealerBlackjack: boolean }[] {
  const player = evaluateHand(playerCards);
  if (player.bust) return [{ payoff: -1, prob: 1, dealerBlackjack: false }];

  const { dealer } = dealerDistributionWithUpcard(
    ctx.dealerUp,
    inventory,
    ctx.rules,
    ctx.dealerMemo
  );
  const rows: { payoff: number; prob: number; dealerBlackjack: boolean }[] =
    [];
  let bj = 0;
  for (const [key, prob] of dealer) {
    if (ctx.ignoreDealerBlackjack && key === "bj") {
      bj += prob;
      continue;
    }
    rows.push({
      payoff: settleUnitProfit(
        player,
        playerCards.length,
        key,
        ctx.rules,
        ctx.fromSplit
      ),
      prob,
      dealerBlackjack: key === "bj",
    });
  }
  if (ctx.ignoreDealerBlackjack && bj > 0 && bj < 1) {
    const scale = 1 / (1 - bj);
    for (const row of rows) row.prob *= scale;
  }
  return rows;
}

function distFromRows(
  rows: { payoff: number; prob: number }[]
): DistStats {
  const dist = new Map<number, number>();
  for (const row of rows) addMass(dist, row.payoff, row.prob);
  if (dist.size === 0) return pointMass(0);
  return statsFromDist(dist);
}

export function standOutcomeStats(
  playerCards: readonly CardRank[],
  inventory: RankInventory,
  ctx: PlayContext
): DistStats {
  return distFromRows(standRows(playerCards, inventory, ctx));
}

function dealerBjProbability(
  inventory: RankInventory,
  ctx: PlayContext
): number {
  if (!ctx.rules.dealerPeeksForBlackjack) return 0;
  if (ctx.dealerUp !== "A" && !isTenValue(ctx.dealerUp)) return 0;
  const { dealer } = dealerDistributionWithUpcard(
    ctx.dealerUp,
    inventory,
    ctx.rules,
    ctx.dealerMemo
  );
  return dealer.get("bj") ?? 0;
}

export function optimalPlayStats(
  playerCards: readonly CardRank[],
  inventory: RankInventory,
  ctx: PlayContext,
  options: PlayOptions
): DistStats & { bestAction: PlayerAction } {
  const memoKey = `${handCacheKey(playerCards)}|${inventoryKey(inventory)}|d${options.canDouble ? 1 : 0}s${options.canSplit ? 1 : 0}h${options.isSplitHand ? 1 : 0}f${ctx.fromSplit ? 1 : 0}j${ctx.ignoreDealerBlackjack ? 1 : 0}`;
  const cached = ctx.playerMemo.get(memoKey);
  if (cached) return cached;

  const totals = evaluateHand(playerCards);
  const natural =
    totals.blackjack && !ctx.fromSplit && playerCards.length === 2;
  const splitAce =
    options.isSplitHand &&
    playerCards.length === 2 &&
    playerCards[0] === "A";

  if (totals.bust || natural || splitAce || playerCards.length >= 6 || totals.total >= 21) {
    const stand = standOutcomeStats(playerCards, inventory, ctx);
    const locked = { ...stand, bestAction: "stand" as const };
    ctx.playerMemo.set(memoKey, locked);
    return locked;
  }

  const stand = standOutcomeStats(playerCards, inventory, ctx);
  const candidates: {
    action: PlayerAction;
    stats: DistStats;
  }[] = [{ action: "stand", stats: stand }];

  const hitStats = hitOutcomeStats(playerCards, inventory, ctx, options);
  candidates.push({ action: "hit", stats: hitStats });

  const canDouble =
    options.canDouble &&
    playerCards.length === 2 &&
    (!options.isSplitHand || ctx.rules.doubleAfterSplit === true);
  if (canDouble) {
    candidates.push({
      action: "double",
      stats: doubleOutcomeStats(playerCards, inventory, ctx),
    });
  }

  const canSplit =
    options.canSplit &&
    !options.isSplitHand &&
    playerCards.length === 2 &&
    isEqualValuePair(playerCards) &&
    ctx.rules.allowSplit &&
    (ctx.rules.maxSplitsPerHand ?? 0) >= 1;
  if (canSplit) {
    candidates.push({
      action: "split",
      stats: splitOutcomeStats(playerCards, inventory, ctx),
    });
  }

  let best = candidates[0];
  for (const c of candidates.slice(1)) {
    if (c.stats.ev > best.stats.ev + 1e-9) best = c;
  }
  const result = { ...best.stats, bestAction: best.action };
  ctx.playerMemo.set(memoKey, result);
  return result;
}

function hitOutcomeStats(
  playerCards: readonly CardRank[],
  inventory: RankInventory,
  ctx: PlayContext,
  options: PlayOptions
): DistStats {
  const total = inventoryTotal(inventory);
  if (total <= 0) return standOutcomeStats(playerCards, inventory, ctx);

  const parts: { dist: Map<number, number>; prob: number }[] = [];
  for (const rank of CARD_RANKS) {
    if (inventory[rank] <= 0) continue;
    const p = drawProbability(inventory, rank);
    const nextInv = removeCard(inventory, rank)!;
    const nextHand = [...playerCards, rank];
    const sub = optimalPlayStats(nextHand, nextInv, ctx, {
      canDouble: false,
      canSplit: false,
      isSplitHand: options.isSplitHand,
    });
    parts.push({ dist: sub.dist, prob: p });
  }
  return mixDist(parts);
}

function doubleOutcomeStats(
  playerCards: readonly CardRank[],
  inventory: RankInventory,
  ctx: PlayContext
): DistStats {
  const total = inventoryTotal(inventory);
  if (total <= 0) return pointMass(0);
  const free = freeDoubleEligible(playerCards, ctx.rules.freeDoubleOn);
  const dist = new Map<number, number>();

  for (const rank of CARD_RANKS) {
    if (inventory[rank] <= 0) continue;
    const p = drawProbability(inventory, rank);
    const nextInv = removeCard(inventory, rank)!;
    const nextHand = [...playerCards, rank];
    for (const row of standRows(nextHand, nextInv, ctx)) {
      let payoff: number;
      if (row.dealerBlackjack && ctx.rules.dealerPeeksForBlackjack) {
        payoff = -1;
      } else if (free) {
        payoff = mapFreeDoubleProfit(row.payoff);
      } else {
        payoff = 2 * row.payoff;
      }
      addMass(dist, payoff, p * row.prob);
    }
  }
  return statsFromDist(dist);
}

function finishSplitHand(
  rank: CardRank,
  card: CardRank,
  inventory: RankInventory,
  ctx: PlayContext
): DistStats {
  const hand: CardRank[] = [rank, card];
  if (rank === "A") return standOutcomeStats(hand, inventory, ctx);
  return optimalPlayStats(hand, inventory, ctx, {
    canDouble: ctx.rules.doubleAfterSplit === true,
    canSplit: false,
    isSplitHand: true,
  });
}

function splitOutcomeStats(
  playerCards: readonly CardRank[],
  inventory: RankInventory,
  ctx: PlayContext
): DistStats {
  const splitKey = `split|${handCacheKey(playerCards)}|${inventoryKey(inventory)}|${ctx.fromSplit ? 1 : 0}|${ctx.ignoreDealerBlackjack ? 1 : 0}`;
  const splitCached = ctx.playerMemo.get(splitKey);
  if (splitCached) return splitCached;

  const rank = playerCards[0];
  const baseInv = removeCards(inventory, playerCards);
  if (!baseInv || rank === undefined) return pointMass(-2);

  const free = freeSplitEligible(playerCards, ctx.rules.freeSplitOn);
  const pBj = dealerBjProbability(baseInv, ctx);
  const handCtx: PlayContext =
    pBj > 0 ? { ...ctx, fromSplit: true, ignoreDealerBlackjack: true } : { ...ctx, fromSplit: true };

  const total = inventoryTotal(baseInv);
  if (total < 2) return pointMass(0);

  const parts: { dist: Map<number, number>; prob: number }[] = [];
  for (const r1 of CARD_RANKS) {
    if (baseInv[r1] <= 0) continue;
    const p1 = baseInv[r1] / total;
    const inv1 = removeCard(baseInv, r1)!;
    const restTotal = inventoryTotal(inv1);
    for (const r2 of CARD_RANKS) {
      if (inv1[r2] <= 0) continue;
      const p2 = inv1[r2] / restTotal;
      const inv2 = removeCard(inv1, r2)!;
      const h1 = finishSplitHand(rank, r1, inv2, handCtx);
      const h2 = finishSplitHand(rank, r2, inv2, handCtx);
      const h2dist = free
        ? mapDist(h2.dist, mapFreeSplitSideProfit)
        : h2.dist;
      parts.push({ dist: convolve(h1.dist, h2dist), prob: p1 * p2 });
    }
  }
  const conditional = mixDist(parts);
  const result =
    pBj <= 0
      ? conditional
      : mixDist([
          { dist: new Map([[-1, 1]]), prob: pBj },
          { dist: conditional.dist, prob: 1 - pBj },
        ]);
  ctx.playerMemo.set(splitKey, { ...result, bestAction: "split" });
  return result;
}

export function createPlayContext(
  dealerUp: CardRank,
  rules: ResolvedBlackjackRules,
  extras?: { fromSplit?: boolean }
): PlayContext {
  return {
    rules,
    dealerUp,
    dealerMemo: new Map(),
    playerMemo: new Map(),
    fromSplit: extras?.fromSplit === true,
    ignoreDealerBlackjack: false,
  };
}

/** Inventory after removing visible player cards and the dealer upcard. */
export function analysisInventory(
  shoe: RankInventory,
  playerCards: readonly CardRank[],
  dealerUp: CardRank
): RankInventory | null {
  let inv = cloneInventory(shoe);
  for (const c of playerCards) {
    const n = removeCard(inv, c);
    if (!n) return null;
    inv = n;
  }
  return removeCard(inv, dealerUp);
}

/**
 * Live shoes already exclude dealt cards. Put the visible hand back so
 * `analysisInventory` removes it once.
 */
export function shoeIncludingVisible(
  remainingExcludingVisible: RankInventory,
  visible: readonly CardRank[]
): RankInventory {
  const inv = cloneInventory(remainingExcludingVisible);
  for (const card of visible) inv[card] += 1;
  return inv;
}

export function actionBreakdown(
  playerCards: readonly CardRank[],
  inventory: RankInventory,
  ctx: PlayContext
): Record<PlayerAction, DistStats & { available: boolean }> {
  const totals = evaluateHand(playerCards);
  const stand = standOutcomeStats(playerCards, inventory, ctx);
  const canAct = !totals.bust && !totals.blackjack && totals.total < 21;
  const hit = canAct
    ? hitOutcomeStats(playerCards, inventory, ctx, {
        canDouble: true,
        canSplit: true,
        isSplitHand: false,
      })
    : stand;
  const dbl =
    playerCards.length === 2 && canAct
      ? doubleOutcomeStats(playerCards, inventory, ctx)
      : stand;
  const spl =
    isEqualValuePair(playerCards) && ctx.rules.allowSplit
      ? splitOutcomeStats(playerCards, inventory, ctx)
      : stand;

  return {
    stand: { ...stand, available: true },
    hit: { ...hit, available: canAct },
    double: {
      ...dbl,
      available: playerCards.length === 2 && canAct,
    },
    split: {
      ...spl,
      available:
        isEqualValuePair(playerCards) &&
        playerCards.length === 2 &&
        ctx.rules.allowSplit,
    },
  };
}

export function dealerMeta(
  inventory: RankInventory,
  dealerUp: CardRank,
  rules: ResolvedBlackjackRules,
  memo: Map<string, PayoffDistribution>
) {
  return dealerDistributionWithUpcard(dealerUp, inventory, rules, memo);
}

export function dealerBlackjackProbability(
  upcard: CardRank,
  unseenAfterUpcard: RankInventory
): number {
  if (!holeMakesBlackjack(upcard, "A") && upcard !== "A" && !isTenValue(upcard)) {
    return 0;
  }
  const total = inventoryTotal(unseenAfterUpcard);
  if (total <= 0) return 0;
  if (upcard === "A") {
    const tens =
      unseenAfterUpcard["10"] +
      unseenAfterUpcard.J +
      unseenAfterUpcard.Q +
      unseenAfterUpcard.K;
    return tens / total;
  }
  if (isTenValue(upcard)) return unseenAfterUpcard.A / total;
  return 0;
}
