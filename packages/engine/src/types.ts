/** Evolution variants supported by the product (master spec). */
export type EvolutionGameVariant =
  | "evolution_free_bet"
  | "evolution_infinite_free_bet";

export type CountingSystemId = "hi_lo" | "omega_ii";

/** Rule fields that must be confirmed before definitive EV is allowed. */
export interface RuleProfileFields {
  decks: number | null;
  penetration: number | null;
  dealerHitsSoft17: boolean | null;
  doubleAfterSplit: boolean | null;
  resplitAces: boolean | null;
  freeSplitOn: readonly ("8" | "9" | "10" | "11" | "pair")[] | null;
  freeDoubleOn: readonly ("9" | "10" | "11" | "soft")[] | null;
  pushOn22: boolean | null;
  infiniteFreeActions: boolean | null;
}

export interface GameProfile {
  id: string;
  variant: EvolutionGameVariant;
  labelDe: string;
  rules: RuleProfileFields;
  countingSystems: CountingSystemId[];
  /** When true, engine must not emit definitive EV or strategy advice. */
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