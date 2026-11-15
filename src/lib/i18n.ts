/** Phase 1: German-only UI; future next-intl wiring hooks here. */
export const LOCALE = "de-DE" as const;

export function formatPhaseLabel(phase: number): string {
  return `Phase ${phase}`;
}