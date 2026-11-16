"use client";

import { useMemo } from "react";
import {
  adviseParticipation,
  analyzeDecision,
  explainDecisionAnalysis,
  liveHandFromDealt,
  shoeIncludingVisible,
} from "@blackjack-edge/engine";
import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { useGameProfile } from "@/lib/game-profile-context";
import { useTableSession } from "@/lib/table-session-context";

export function AssistantView() {
  const { snapshot } = useTableSession();
  const { profile } = useGameProfile();

  const explanation = useMemo(() => {
    const hand = liveHandFromDealt(
      snapshot.dealt,
      snapshot.roundId,
      snapshot.roundOpen,
      snapshot.participation
    );
    if (!hand.ready || !hand.dealerUpcard) return null;
    const analysis = analyzeDecision({
      profile,
      playerCards: hand.playerCards,
      dealerUpcard: hand.dealerUpcard,
      shoeRemainingByRank: shoeIncludingVisible(snapshot.shoe.remainingByRank, [
        ...hand.playerCards,
        hand.dealerUpcard,
      ]),
    });
    const participation = adviseParticipation(analysis);
    const explained = explainDecisionAnalysis(analysis, snapshot.counts);
    return {
      ...explained,
      paragraphsDe: [
        `Profil: ${profile.labelDe}.`,
        participation.messageDe,
        ...explained.paragraphsDe,
      ],
    };
  }, [profile, snapshot]);

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