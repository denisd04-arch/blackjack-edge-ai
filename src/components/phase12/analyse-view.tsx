"use client";

import { buildSessionAnalytics } from "@blackjack-edge/engine";
import { AppShell } from "@/components/layout/app-shell";
import { DataPanel, DataPanelGrid } from "@/components/ui/data-panel";
import { useDecisionTracker } from "@/lib/decision-tracker-context";
import { useTableSession } from "@/lib/table-session-context";

export function AnalyseView() {
  const { snapshot } = useTableSession();
  const { entries } = useDecisionTracker();
  const stats = buildSessionAnalytics({
    shoe: snapshot.shoe,
    counts: snapshot.counts,
    decisions: entries,
  });

  return (
    <AppShell
      title="Performance & QA"
      subtitle="Session-Analytik aus Tisch und Tracker."
    >
      <DataPanelGrid>
        <DataPanel label="Karten gespielt" value={stats.cardsDealt} />
        <DataPanel label="Penetration" value={`${stats.penetration}%`} />
        <DataPanel label="Entscheidungspunkte" value={stats.decisionPoints} />
        <DataPanel label="Abweichungen" value={stats.deviations} />
        <DataPanel label="Hi-Lo TC" value={stats.hiLoTrue} />
        <DataPanel label="Omega TC" value={stats.omegaTrue} />
      </DataPanelGrid>
    </AppShell>
  );
}