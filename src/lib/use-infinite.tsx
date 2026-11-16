"use client";

import {
  analyzeRemaining,
  cardsDealtPhysical,
  createShoe,
  cutReached,
  dealCard,
  decisionHand,
  deleteEvent,
  editEvent,
  expectedTarget,
  holeReserved,
  inventoryValid,
  newShoe,
  nextRound,
  PRESETS,
  recordOverride,
  retargetEvent,
  seenRanks,
  seenShoe,
  settingsSnapshot,
  stand,
  undo,
  redo,
  completeRound,
  fireManualCut,
  type CutConfig,
  type FullRank,
  type LiveAnalysis,
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
  setSettings: (next: TableSettings) => void;
  deal: (rank: FullRank, suit: Suit, target?: Parameters<typeof dealCard>[3]) => void;
  onNewShoe: () => void;
  onNextRound: () => string | null;
  onUndo: () => void;
  onRedo: () => void;
  onDelete: (id: string) => void;
  onEdit: (id: string, rank: FullRank, suit: Suit) => void;
  onRetarget: (id: string, target: NonNullable<ReturnType<typeof expectedTarget>>) => void;
  onStand: () => void;
  onComplete: () => void;
  onCut: () => void;
  chooseAction: (action: string) => void;
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

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { session: ShoeSession; settings: TableSettings; snapshots: FrozenSnapshot[] };
      if (parsed.session?.events && parsed.settings?.paytableId) {
        setSession(parsed.session);
        setSettingsState(parsed.settings);
        setSnapshots(parsed.snapshots ?? []);
      }
    } catch {
      localStorage.removeItem(STORAGE);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE, JSON.stringify({ session, settings, snapshots }));
  }, [session, settings, snapshots]);

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
    setSettings: (next) => setSettingsState(settingsSnapshot(next)),
    deal: (rank, suit, target) => {
      setSession((current) => dealCard(current, rank, suit, target, live).session);
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
    onComplete: () => setSession((current) => completeRound(current)),
    onCut: () => setSession((current) => fireManualCut(current)),
    chooseAction: (action) => {
      const recommended = edge?.hand?.best.action ?? edge?.recommendation ?? "SKIP";
      setSession((current) => recordOverride(current, recommended, action));
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
