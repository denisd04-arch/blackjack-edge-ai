"use client";

import { evolutionRuleReport } from "@blackjack-edge/engine";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { useGameProfile } from "@/lib/game-profile-context";

export function RulesView() {
  const { profiles } = useGameProfile();
  return (
    <AppShell
      title="Free-Bet-Regeln"
      subtitle="Evolution Varianten — Regelbericht ohne erfundenes EV."
    >
      {profiles
        .filter((p) => p.id.startsWith("evo-"))
        .map((p) => {
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