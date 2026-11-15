"use client";

import { useMemo } from "react";
import {
  STANDARD_H17_8DECK_BASELINE,
  analyzeDecision,
  explainDecisionAnalysis,
  liveHandFromDealt,
} from "@blackjack-edge/engine";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { useTableSession } from "@/lib/table-session-context";

export function AssistantView() {
  const { snapshot } = useTableSession();

  const explanation = useMemo(() => {
    const hand = liveHandFromDealt(
      snapshot.dealt,
      snapshot.roundId,
      snapshot.roundOpen,
      snapshot.participation
    );
    if (!hand.ready || !hand.dealerUpcard) return null;
    const analysis = analyzeDecision({
      profile: STANDARD_H17_8DECK_BASELINE,
      playerCards: hand.playerCards,
      dealerUpcard: hand.dealerUpcard,
      shoeRemainingByRank: snapshot.shoe.remainingByRank,
    });
    return explainDecisionAnalysis(analysis, snapshot.counts);
  }, [snapshot]);

  return (
    <AppShell
      title="Assistent"
      subtitle="Erklärt nur strukturierte Engine-Ausgaben — kein erfundenes EV."
    >
      {!explanation ? (
        <p className="text-sm text-ink-muted">
          Spielhand auf dem Tisch erfassen (Ich spiele, Runde offen).
        </p>
      ) : (
        <Card title={explanation.titleDe}>
          {explanation.paragraphsDe.map((p) => (
            <p key={p} className="mt-2 text-sm text-ink-muted">
              {p}
            </p>
          ))}
        </Card>
      )}
    </AppShell>
  );
}