"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  analyzeDecision,
  buildLogEntry,
  attachActualAction,
  liveHandFromDealt,
  observeShoe,
  shoeForUnseenDecision,
  type DecisionLogEntry,
  type PlayerAction,
} from "@blackjack-edge/engine";
import { useGameProfile } from "@/lib/game-profile-context";
import { useTableSession } from "@/lib/table-session-context";

type DecisionTrackerValue = {
  entries: readonly DecisionLogEntry[];
  recordActual: (entryId: string, action: PlayerAction) => void;
  clearLog: () => void;
};

const DecisionTrackerContext = createContext<DecisionTrackerValue | null>(null);

let entryCounter = 0;

export function DecisionTrackerProvider({ children }: { children: ReactNode }) {
  const { snapshot } = useTableSession();
  const { profile } = useGameProfile();
  const [entries, setEntries] = useState<DecisionLogEntry[]>([]);
  const lastKeyRef = useRef<string | null>(null);

  useEffect(() => {
    const hand = liveHandFromDealt(
      snapshot.dealt,
      snapshot.roundId,
      snapshot.roundOpen,
      snapshot.participation
    );
    if (!hand.ready || !hand.dealerUpcard) {
      return;
    }
    const key = `${profile.id}:${snapshot.roundId}:${hand.playerCards.join(",")}|${hand.dealerUpcard}`;
    if (lastKeyRef.current === key) return;

    const shoe = decisionShoe(snapshot, profile.variant, hand.playerCards, hand.dealerUpcard);
    if (!shoe) return;
    lastKeyRef.current = key;
    const analysis = analyzeDecision({
      profile,
      playerCards: hand.playerCards,
      dealerUpcard: hand.dealerUpcard,
      shoeRemainingByRank: shoe,
    });

    entryCounter += 1;
    const entry = buildLogEntry({
      id: `decision-${entryCounter}`,
      createdAtMs: Date.now(),
      roundId: snapshot.roundId,
      playerCards: hand.playerCards,
      dealerUpcard: hand.dealerUpcard,
      analysis,
    });

    setEntries((prev) => [...prev, entry]);
  }, [
    snapshot,
    profile,
  ]);

  useEffect(() => {
    if (!snapshot.roundOpen) {
      lastKeyRef.current = null;
    }
  }, [snapshot.roundOpen, snapshot.roundId]);

  const recordActual = useCallback(
    (entryId: string, action: PlayerAction) => {
      setEntries((prev) =>
        prev.map((e) => {
          if (e.id !== entryId) return e;
          const shoe = decisionShoe(
            snapshot,
            profile.variant,
            e.playerCards,
            e.dealerUpcard
          );
          if (!shoe) return e;
          const analysis = analyzeDecision({
            profile,
            playerCards: e.playerCards,
            dealerUpcard: e.dealerUpcard,
            shoeRemainingByRank: shoe,
          });
          return attachActualAction(e, action, analysis);
        })
      );
    },
    [profile, snapshot]
  );

  const clearLog = useCallback(() => {
    setEntries([]);
    lastKeyRef.current = null;
  }, []);

  const value = useMemo(
    () => ({ entries, recordActual, clearLog }),
    [entries, recordActual, clearLog]
  );

  return (
    <DecisionTrackerContext.Provider value={value}>
      {children}
    </DecisionTrackerContext.Provider>
  );
}

function decisionShoe(
  snapshot: {
    decks: number;
    dealt: readonly {
      rank: DecisionLogEntry["playerCards"][number];
      suit: "hearts" | "diamonds" | "clubs" | "spades";
      target: "dealer" | "player" | "other";
      roundId: number;
    }[];
    roundId: number;
    shoe: { remainingByRank: Parameters<typeof shoeForUnseenDecision>[0]["remainingByRank"] };
  },
  variant: string,
  playerCards: readonly DecisionLogEntry["playerCards"][number][],
  dealerUp: DecisionLogEntry["dealerUpcard"]
) {
  const view =
    variant === "evolution_infinite_free_bet" ? "infinite" : "free_bet";
  const observation = observeShoe({
    decks: snapshot.decks,
    dealt: snapshot.dealt,
    remainingByRank: snapshot.shoe.remainingByRank,
    roundId: snapshot.roundId,
    view,
    phase: "your_turn",
  });
  if (observation.blocksDecision) return null;
  const hole =
    snapshot.dealt.filter(
      (card) => card.roundId === snapshot.roundId && card.target === "dealer"
    )[1]?.rank ?? null;
  return shoeForUnseenDecision({
    remainingByRank: snapshot.shoe.remainingByRank,
    playerCards,
    dealerUp,
    holeRank: hole,
    holeStaysUnknown: true,
  });
}

export function useDecisionTracker(): DecisionTrackerValue {
  const ctx = useContext(DecisionTrackerContext);
  if (!ctx) {
    throw new Error("useDecisionTracker erfordert DecisionTrackerProvider.");
  }
  return ctx;
}