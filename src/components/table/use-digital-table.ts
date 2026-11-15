"use client";

import { useCallback, useMemo, useState } from "react";
import {
  DigitalTableSession,
  type DigitalTableSnapshot,
  type ParticipationMode,
  type TableActionResult,
} from "@blackjack-edge/engine";
import type { CardRank, CardSuit, CardTarget } from "@blackjack-edge/engine";

export function useDigitalTable(initialDecks = 8) {
  const [session] = useState(() => new DigitalTableSession({ decks: initialDecks }));
  const [snapshot, setSnapshot] = useState<DigitalTableSnapshot>(() =>
    session.snapshot()
  );
  const [lastError, setLastError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setSnapshot(session.snapshot());
  }, [session]);

  const apply = useCallback(
    (result: TableActionResult, onSuccess?: () => void) => {
      if (!result.ok) {
        setLastError(result.messageDe);
        return false;
      }
      setLastError(null);
      onSuccess?.();
      refresh();
      return true;
    },
    [refresh]
  );

  const actions = useMemo(
    () => ({
      startRound: () => apply(session.startRound()),
      endRound: () => apply(session.endRound()),
      setParticipation: (mode: ParticipationMode) => {
        session.setParticipation(mode);
        refresh();
      },
      deal: (rank: CardRank, suit: CardSuit, target: CardTarget) =>
        apply(session.dealCard(rank, suit, target)),
      undo: () => apply(session.undoLast()),
      remove: (id: string) => apply(session.removeCard(id)),
      edit: (
        id: string,
        rank: CardRank,
        suit: CardSuit,
        target?: CardTarget
      ) => apply(session.editCard(id, rank, suit, target)),
      resetShoe: () => {
        session.resetShoe();
        setLastError(null);
        refresh();
      },
      setDecks: (decks: number) => apply(session.setDecks(decks)),
    }),
    [apply, refresh, session]
  );

  return { snapshot, lastError, actions, clearError: () => setLastError(null) };
}