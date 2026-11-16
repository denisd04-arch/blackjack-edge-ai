import { CARD_RANKS, type CardRank } from "./cards";
import { evaluateHand, handCacheKey, isPair } from "./hand";
import type { ResolvedBlackjackRules } from "./blackjack-rules";
import { freeDoubleEligible } from "./evolution/free-bet-rules";
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
}

interface PlayContext {
  rules: ResolvedBlackjackRules;
  dealerUp: CardRank;
  dealerMemo: Map<string, PayoffDistribution>;
  playerMemo: Map<string, OutcomeStats>;
}

function comparePayoff(
  player: ReturnType<typeof evaluateHand>,
  playerCards: readonly CardRank[],
  terminalKey: string,
  rules: ResolvedBlackjackRules
): number {
  const terminal = parseTerminalKey(terminalKey);
  if (!terminal) return 0;
  if (player.bust) return -1;
  if (
    rules.charlieSixCard &&
    playerCards.length >= 6 &&
    !player.bust &&
    player.total <= 21
  ) {
    return 1;
  }
  if (terminal.kind === "bust") return 1;
  if (player.blackjack && terminal.kind === "stand") {
    return rules.blackjackPayout;
  }
  if (rules.pushOn22 && terminal.kind === "stand" && terminal.total === 22) {
    return 0;
  }
  if (player.total > terminal.total) return 1;
  if (player.total < terminal.total) return -1;
  return 0;
}

