import type { GameProfile } from "./types";
import {
  EVOLUTION_FREE_BET,
  EVOLUTION_INFINITE_FREE_BET,
  STANDARD_H17_8DECK_BASELINE,
} from "./profiles";

export const PROFILE_REGISTRY: readonly GameProfile[] = [
  EVOLUTION_FREE_BET,
  EVOLUTION_INFINITE_FREE_BET,
  STANDARD_H17_8DECK_BASELINE,
];

export function profileById(id: string): GameProfile | undefined {
  return PROFILE_REGISTRY.find((p) => p.id === id);
}

/** Seven-seat Free Bet is the product default. It stays honest when rules are incomplete. */
export const DEFAULT_PRODUCT_PROFILE_ID = EVOLUTION_FREE_BET.id;
