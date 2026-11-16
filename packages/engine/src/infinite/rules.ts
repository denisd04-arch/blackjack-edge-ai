export const RULE_PROFILE_ID = "EVOLUTION_INFINITE_FREE_BET";
export const RULE_PROFILE_VERSION = "2026-11-16.1";

export type RuleStatus =
  | "VERIFIED"
  | "USER_CONFIRMED"
  | "PARTIALLY_VERIFIED"
  | "UNVERIFIED"
  | "MISSING"
  | "CONFLICTING";

export interface RuleField<T> {
  id: string;
  label: string;
  value: T | null;
  source: string;
  status: RuleStatus;
  date: string;
  version: string;
  /** When set, the engine uses this instead of `value`. */
  override: T | null;
  explanation: string;
  critical: boolean;
}

export interface InfiniteRules {
  decks: number;
  dealerStandsSoft17: boolean;
  blackjackPayout: number;
  winPayout: number;
  insurancePayout: number;
  freeDoubleHard: readonly number[];
  regularDoubleHard: readonly number[];
  freeSplitExceptTens: boolean;
  regularSplitTens: boolean;
  resplit: boolean;
  maxHands: number;
  doubleAfterSplit: boolean;
  splitAcesOneCard: boolean;
  resplitAces: boolean;
  surrender: boolean;
  pushOn22: boolean;
  blackjackBeats22: boolean;
  bustLoses: boolean;
  charlie: boolean;
  dealerPeeks: boolean;
}

export const RULE_DATE = "2026-11-16";

export const INFINITE_RULE_FIELDS: readonly RuleField<unknown>[] = [
  {
    id: "decks",
    label: "Decks",
    value: 8,
    source: "Evolution Infinite Free Bet PDF / product page",
    status: "VERIFIED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation: "Eight decks, 416 cards.",
    critical: true,
  },
  {
    id: "dealerStandsSoft17",
    label: "Dealer stands on soft 17",
    value: true,
    source: "Evolution Infinite Free Bet PDF",
    status: "VERIFIED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation: "Infinite stands on soft 17. The seven-seat Free Bet sheet is a different game.",
    critical: true,
  },
  {
    id: "blackjackPayout",
    label: "Blackjack",
    value: 1.5,
    source: "Help screenshots and Infinite rules: 3:2",
    status: "VERIFIED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation: "Natural blackjack pays 3:2. A 21 made after a split is not a natural.",
    critical: true,
  },
  {
    id: "winPayout",
    label: "Ordinary win",
    value: 1,
    source: "Help screenshots: 1:1",
    status: "VERIFIED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation: "A normal win pays 1:1 on the player's own stake.",
    critical: true,
  },
  {
    id: "insurancePayout",
    label: "Insurance",
    value: 2,
    source: "Help screenshots: insurance 2:1 on an ace",
    status: "VERIFIED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation:
      "Insurance is offered on a dealer ace and pays 2:1. Sized at half the main unit. It is a separate bet, not added into the main-game EV.",
    critical: true,
  },
  {
    id: "freeDoubleHard",
    label: "Free double",
    value: [9, 10, 11],
    source: "Evolution Infinite Free Bet PDF",
    status: "VERIFIED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation:
      "Hard 9, 10, or 11. The casino posts the extra unit. Win +2, push 0, loss −1 of player cash. Not a soft total.",
    critical: true,
  },
  {
    id: "regularDoubleHard",
    label: "Regular double",
    value: [9, 10, 11],
    source: "Product rule list: regular double and free double on hard 9/10/11",
    status: "USER_CONFIRMED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation:
      "Player posts the extra unit. Win +2, push 0, loss −2. Compared with free double; both are not taken together.",
    critical: true,
  },
  {
    id: "freeSplitExceptTens",
    label: "Free split",
    value: true,
    source: "Evolution Infinite Free Bet PDF",
    status: "VERIFIED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation:
      "Pairs of A–9. The extra hand is casino-funded: win +1, push 0, loss 0. Ten-value pairs are not free.",
    critical: true,
  },
  {
    id: "regularSplitTens",
    label: "Regular split",
    value: true,
    source: "Product rule list: separate regular split",
    status: "USER_CONFIRMED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation: "Ten-value pairs can be split with the player's cash on both hands.",
    critical: true,
  },
  {
    id: "resplit",
    label: "Resplit",
    value: true,
    source:
      "Product reference values say resplit. An earlier reading of the Infinite PDF allowed only one split.",
    status: "CONFLICTING",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: true,
    explanation:
      "Active override follows the product reference: resplit until max hands. Clear the override to block definitive EV.",
    critical: true,
  },
  {
    id: "maxHands",
    label: "Maximum hands",
    value: 4,
    source: "Product reference values. The earlier PDF reading allowed one split (two hands).",
    status: "CONFLICTING",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: 4,
    explanation: "Active override: at most 4 hands from the original pair.",
    critical: true,
  },
  {
    id: "doubleAfterSplit",
    label: "Double after split",
    value: true,
    source: "Product reference values say DAS. An earlier PDF reading said no double after split.",
    status: "CONFLICTING",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: true,
    explanation: "Active override: hard 9/10/11 may double after a split. Split aces still take one card only.",
    critical: true,
  },
  {
    id: "splitAcesOneCard",
    label: "Split aces",
    value: true,
    source: "Evolution Infinite Free Bet PDF",
    status: "VERIFIED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation: "Each split ace receives one card. No hit, no double, no resplit. A ten on a split ace is 21, not a natural.",
    critical: true,
  },
  {
    id: "resplitAces",
    label: "Resplit aces",
    value: false,
    source: "Split-aces-one-card rule",
    status: "VERIFIED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation: "Aces are not resplit.",
    critical: true,
  },
  {
    id: "surrender",
    label: "Surrender",
    value: false,
    source: "Product reference values",
    status: "USER_CONFIRMED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation: "No surrender action.",
    critical: true,
  },
  {
    id: "pushOn22",
    label: "Dealer 22",
    value: true,
    source: "Evolution Infinite Free Bet PDF",
    status: "VERIFIED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation:
      "Dealer 22 pushes an eligible non-busted hand, including Six Card Charlie. It is not a dealer bust and not a player win. A player bust still loses.",
    critical: true,
  },
  {
    id: "blackjackBeats22",
    label: "Natural blackjack against dealer 22",
    value: true,
    source: "Evolution Infinite Free Bet PDF",
    status: "VERIFIED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation: "A natural blackjack still pays 3:2 against dealer 22.",
    critical: true,
  },
  {
    id: "charlie",
    label: "Six Card Charlie",
    value: true,
    source: "Evolution Infinite Free Bet PDF",
    status: "VERIFIED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation:
      "Six cards totaling 21 or less wins even money, per hand. Dealer 22 pushes that hand. A bust is not a Charlie.",
    critical: true,
  },
  {
    id: "dealerPeeks",
    label: "Dealer peek",
    value: true,
    source: "Evolution Infinite Free Bet PDF",
    status: "PARTIALLY_VERIFIED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation:
      "With an ace or ten up, a dealer blackjack is settled before the player doubles or hits, so a doubled stake is not lost to a peeked blackjack.",
    critical: true,
  },
  {
    id: "bustIt22",
    label: "Bust It on dealer 22",
    value: null,
    source: "Not stated on the supplied paytable screenshots",
    status: "UNVERIFIED",
    date: RULE_DATE,
    version: RULE_PROFILE_VERSION,
    override: null,
    explanation:
      "The main game pushes dealer 22. Whether Bust It pays on 22 is not on the screenshot. Both treatments are calculated. If they disagree on the sign of EV, the side bet is SKIP (INSUFFICIENT DATA).",
    critical: false,
  },
];

