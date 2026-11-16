"use client";

import { useMemo, useState } from "react";
import {
  backtestFromDecisionLog,
  simulateMainBetShoe,
  type ShoeSimulationResult,
} from "@blackjack-edge/engine";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataPanel, DataPanelGrid } from "@/components/ui/data-panel";
import { useDecisionTracker } from "@/lib/decision-tracker-context";
import { useGameProfile } from "@/lib/game-profile-context";

export function BacktestView() {
  const { entries } = useDecisionTracker();
  const { profile } = useGameProfile();
  const [sim, setSim] = useState<ShoeSimulationResult | null>(null);
  const result = useMemo(
    () => backtestFromDecisionLog(entries),
  [entries]
  );

  function runModel() {
    setSim(
      simulateMainBetShoe({
        profile,
        hands: 2,
        decks: 1,
        seed: 20261116,
      })
    );
  }

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
      <Card className="mt-4" title="Schuh-Modell" eyebrow={profile.labelDe}>
        <p className="text-sm text-ink-muted">
          Kurzer Lauf mit einem Deck und zwei Händen. Das Ergebnis ist eine
          Modellkennzahl, kein Hausvorteil und kein Profit.
        </p>
        <Button className="mt-3" onClick={runModel}>
          Modell laufen lassen
        </Button>
        {sim ? (
          <p className="mt-3 text-sm text-ink-muted">
            {sim.messageDe} Hände: {sim.handsPlayed}. Mittel pro Hand:{" "}
            {sim.meanProfitPerHand == null ? "—" : sim.meanProfitPerHand.toFixed(4)}.
          </p>
        ) : null}
      </Card>
    </AppShell>
  );
}