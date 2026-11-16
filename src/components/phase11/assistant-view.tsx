"use client";

import { useMemo } from "react";
import {
  adviseParticipation,
  analyzeDecision,
  explainDecisionAnalysis,
  liveHandFromDealt,
  observeShoe,
  shoeForUnseenDecision,
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
    const view =
      profile.variant === "evolution_infinite_free_bet" ? "infinite" : "free_bet";
    const observation = observeShoe({
      decks: snapshot.decks,
      dealt: snapshot.dealt,
      remainingByRank: snapshot.shoe.remainingByRank,
      roundId: snapshot.roundId,
      view,
      phase: "your_turn",
    });
    if (observation.blocksDecision) {
      return {
        titleDe: "INSUFFICIENT DATA",
        paragraphsDe: ["INSUFFICIENT DATA", observation.messageDe, "Keine Engine-Zahl."],
      };
    }
    const hole =
      snapshot.dealt.filter(
        (card) => card.roundId === snapshot.roundId && card.target === "dealer"
      )[1]?.rank ?? null;
    const analysis = analyzeDecision({
      profile,
      playerCards: hand.playerCards,
      dealerUpcard: hand.dealerUpcard,
      shoeRemainingByRank: shoeForUnseenDecision({
        remainingByRank: snapshot.shoe.remainingByRank,
        playerCards: hand.playerCards,
        dealerUp: hand.dealerUpcard,
        holeRank: hole,
        holeStaysUnknown: true,
      }),
    });
    const participation = adviseParticipation(analysis, profile);
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