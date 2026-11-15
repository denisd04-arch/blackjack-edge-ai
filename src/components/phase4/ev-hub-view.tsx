"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CountSummary } from "@/components/counting/count-summary";
import { useTableSession } from "@/lib/table-session-context";

export function EvHubView() {
  const { snapshot } = useTableSession();
  return (
    <AppShell
      title="Wahrscheinlichkeit & EV"
      subtitle="Weiterleitung zur Engine — keine Mock-Werte."
    >
      <CountSummary counts={snapshot.counts} />
      <Card className="mt-4" title="Entscheidungs-EV">
        <p className="text-sm text-ink-muted">
          Finite-Shoe-EV und Aktionsverteilung berechnet die Engine auf{" "}
          <Link href="/entscheidungen" className="text-accent underline">
            /entscheidungen
          </Link>
          .
        </p>
        <ButtonLink href="/entscheidungen" className="mt-3" variant="primary">
          Entscheidungstracker öffnen
        </ButtonLink>
      </Card>
    </AppShell>
  );
}