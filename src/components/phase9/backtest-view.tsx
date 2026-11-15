"use client";

import { useMemo } from "react";
import { backtestFromDecisionLog } from "@blackjack-edge/engine";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { DataPanel, DataPanelGrid } from "@/components/ui/data-panel";
import { useDecisionTracker } from "@/lib/decision-tracker-context";

export function BacktestView() {
  const { entries } = useDecisionTracker();
  const result = useMemo(
    () => backtestFromDecisionLog(entries),
  [entries]
  );

  return (
    <AppShell title="Backtesting" subtitle="Replay aus Entscheidungs-Log.">
      <p className="text-sm text-ink-muted">{result.messageDe}</p>
      <DataPanelGrid>
        <DataPanel label="Hände" value={result.hands} />
        <DataPanel label="Abweichungen" value={result.deviations} />
        <DataPanel
          label="Ø Empfehlungs-EV"
          value={
            result.avgRecommendedEv != null
              ? result.avgRecommendedEv.toFixed(4)
              : "—"
          }
        />
      </DataPanelGrid>
      {!result.definitive && result.hands > 0 ? (
        <Card className="mt-4" title="Hinweis">
          <p className="text-sm text-ink-muted">
            Log enthält Einträge ohne definitive EV — Profil prüfen.
          </p>
        </Card>
      ) : null}
    </AppShell>
  );
}