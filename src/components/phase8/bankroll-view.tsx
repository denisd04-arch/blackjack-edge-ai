"use client";

import { useMemo } from "react";
import { kellyOnNet } from "@blackjack-edge/engine";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataPanel, DataPanelGrid } from "@/components/ui/data-panel";
import { useBankroll } from "@/lib/bankroll-context";
import { useDecisionTracker } from "@/lib/decision-tracker-context";

export function BankrollView() {
  const { entries, recordDelta, reset } = useBankroll();
  const { entries: decisions } = useDecisionTracker();
  const latest = decisions[decisions.length - 1];

  const kelly = useMemo(() => {
    if (!latest?.definitive || latest.recommendedEv == null) return null;
    if (latest.recommendedVariance == null || latest.recommendedMaxLoss == null) {
      return null;
    }
    return kellyOnNet({
      ev: latest.recommendedEv,
      variance: latest.recommendedVariance,
      maxLoss: latest.recommendedMaxLoss,
      definitive: true,
    });
  }, [latest]);

  const balance = entries[entries.length - 1]?.balanceAfter ?? 0;

  return (
    <AppShell title="Bankroll & Risiko" subtitle="Ledger & Kelly — lokal, ohne DB.">
      <DataPanelGrid>
        <DataPanel label="Bankroll" value={balance.toFixed(2)} hint="EUR Demo" />
        <DataPanel
          label="Kelly"
          value={
            kelly?.definitive ? `${(kelly.fraction * 100).toFixed(2)}%` : "—"
          }
          hint={kelly?.messageDe ?? "Letzte Entscheidung erforderlich"}
        />
      </DataPanelGrid>
      <Card className="mt-4" title="Ledger">
        <ul className="space-y-1 text-sm font-mono text-ink-muted">
          {entries.map((e) => (
            <li key={e.id}>
              {e.delta >= 0 ? "+" : ""}
              {e.delta.toFixed(2)} → {e.balanceAfter.toFixed(2)} · {e.noteDe}
            </li>
          ))}
        </ul>
        <div className="mt-3 flex gap-2">
          <Button onClick={() => recordDelta(-10, "Einsatz")}>−10 Einsatz</Button>
          <Button onClick={() => recordDelta(15, "Gewinn")}>+15 Gewinn</Button>
          <Button variant="ghost" onClick={reset}>
            Reset
          </Button>
        </div>
      </Card>
    </AppShell>
  );
}