function active<T>(field: RuleField<T>): T | null {
  return field.override !== null && field.override !== undefined ? field.override : field.value;
}

export function rulesFromFields(
  fields: readonly RuleField<unknown>[] = INFINITE_RULE_FIELDS
): { rules: InfiniteRules; missingCritical: string[] } {
  const byId = new Map(fields.map((f) => [f.id, f]));
  const missing: string[] = [];
  function take<T>(id: string): T | null {
    const field = byId.get(id) as RuleField<T> | undefined;
    if (!field) {
      missing.push(id);
      return null;
    }
    const value = active(field);
    if (field.critical && (value === null || value === undefined)) missing.push(id);
    return value ?? null;
  }
  const rules: InfiniteRules = {
    decks: take<number>("decks") ?? 8,
    dealerStandsSoft17: take<boolean>("dealerStandsSoft17") ?? true,
    blackjackPayout: take<number>("blackjackPayout") ?? 1.5,
    winPayout: take<number>("winPayout") ?? 1,
    insurancePayout: take<number>("insurancePayout") ?? 2,
    freeDoubleHard: take<number[]>("freeDoubleHard") ?? [9, 10, 11],
    regularDoubleHard: take<number[]>("regularDoubleHard") ?? [9, 10, 11],
    freeSplitExceptTens: take<boolean>("freeSplitExceptTens") ?? true,
    regularSplitTens: take<boolean>("regularSplitTens") ?? true,
    resplit: Boolean(take<boolean>("resplit")),
    maxHands: take<number>("maxHands") ?? 4,
    doubleAfterSplit: Boolean(take<boolean>("doubleAfterSplit")),
    splitAcesOneCard: take<boolean>("splitAcesOneCard") ?? true,
    resplitAces: take<boolean>("resplitAces") ?? false,
    surrender: take<boolean>("surrender") ?? false,
    pushOn22: take<boolean>("pushOn22") ?? true,
    blackjackBeats22: take<boolean>("blackjackBeats22") ?? true,
    bustLoses: true,
    charlie: take<boolean>("charlie") ?? true,
    dealerPeeks: take<boolean>("dealerPeeks") ?? true,
  };
  return { rules, missingCritical: missing };
}

export function definitiveRulesAllowed(
  fields: readonly RuleField<unknown>[] = INFINITE_RULE_FIELDS
): boolean {
  return rulesFromFields(fields).missingCritical.length === 0;
}
