import type { DecisionAnalysisResult } from "./decision-analysis";
import type { GameProfile } from "./types";

export type ParticipationCode = "INSUFFICIENT_DATA" | "COMPUTED";

export interface ParticipationAdvice {
  code: ParticipationCode;
  definitive: boolean;
  /** True only when a verified profile produced a computed EV above sitting out. */
  participate: boolean | null;
  ev: number | null;
  messageDe: string;
}

/** Closed Evolution profile with a cited rule source. The H17 baseline is not one. */
export function isVerifiedEvolutionProfile(profile: GameProfile): boolean {
  return (
    profile.incomplete === false &&
    profile.id !== "standard-h17-8deck" &&
    (profile.rules.ruleSourceIds?.length ?? 0) > 0
  );
}

/**
 * Sit in or out for this hand. Sitting out is worth 0.
 * Anything short of a verified profile and a computed EV is INSUFFICIENT DATA.
 */
export function adviseParticipation(
  analysis: DecisionAnalysisResult,
  profile: GameProfile
): ParticipationAdvice {
  const insufficient: ParticipationAdvice = {
    code: "INSUFFICIENT_DATA",
    definitive: false,
    participate: null,
    ev: null,
    messageDe: "INSUFFICIENT DATA",
  };
  if (!isVerifiedEvolutionProfile(profile)) return insufficient;
  if (!analysis.definitive || !analysis.recommended) return insufficient;
  const row = analysis.actions.find(
    (action) => action.action === analysis.recommended && action.available
  );
  if (!row || typeof row.ev !== "number") return insufficient;
  const participate = row.ev > 0;
  return {
    code: "COMPUTED",
    definitive: true,
    participate,
    ev: row.ev,
    messageDe: participate
      ? `COMPUTED. Bedingter EV ${row.ev.toFixed(4)} liegt über Aussetzen (0). Kein Profit-Claim.`
      : `COMPUTED. Bedingter EV ${row.ev.toFixed(4)} liegt nicht über Aussetzen (0). Kein Vorteil.`,
  };
}
