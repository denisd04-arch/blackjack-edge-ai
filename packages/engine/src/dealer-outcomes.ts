import { CARD_RANKS, type CardRank } from "./cards";
import { evaluateHand, handCacheKey } from "./hand";
import type { ResolvedBlackjackRules } from "./blackjack-rules";
import {
  drawProbability,
  inventoryKey,
  inventoryTotal,
  removeCard,
} from "./inventory-math";
import type { RankInventory } from "./shoe";

export type DealerTerminal =
  | { kind: "bust" }
  | { kind: "stand"; total: number; soft: boolean };

export type PayoffDistribution = Map<string, number>;

function terminalKey(t: DealerTerminal): string {
  if (t.kind === "bust") return "bust";
  return `s:${t.total}:${t.soft ? 1 : 0}`;
}

function mergeDist(
  into: PayoffDistribution,
  key: string,
  prob: number
): void {
  into.set(key, (into.get(key) ?? 0) + prob);
}

function shouldDealerHit(
  totals: ReturnType<typeof evaluateHand>,
  rules: ResolvedBlackjackRules
): boolean {
  if (totals.bust) return false;
  if (totals.total < 17) return true;
  if (totals.total === 17 && totals.soft && rules.dealerHitsSoft17) return true;
  return false;
}

export function dealerDistributionKnownHole(
  dealerCards: readonly CardRank[],
  inventory: RankInventory,
  rules: ResolvedBlackjackRules,
  memo: Map<string, PayoffDistribution>
): PayoffDistribution {
  const key = `${handCacheKey(dealerCards)}|${inventoryKey(inventory)}`;
  const cached = memo.get(key);
  if (cached) return cached;

  const totals = evaluateHand(dealerCards);
  const out: PayoffDistribution = new Map();

  if (totals.bust) {
    out.set(terminalKey({ kind: "bust" }), 1);
    memo.set(key, out);
    return out;
  }

  if (!shouldDealerHit(totals, rules)) {
    out.set(
      terminalKey({
        kind: "stand",
        total: totals.total,
        soft: totals.soft,
      }),
      1
    );
    memo.set(key, out);
    return out;
  }

  const totalCards = inventoryTotal(inventory);
  if (totalCards <= 0) {
    out.set(
      terminalKey({
        kind: "stand",
        total: totals.total,
        soft: totals.soft,
      }),
      1
    );
    memo.set(key, out);
    return out;
  }

  for (const rank of CARD_RANKS) {
    if (inventory[rank] <= 0) continue;
    const p = drawProbability(inventory, rank);
    const nextInv = removeCard(inventory, rank)!;
    const sub = dealerDistributionKnownHole(
      [...dealerCards, rank],
      nextInv,
      rules,
      memo
    );
    for (const [k, pr] of sub) {
      mergeDist(out, k, p * pr);
    }
  }

  memo.set(key, out);
  return out;
}

/** Hole card unknown: mixture over each possible hole. */
export function dealerDistributionWithUpcard(
  upcard: CardRank,
  inventory: RankInventory,
  rules: ResolvedBlackjackRules,
  memo: Map<string, PayoffDistribution>
): { dealer: PayoffDistribution; bustPct: number; push22Pct: number } {
  const inv = removeCard(inventory, upcard);
  if (!inv) {
    return { dealer: new Map(), bustPct: 0, push22Pct: 0 };
  }

  const combined: PayoffDistribution = new Map();
  let bustPct = 0;
  let push22Pct = 0;
  const total = inventoryTotal(inv);

  for (const rank of CARD_RANKS) {
    if (inv[rank] <= 0) continue;
    const pHole = inv[rank] / total;
    const afterHole = removeCard(inv, rank)!;
    const sub = dealerDistributionKnownHole(
      [upcard, rank],
      afterHole,
      rules,
      memo
    );
    for (const [k, pr] of sub) {
      const prob = pHole * pr;
      mergeDist(combined, k, prob);
      if (k === "bust") bustPct += prob;
      if (k === "s:22:0" || k === "s:22:1") push22Pct += prob;
    }
  }

  return { dealer: combined, bustPct, push22Pct };
}

export function parseTerminalKey(key: string): DealerTerminal | null {
  if (key === "bust") return { kind: "bust" };
  const m = /^s:(\d+):([01])$/.exec(key);
  if (!m) return null;
  return {
    kind: "stand",
    total: Number(m[1]),
    soft: m[2] === "1",
  };
}