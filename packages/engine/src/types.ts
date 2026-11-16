/** Evolution variants supported by the product (master spec). */
export type EvolutionGameVariant =
  | "evolution_free_bet"
  | "evolution_infinite_free_bet";

export type CountingSystemId = "hi_lo" | "omega_ii";

/**
 * Tokens for free-split eligibility.
 * "pair" = every non-ten pair (A, 2–9). "10" = ten-value pairs (not free on Evolution).
 * "11" is not a rank and is never a valid token.
 */
export type FreeSplitToken = "8" | "9" | "10" | "pair";

/** Hard totals only. "soft" would free-double every soft hand and is not an Evolution rule. */
export type FreeDoubleToken = "9" | "10" | "11";

/** Rule fields that must be confirmed before definitive EV is allowed. */
export interface RuleProfileFields {
  decks: number | null;
  /** Cut-card depth. Null does not block a decision EV given the current shoe. */
  penetration: number | null;
  dealerHitsSoft17: boolean | null;
  doubleAfterSplit: boolean | null;
  resplitAces: boolean | null;
  freeSplitOn: readonly FreeSplitToken[] | null;
  freeDoubleOn: readonly FreeDoubleToken[] | null;
  pushOn22: boolean | null;
  /** True only for Infinite (shared initial cards). Not "every action is free". */
  infiniteFreeActions: boolean | null;
  /** Six cards totaling 21 or less win even money. False when a full rulesheet omits it. */
  charlieSixCard: boolean | null;
  /** Max splits from the original hand. 1 = no resplit. */
  maxSplitsPerHand: number | null;
  /** Dealer checks for blackjack before the player acts. */
  dealerPeeksForBlackjack: boolean | null;
  /** Citation keys. Not a rule value. */
  ruleSourceIds?: readonly string[];
}

export interface GameProfile {
  id: string;
  variant: EvolutionGameVariant;
  labelDe: string;
  rules: RuleProfileFields;
  countingSystems: CountingSystemId[];
  /** When true, engine must not emit definitive EV or strategy advice for affected hands. */
  incomplete: boolean;
  missingFields: (keyof RuleProfileFields)[];
  updatedAt: string;
}

export interface EngineHealth {
  ready: boolean;
  messageDe: string;
}

/** Phase 4+ contract: all math flows through implementors of this interface. */
export interface BlackjackMathEngine {
  readonly profile: GameProfile;
  health(): EngineHealth;
}
