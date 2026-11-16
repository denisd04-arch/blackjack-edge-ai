"use client";

import {
  analyzeRemaining,
  answerBustIt22,
  applyToLedger,
  cardsDealtPhysical,
  confirmParticipation,
  createShoe,
  cutReached,
  dealCard,
  decisionHand,
  deleteEvent,
  editEvent,
  emptyLedger,
  expectedTarget,
  holeReserved,
  inventoryValid,
  markRoundSettled,
  newShoe,
  nextRound,
  normalizeSession,
  PRESETS,
  recordOverride,
  requestHoleReveal,
  retargetEvent,
  seenRanks,
  seenShoe,
  settingsSnapshot,
  settleSessionRound,
  stand,
  undo,
  redo,
  fireManualCut,
  type CutConfig,
  type FullRank,
  type Ledger,
  type LiveAnalysis,
  type RoundStakes,
  type ShoeSession,
  type Suit,
  type TableSettings,
} from "@blackjack-edge/engine";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

const STORAGE = "beai-infinite-session-v2";

export interface FrozenSnapshot {
  id: string;
  at: string;
  round: number;
  recommendation: string;
  playerEdge: number | null;
  quality: string;
  paytableId: string;
  helpReferenceIsLiveEdge: false;
}

interface Store {
  session: ShoeSession;
  settings: TableSettings;
  live: LiveAnalysis | null;
  edge: LiveAnalysis | null;
  solving: boolean;
  snapshots: FrozenSnapshot[];
  ledger: Ledger;
  notice: string | null;
  setSettings: (next: TableSettings) => void;
  confirmPlay: (recommendation: string, stakes: RoundStakes) => void;
  confirmSkip: (recommendation: string, stakes: RoundStakes) => void;
  revealHole: () => void;
  answerBust: (pays: boolean) => void;
  deal: (rank: FullRank, suit: Suit, target?: Parameters<typeof dealCard>[3]) => string | null;
  onNewShoe: () => void;
  onNextRound: () => string | null;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, rank: FullRank, suit: Suit) => void;
  onRetarget: (id: string, target: NonNullable<ReturnType<typeof expectedTarget>>) => void;
  onStand: () => void;
  onCut: () => void;
  chooseAction: (action: string, recommended?: string) => void;
  setQuick: (quick: boolean) => void;
  setForcedTarget: (target: ShoeSession["forcedTarget"]) => void;
}

const Ctx = createContext<Store | null>(null);

