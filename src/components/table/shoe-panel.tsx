"use client";

import type { ShoeSnapshot } from "@blackjack-edge/engine";
import { CARD_RANKS, RANK_LABEL_DE } from "@blackjack-edge/engine";
import { DataPanel, DataPanelGrid } from "@/components/ui/data-panel";

export function ShoePanel({ shoe }: { shoe: ShoeSnapshot }) {
  const depleted = CARD_RANKS.filter((r) => shoe.remainingByRank[r] === 0);

  return (
    <section className="space-y-4">
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
          hint="Noch keine EV — Phase 4"
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