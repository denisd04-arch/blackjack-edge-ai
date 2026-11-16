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
  shoeIncludingVisible,
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
    lastKeyRef.current = key;

    const analysis = analyzeDecision({
      profile,
      playerCards: hand.playerCards,
      dealerUpcard: hand.dealerUpcard,
      shoeRemainingByRank: shoeIncludingVisible(snapshot.shoe.remainingByRank, [
        ...hand.playerCards,
        hand.dealerUpcard,
      ]),
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
    snapshot.dealt,
    snapshot.participation,
    snapshot.roundId,
    snapshot.roundOpen,
    snapshot.shoe.remainingByRank,
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
          const analysis = analyzeDecision({
            profile,
            playerCards: e.playerCards,
            dealerUpcard: e.dealerUpcard,
            shoeRemainingByRank: shoeIncludingVisible(
              snapshot.shoe.remainingByRank,
              [...e.playerCards, e.dealerUpcard]
            ),
          });
          return attachActualAction(e, action, analysis);
        })
      );
    },
    [profile, snapshot.shoe.remainingByRank]
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

export function useDecisionTracker(): DecisionTrackerValue {
  const ctx = useContext(DecisionTrackerContext);
  if (!ctx) {
    throw new Error("useDecisionTracker erfordert DecisionTrackerProvider.");
  }
  return ctx;
}