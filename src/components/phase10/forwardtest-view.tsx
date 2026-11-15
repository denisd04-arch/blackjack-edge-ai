"use client";

import { forwardTestProjection } from "@blackjack-edge/engine";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { useTableSession } from "@/lib/table-session-context";

export function ForwardtestView() {
  const { snapshot } = useTableSession();
  const projection = forwardTestProjection({
    counts: snapshot.counts,
    participationHandsRemaining: Math.max(
      0,
      snapshot.shoe.cardsRemaining - snapshot.shoe.cardsDealt
    ),
  });

  return (
    <AppShell title="Forwardtesting" subtitle="Nur Beobachtungen — keine Dollar-Projektion.">
      <p className="text-sm text-warning">{projection.messageDe}</p>
      <Card className="mt-4" title="Schuh & Zählung">
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
          {projection.observationsDe.map((o) => (
            <li key={o}>{o}</li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}