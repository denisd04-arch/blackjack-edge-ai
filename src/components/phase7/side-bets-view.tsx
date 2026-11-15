"use client";

import { SIDE_BET_CATALOG, analyzeSideBet } from "@blackjack-edge/engine";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { useTableSession } from "@/lib/table-session-context";

export function SideBetsView() {
  const { snapshot } = useTableSession();

  return (
    <AppShell
      title="Nebenwetten"
      subtitle="Katalog und Status — ohne Mock-EV in Produktion."
    >
      {SIDE_BET_CATALOG.map((slot) => {
        const analysis = analyzeSideBet({
          type: slot.id,
          shoe: snapshot.shoe.remainingByRank,
        });
        return (
          <Card key={slot.id} className="mt-4" title={slot.labelDe}>
            <p className="text-sm text-warning">{analysis.messageDe}</p>
            <p className="mt-2 text-xs text-ink-muted">
              {analysis.compositionHintDe}
            </p>
          </Card>
        );
      })}
    </AppShell>
  );
}