export function InfiniteProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ShoeSession>(() => createShoe());
  const [settings, setSettingsState] = useState<TableSettings>(PRESETS.POSITIVE_EV_ONLY);
  const [edge, setEdge] = useState<LiveAnalysis | null>(null);
  const [solving, setSolving] = useState(false);
  const [snapshots, setSnapshots] = useState<FrozenSnapshot[]>([]);
  const [notice, setNotice] = useState<string | null>(null);
  const [ledger, setLedger] = useState<Ledger>(() => emptyLedger(PRESETS.POSITIVE_EV_ONLY.bankroll));

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as {
        session: ShoeSession;
        settings: TableSettings;
        snapshots: FrozenSnapshot[];
        ledger?: Ledger;
      };
      if (parsed.session?.events && parsed.settings?.paytableId) {
        setSession(normalizeSession(parsed.session));
        setSettingsState(parsed.settings);
        setSnapshots(parsed.snapshots ?? []);
        if (parsed.ledger?.entries && parsed.ledger.storage === "browser-local") setLedger(parsed.ledger);
      }
    } catch {
      localStorage.removeItem(STORAGE);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify({ session, settings, snapshots, ledger }));
  }, [session, settings, snapshots, ledger]);

  useEffect(() => {
    if (session.phase === "complete") return;
    const quote = settleSessionRound(session);
    if (!quote || quote.status !== "SETTLED") return;
    setLedger((current) => {
      const next = applyToLedger(current, quote);
      return next.applied ? next.ledger : current;
    });
    setSession((current) => (current.phase === "complete" ? current : markRoundSettled(current)));
  }, [session]);

  const live = useMemo(() => {
    return analyzeRemaining({
      shoe52: seenShoe(session),
      seenRanks: seenRanks(session),
      physicalRemaining: 52 * session.decks - cardsDealtPhysical(session),
      inventoryValid: inventoryValid(session),
      settings,
      hand: null,
      main: false,
    });
  }, [session, settings]);

  useEffect(() => {
    let cancel = false;
    setSolving(true);
    const timer = setTimeout(() => {
      const next = analyzeRemaining({
        shoe52: seenShoe(session),
        seenRanks: seenRanks(session),
        physicalRemaining: 52 * session.decks - cardsDealtPhysical(session),
        inventoryValid: inventoryValid(session),
        settings,
        hand: decisionHand(session),
        main: true,
      });
      if (cancel) return;
      setEdge(next);
      setSolving(false);
      if (session.phase === "deal" && !session.events.some((e) => e.round === session.round)) {
        setSnapshots((prev) => {
          const id = `${session.id}:${session.round}:${cardsDealtPhysical(session)}`;
          if (prev.some((s) => s.id === id)) return prev;
          const snap: FrozenSnapshot = {
            id,
            at: new Date().toISOString(),
            round: session.round,
            recommendation: next.recommendation,
            playerEdge: next.playerEdge,
            quality: next.nextRound.quality,
            paytableId: next.paytableId,
            helpReferenceIsLiveEdge: false,
          };
          return [...prev, snap];
        });
      }
    }, 30);
    return () => {
      cancel = true;
      clearTimeout(timer);
    };
  }, [session, settings]);

  const store: Store = {
    session,
    settings,
    live,
    edge,
    solving,
    snapshots,
    ledger,
    notice,
    setSettings: (next) => setSettingsState(settingsSnapshot(next)),
    deal: (rank, suit, target) => {
      let message: string | null = null;
      setSession((current) => {
        const result = dealCard(current, rank, suit, target, live);
        message = result.error ?? null;
        return result.session;
      });
      setNotice(message);
      return message;
    },
    onNewShoe: () => setSession((current) => newShoe(current)),
    onNextRound: () => {
      const result = nextRound(session);
      setSession(result.session);
      return result.error ?? null;
    },
    onUndo: () => setSession((current) => undo(current)),
    onRedo: () => setSession((current) => redo(current)),
    onDelete: (id) => setSession((current) => deleteEvent(current, id)),
    onEdit: (id, rank, suit) => setSession((current) => editEvent(current, id, rank, suit).session),
    onRetarget: (id, target) => setSession((current) => retargetEvent(current, id, target)),
    onStand: () => setSession((current) => stand(current)),
    onCut: () => setSession((current) => fireManualCut(current)),
    confirmPlay: (recommendation, stakes) => {
      setSession((current) =>
        confirmParticipation(current, { round: current.round, recommendation, actual: "PLAYED", stakes })
      );
    },
    confirmSkip: (recommendation, stakes) => {
      setSession((current) =>
        confirmParticipation(current, {
          round: current.round,
          recommendation,
          actual: "SKIPPED",
          stakes: { ...stakes, main: 0 },
        })
      );
    },
    revealHole: () => setSession((current) => requestHoleReveal(current)),
    answerBust: (pays) => setSession((current) => answerBustIt22(current, pays)),
    chooseAction: (action, recommended) => {
      const advised = recommended ?? edge?.hand?.best.action ?? edge?.recommendation ?? "SKIP";
      setSession((current) => recordOverride(current, advised, action));
    },
    setQuick: (quick) => setSession((current) => ({ ...current, quickMode: quick })),
    setForcedTarget: (target) => setSession((current) => ({ ...current, forcedTarget: target })),
  };

  return <Ctx.Provider value={store}>{children}</Ctx.Provider>;
}

export function useInfinite(): Store {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error("Infinite session is missing");
  return ctx;
}

export function cutLabel(cut: CutConfig, session: ShoeSession): string {
  const dealt = cardsDealtPhysical(session);
  if (cut.mode === "CUT_AFTER_CARDS_DEALT") return `${dealt} / ${cut.cardsDealt} dealt`;
  if (cut.mode === "CUT_AFTER_REMAINING") return `${52 * session.decks - dealt} left, cut at ${cut.cardsRemaining}`;
  if (cut.mode === "PERCENT_PENETRATION") return `${((dealt / (52 * session.decks)) * 100).toFixed(1)}% of ${cut.penetration * 100}%`;
  return session.manualCut || cut.fired ? "Cut fired" : "Manual cut";
}

export { cutReached, holeReserved, cardsDealtPhysical, expectedTarget };
