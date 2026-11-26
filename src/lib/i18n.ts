/** German UI. Blackjack terms stay in their usual form. */
export const LOCALE = "de" as const;

export function formatPhaseLabel(phase: number): string {
  return `Phase ${phase}`;
}