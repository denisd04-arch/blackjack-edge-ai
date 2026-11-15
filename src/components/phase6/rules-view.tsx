"use client";

import {
  EVOLUTION_FREE_BET_STUB,
  EVOLUTION_INFINITE_FREE_BET_STUB,
  evolutionRuleReport,
} from "@blackjack-edge/engine";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";

const PROFILES = [EVOLUTION_FREE_BET_STUB, EVOLUTION_INFINITE_FREE_BET_STUB];

export function RulesView() {
  return (
    <AppShell
      title="Free-Bet-Regeln"
      subtitle="Evolution Varianten — Regelbericht ohne erfundenes EV."
    >
      {PROFILES.map((p) => {
        const report = evolutionRuleReport(p);
        return (
          <Card key={p.id} className="mt-4" title={report.labelDe}>
            {report.incomplete ? (
              <p className="text-sm text-warning">
                Profil unvollständig — kein definitiver EV (
                {report.missingFields.join(", ") || "Felder offen"}).
              </p>
            ) : (
              <p className="text-sm text-neon">Profil vollständig.</p>
            )}
            <ul className="mt-3 list-disc space-y-1 pl-5 text-sm text-ink-muted">
              {report.notesDe.map((note) => (
                <li key={note}>{note}</li>
              ))}
            </ul>
          </Card>
        );
      })}
    </AppShell>
  );
}