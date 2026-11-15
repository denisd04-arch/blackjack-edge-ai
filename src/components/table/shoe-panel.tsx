"use client";

import type { ShoeSnapshot } from "@blackjack-edge/engine";
import { CARD_RANKS, RANK_LABEL_DE } from "@blackjack-edge/engine";
import { DataPanel, DataPanelGrid } from "@/components/ui/data-panel";

const DECK_OPTIONS = [1, 2, 4, 6, 8, 10, 12] as const;

export function ShoePanel({
  shoe,
  canChangeDecks,
  onDecksChange,
}: {
  shoe: ShoeSnapshot;
  canChangeDecks?: boolean;
  onDecksChange?: (decks: number) => void;
}) {
  const depleted = CARD_RANKS.filter((r) => shoe.remainingByRank[r] === 0);

  return (
    <section className="space-y-4">
      {canChangeDecks && onDecksChange ? (
        <label className="flex flex-wrap items-center gap-2 text-sm text-ink-muted">
          <span>Schuhgröße:</span>
          <select
            value={shoe.decks}
            onChange={(e) => onDecksChange(Number(e.target.value))}
            className="rounded-lg border border-border bg-canvas px-2 py-1 font-mono text-ink"
          >
            {DECK_OPTIONS.map((d) => (
              <option key={d} value={d}>
                {d} Decks
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <DataPanelGrid>
        <DataPanel
          label="Decks"
          value={shoe.decks}
          hint="Evolution-Standard: 8"
        />
        <DataPanel
          label="Gesehen"
          value={`${shoe.cardsDealt} / ${shoe.cardsTotal}`}
        />
        <DataPanel
          label="Penetration"
          value={`${shoe.penetration}%`}
          hint="EV auf /entscheidungen"
        />
      </DataPanelGrid>
      {depleted.length > 0 ? (
        <p className="text-xs text-warn">
          Depletiert: {depleted.map((r) => RANK_LABEL_DE[r]).join(", ")}
        </p>
      ) : null}
    </section>
  );
}