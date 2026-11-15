"use client";

import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTableSession } from "@/lib/table-session-context";
import { CountSummary } from "./count-summary";

export function HomeCountTeaser() {
  const { snapshot } = useTableSession();
  const hasCards = snapshot.dealt.length > 0;

  return (
    <Card eyebrow="Phase 3" title="Zählung & Inventar">
      {hasCards ? (
        <CountSummary counts={snapshot.counts} />
      ) : (
        <p className="text-sm text-ink-muted">
          Karten auf dem Tisch erfassen — Running/True Count und Inventar folgen
          automatisch.
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
        <ButtonLink href="/karten" variant="primary">
          Kartenbereich
        </ButtonLink>
        <ButtonLink href="/tisch">Tisch</ButtonLink>
      </div>
    </Card>
  );
}