function statsFromDistribution(
  payoffs: { payoff: number; prob: number }[]
): OutcomeStats {
  let ev = 0;
  let ex2 = 0;
  let win = 0;
  let push = 0;
  let loss = 0;
  for (const { payoff, prob } of payoffs) {
    ev += prob * payoff;
    ex2 += prob * payoff * payoff;
    if (payoff > 0) win += prob;
    else if (payoff === 0) push += prob;
    else loss += prob;
  }
  const variance = Math.max(0, ex2 - ev * ev);
  return {
    ev: round4(ev),
    variance: round4(variance),
    winPct: round4(win * 100),
    pushPct: round4(push * 100),
    lossPct: round4(loss * 100),
  };
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** Free double: one unit at risk; wins pay like a full double, losses cost one unit. */
function scaleFreeDoubleUnitPayoff(standUnitEv: number): number {
  if (standUnitEv > 0) return 2 * standUnitEv;
  if (standUnitEv === 0) return 0;
  return -1;
}

export function standOutcomeStats(
  playerCards: readonly CardRank[],
  inventory: RankInventory,
  ctx: PlayContext
): OutcomeStats {
  const player = evaluateHand(playerCards);
  if (player.bust) {
    return {
      ev: -1,
      variance: 0,
      winPct: 0,
      pushPct: 0,
      lossPct: 100,
    };
  }

  const { dealer } = dealerDistributionWithUpcard(
    ctx.dealerUp,
    inventory,
    ctx.rules,
    ctx.dealerMemo
  );

  const payoffs: { payoff: number; prob: number }[] = [];
  for (const [k, prob] of dealer) {
    payoffs.push({
      payoff: comparePayoff(player, playerCards, k, ctx.rules),
      prob,
    });
  }
  return statsFromDistribution(payoffs);
}

export function optimalPlayStats(
  playerCards: readonly CardRank[],
  inventory: RankInventory,
  ctx: PlayContext,
  options: {
    canDouble: boolean;
    canSplit: boolean;
    isSplitHand: boolean;
  }
): OutcomeStats & { bestAction: PlayerAction } {
  const memoKey = `${handCacheKey(playerCards)}|${inventoryKey(inventory)}|d${options.canDouble ? 1 : 0}s${options.canSplit ? 1 : 0}h${options.isSplitHand ? 1 : 0}`;
  const hit = ctx.playerMemo.get(memoKey);
  if (hit) return hit as OutcomeStats & { bestAction: PlayerAction };

  const totals = evaluateHand(playerCards);
  if (totals.bust) {
    const bust = {
      ...statsFromDistribution([{ payoff: -1, prob: 1 }]),
      bestAction: "stand" as const,
    };
    ctx.playerMemo.set(memoKey, bust);
    return bust;
  }

  const stand = standOutcomeStats(playerCards, inventory, ctx);

  const candidates: { action: PlayerAction; stats: OutcomeStats }[] = [
    { action: "stand", stats: stand },
  ];

  if (totals.total < 21) {
    const hitStats = hitOutcomeStats(playerCards, inventory, ctx, options);
    candidates.push({ action: "hit", stats: hitStats });
  }

  if (
    options.canDouble &&
    playerCards.length === 2 &&
    !options.isSplitHand
  ) {
    candidates.push({
      action: "double",
      stats: doubleOutcomeStats(playerCards, inventory, ctx, options),
    });
  }

  if (
    options.canSplit &&
    isPair(playerCards) &&
    playerCards.length === 2 &&
    !options.isSplitHand
  ) {
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
  options: { canDouble: boolean; canSplit: boolean; isSplitHand: boolean }
): OutcomeStats {
  const payoffs: { payoff: number; prob: number }[] = [];
  const total = inventoryTotal(inventory);
  if (total <= 0) return standOutcomeStats(playerCards, inventory, ctx);

  for (const rank of CARD_RANKS) {
    if (inventory[rank] <= 0) continue;
    const p = drawProbability(inventory, rank);
    const nextInv = removeCard(inventory, rank)!;
    const nextHand = [...playerCards, rank];
    const sub = optimalPlayStats(nextHand, nextInv, ctx, {
      ...options,
      canDouble: false,
      canSplit:
        options.canSplit &&
        ctx.rules.doubleAfterSplit &&
        isPair(nextHand) &&
        nextHand.length === 2,
    });
    payoffs.push({ payoff: sub.ev, prob: p });
  }
  return statsFromDistribution(payoffs);
}

function doubleOutcomeStats(
  playerCards: readonly CardRank[],
  inventory: RankInventory,
  ctx: PlayContext,
  options: { isSplitHand: boolean }
): OutcomeStats {
  const payoffs: { payoff: number; prob: number }[] = [];
  const total = inventoryTotal(inventory);
  if (total <= 0) {
    const z = statsFromDistribution([{ payoff: 0, prob: 1 }]);
    return { ...z, ev: z.ev * 2, variance: z.variance * 4 };
  }

  for (const rank of CARD_RANKS) {
    if (inventory[rank] <= 0) continue;
    const p = drawProbability(inventory, rank);
    const nextInv = removeCard(inventory, rank)!;
    const nextHand = [...playerCards, rank];
    const stand = standOutcomeStats(nextHand, nextInv, ctx);
    const unitPayoff =
      freeDoubleEligible(playerCards, ctx.rules.freeDoubleOn) &&
      playerCards.length === 2
        ? scaleFreeDoubleUnitPayoff(stand.ev)
        : 2 * stand.ev;
    payoffs.push({ payoff: unitPayoff, prob: p });
  }
  const base = statsFromDistribution(payoffs);
  return base;
}

function splitOutcomeStats(
  playerCards: readonly CardRank[],
  inventory: RankInventory,
  ctx: PlayContext
): OutcomeStats {
  const rank = playerCards[0];
  const baseInv = removeCards(inventory, playerCards);
  if (!baseInv || rank === undefined) {
    return statsFromDistribution([{ payoff: -2, prob: 1 }]);
  }

  const payoffs: { payoff: number; prob: number }[] = [];
  const total = inventoryTotal(baseInv);
  if (total < 2) return statsFromDistribution([{ payoff: 0, prob: 1 }]);

  for (const r1 of CARD_RANKS) {
    if (baseInv[r1] <= 0) continue;
    const p1 = baseInv[r1] / total;
    const inv1 = removeCard(baseInv, r1)!;
    const restTotal = inventoryTotal(inv1);
    for (const r2 of CARD_RANKS) {
      if (inv1[r2] <= 0) continue;
      const p2 = inv1[r2] / restTotal;
      const inv2 = removeCard(inv1, r2)!;
      const h1 = optimalPlayStats([rank, r1], inv2, ctx, {
        canDouble: ctx.rules.doubleAfterSplit,
        canSplit: false,
        isSplitHand: true,
      });
      const h2 = optimalPlayStats([rank, r2], inv2, ctx, {
        canDouble: ctx.rules.doubleAfterSplit,
        canSplit: false,
        isSplitHand: true,
      });
      payoffs.push({ payoff: h1.ev + h2.ev, prob: p1 * p2 });
    }
  }
  return statsFromDistribution(payoffs);
}

export function createPlayContext(
  dealerUp: CardRank,
  rules: ResolvedBlackjackRules
): PlayContext {
  return {
    rules,
    dealerUp,
    dealerMemo: new Map(),
    playerMemo: new Map(),
  };
}

/** Inventory after removing visible player cards and dealer upcard. */
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
  const n = removeCard(inv, dealerUp);
  return n;
}

export function actionBreakdown(
  playerCards: readonly CardRank[],
  inventory: RankInventory,
  ctx: PlayContext
): Record<PlayerAction, OutcomeStats & { available: boolean }> {
  const optimal = optimalPlayStats(playerCards, inventory, ctx, {
    canDouble: true,
    canSplit: true,
    isSplitHand: false,
  });

  const stand = standOutcomeStats(playerCards, inventory, ctx);
  const hit =
    evaluateHand(playerCards).total < 21
      ? hitOutcomeStats(playerCards, inventory, ctx, {
          canDouble: true,
          canSplit: true,
          isSplitHand: false,
        })
      : stand;

  const dbl =
    playerCards.length === 2
      ? doubleOutcomeStats(playerCards, inventory, ctx, { isSplitHand: false })
      : { ...stand, ev: stand.ev };

  const spl = isPair(playerCards)
    ? splitOutcomeStats(playerCards, inventory, ctx)
    : stand;

  return {
    stand: { ...stand, available: true },
    hit: {
      ...hit,
      available: evaluateHand(playerCards).total < 21,
    },
    double: {
      ...dbl,
      available: playerCards.length === 2,
    },
    split: {
      ...spl,
      available: isPair(playerCards) && playerCards.length === 2,
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