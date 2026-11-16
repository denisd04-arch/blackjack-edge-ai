"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import type { CardRank, CardSuit, CardTarget } from "@blackjack-edge/engine";
import {
  EVOLUTION_FREE_BET,
  EVOLUTION_INFINITE_FREE_BET,
  SUIT_SYMBOL,
  adviseParticipation,
  analyzeDecision,
  beginDeal,
  freshRound,
  observeShoe,
  setActiveSeat,
  setYourSeat,
  settleRound,
  shoeForUnseenDecision,
  toDealer,
  turnLabelDe,
  type TableView,
} from "@blackjack-edge/engine";
import { useGameProfile } from "@/lib/game-profile-context";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardPicker } from "./card-picker";
import { DealtList } from "./dealt-list";
import { ShoePanel } from "./shoe-panel";
import { useTableSession } from "@/lib/table-session-context";
import { CountSummary } from "@/components/counting/count-summary";

export function DigitalTable({ view = "free_bet" }: { view?: TableView }) {
  const { snapshot, lastError, actions, clearError } = useTableSession();
  const { profile, setProfileId } = useGameProfile();
  const [target, setTarget] = useState<CardTarget>("player");
  const [selectedRank, setSelectedRank] = useState<CardRank | null>(null);
  const [round, setRound] = useState(() => freshRound(view));
  const [seatNotice, setSeatNotice] = useState<string | null>(null);
  const expectedProfileId =
    view === "infinite" ? EVOLUTION_INFINITE_FREE_BET.id : EVOLUTION_FREE_BET.id;

  useEffect(() => {
    setProfileId(expectedProfileId);
    setRound(freshRound(view));
    setTarget("player");
  }, [expectedProfileId, setProfileId, view]);

  const inputDisabled = !snapshot.roundOpen;
  const roundCards = snapshot.dealt.filter((card) => card.roundId === snapshot.roundId);
  const playerCards = roundCards.filter((card) => card.target === "player");
  const dealerCards = roundCards.filter((card) => card.target === "dealer");
  const playerKey = playerCards.map((card) => card.rank).join(",");
  const dealerKey = dealerCards.map((card) => card.rank).join(",");
  const holeHidden = round.phase !== "dealer" && round.phase !== "settled";
  const observation = observeShoe({
    decks: snapshot.decks,
    dealt: snapshot.dealt,
    remainingByRank: snapshot.shoe.remainingByRank,
    roundId: snapshot.roundId,
    view,
    phase: round.phase,
  });

  const analysis = useMemo(() => {
    if (profile.id !== expectedProfileId) return null;
    if (observation.blocksDecision || round.phase === "other_player") return null;
    const ranks = playerKey.split(",").filter(Boolean) as CardRank[];
    const dealer = dealerKey.split(",").filter(Boolean) as CardRank[];
    if (ranks.length < 2 || dealer.length < 1) return null;
    return analyzeDecision({
      profile,
      playerCards: ranks,
      dealerUpcard: dealer[0],
      shoeRemainingByRank: shoeForUnseenDecision({
        remainingByRank: snapshot.shoe.remainingByRank,
        playerCards: ranks,
        dealerUp: dealer[0],
        holeRank: dealer[1] ?? null,
        holeStaysUnknown: holeHidden,
      }),
    });
  }, [
    dealerKey,
    expectedProfileId,
    holeHidden,
    observation.blocksDecision,
    playerKey,
    profile,
    round.phase,
    snapshot.shoe.remainingByRank,
  ]);

  const participation = analysis
    ? adviseParticipation(analysis, profile)
    : {
        code: "INSUFFICIENT_DATA" as const,
        messageDe: "INSUFFICIENT DATA",
      };
  const recommended = analysis?.actions.find(
    (row) => row.action === analysis.recommended && row.available
  );

  function onPick(rank: CardRank, suit: CardSuit, picked: CardTarget) {
    if (view === "infinite" && picked === "other") {
      setSeatNotice(
        "Infinite hat keine eigenen Platzkarten. Das wäre eine Doppelzählung."
      );
      return;
    }
    setSeatNotice(null);
    if (actions.deal(rank, suit, picked)) setSelectedRank(null);
  }

  return (
    <AppShell
      title={view === "infinite" ? "Infinite Free Bet" : "Free Bet Blackjack"}
      subtitle="Nur Engine-Zahlen. Kein Hausvorteil, kein erfundenes Paytable."
    >
      <CountSummary counts={snapshot.counts} compact />
      {lastError ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger/50 bg-danger/10 px-4 py-2 text-sm text-danger"
        >
          {lastError}
          <button type="button" className="ml-3 text-xs underline" onClick={clearError}>
            Schließen
          </button>
        </div>
      ) : null}

      <div className="mb-4 rounded-card border border-warn/40 bg-felt-gradient p-4 shadow-panel">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="font-display text-sm text-warn">
            {view === "infinite" ? "Infinite · eine Hand" : "Free Bet · sieben Plätze"}
          </p>
          <div className="flex gap-2 text-xs">
            <Link
              href="/tisch"
              className={clsx(
                "rounded border px-2 py-1",
                view === "free_bet" ? "border-warn text-warn" : "border-ink/30 text-ink"
              )}
            >
              Free Bet
            </Link>
            <Link
              href="/tisch/infinite"
              className={clsx(
                "rounded border px-2 py-1",
                view === "infinite" ? "border-warn text-warn" : "border-ink/30 text-ink"
              )}
            >
              Infinite
            </Link>
          </div>
        </div>
        <p className="mt-2 text-sm text-ink">{turnLabelDe(round)}</p>
        <p className="mt-1 text-xs text-ink">
          Beobachtung {observation.status}. {observation.messageDe}
        </p>
        {view === "free_bet" ? (
          <div className="mt-3 flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5, 6, 7].map((seat) => (
              <button
                key={seat}
                type="button"
                onClick={() => setRound((state) => setActiveSeat(state, seat))}
                className={clsx(
                  "rounded border px-2 py-1 text-xs",
                  seat === round.yourSeat
                    ? "border-warn bg-warn/20 text-warn"
                    : "border-ink/30 text-ink"
                )}
              >
                {seat === round.yourSeat ? `Du ${seat}` : `Platz ${seat}`}
              </button>
            ))}
          </div>
        ) : (
          <p className="mt-2 text-xs text-ink">Gemeinsame Karten. Nur dein Zug.</p>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          {dealerCards[0] ? (
            <FaceCard rank={dealerCards[0].rank} suit={dealerCards[0].suit} />
          ) : (
            <FaceCard hidden label="Up" />
          )}
          {dealerCards[1] ? (
            holeHidden ? (
              <FaceCard hidden label="Hole" />
            ) : (
              <FaceCard rank={dealerCards[1].rank} suit={dealerCards[1].suit} />
            )
          ) : null}
          {playerCards.map((card) => (
            <FaceCard key={card.id} rank={card.rank} suit={card.suit} />
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Button type="button" variant="secondary" onClick={() => setRound(beginDeal)}>
            Geben
          </Button>
          <Button type="button" variant="secondary" onClick={() => setRound(toDealer)}>
            Dealer
          </Button>
          <Button type="button" variant="secondary" onClick={() => setRound(settleRound)}>
            Abrechnen
          </Button>
          {view === "free_bet" ? (
            <Button
              type="button"
              variant="ghost"
              onClick={() =>
                setRound((state) => setYourSeat(state, state.yourSeat === 1 ? 4 : 1))
              }
            >
              Platz wechseln
            </Button>
          ) : null}
        </div>
      </div>

      <Card className="mb-4" title="Engine" eyebrow={participation.code}>
        <p className="text-sm text-ink-muted">{participation.messageDe}</p>
        {seatNotice ? <p className="mt-2 text-sm text-warning">{seatNotice}</p> : null}
        {observation.blocksDecision || round.phase === "other_player" ? (
          <p className="mt-2 text-sm text-ink">Keine Engine-Zahl.</p>
        ) : analysis && !analysis.definitive ? (
          <p className="mt-2 text-sm text-warning">{analysis.messageDe}</p>
        ) : recommended ? (
          <p className="mt-2 font-mono text-sm text-ink">
            {recommended.labelDe} EV {recommended.ev.toFixed(4)} · eigener Einsatz{" "}
            {recommended.playerStakeUnits}
            {recommended.freeStakeUnits > 0
              ? " · Free Stake zählt nicht als Verlust"
              : ""}
            . Kein Hausvorteil.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink">Keine Engine-Zahl.</p>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ParticipationBar
            mode={snapshot.participation}
            roundOpen={snapshot.roundOpen}
            roundId={snapshot.roundId}
            onParticipation={actions.setParticipation}
            onStartRound={() => {
              actions.startRound();
              setRound((state) => beginDeal(state));
            }}
            onEndRound={() => {
              actions.endRound();
              setRound((state) => settleRound(state));
            }}
          />
          <CardPicker
            disabled={inputDisabled}
            target={target}
            targets={view === "infinite" ? ["player", "dealer"] : undefined}
            onTargetChange={setTarget}
            selectedRank={selectedRank}
            onRankSelect={(rank) => {
              setSelectedRank(rank);
              clearError();
            }}
            onPick={onPick}
          />
          <DealtList
            cards={snapshot.dealt}
            disabled={inputDisabled && snapshot.dealt.length === 0}
            onUndo={actions.undo}
            onRemove={actions.remove}
            onEdit={(id, rank, suit, t) => actions.edit(id, rank, suit, t)}
          />
        </div>

        <aside className="space-y-4">
          <Card title="Schuh" eyebrow="Phase 2">
            <ShoePanel
              shoe={snapshot.shoe}
              canChangeDecks={snapshot.dealt.length === 0}
              onDecksChange={actions.setDecks}
            />
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={actions.resetShoe}>
                Neuer Schuh
              </Button>
            </div>
          </Card>
          <Card title="Profil" eyebrow="Regeln">
            <p className="text-sm text-ink-muted">
              {profile.incomplete
                ? `Offen: ${profile.missingFields.join(", ")}. Paarhände bleiben ohne Empfehlung.`
                : "Bedingter Schuh-EV ist für dieses Profil geschlossen. Kein Hausvorteil."}
            </p>
          </Card>
        </aside>
      </div>
    </AppShell>
  );
}

function FaceCard({
  rank,
  suit,
  hidden,
  label,
}: {
  rank?: CardRank;
  suit?: CardSuit;
  hidden?: boolean;
  label?: string;
}) {
  if (hidden || !rank || !suit) {
    return (
      <div className="flex h-16 w-12 items-center justify-center rounded-md border border-warn/70 bg-emerald-mist text-[10px] text-ink">
        {label ?? "—"}
      </div>
    );
  }
  const red = suit === "hearts" || suit === "diamonds";
  return (
    <div
      className={clsx(
        "flex h-16 w-12 flex-col items-center justify-center rounded-md border border-warn/70 bg-ink text-xs font-bold",
        red ? "text-danger" : "text-canvas"
      )}
    >
      <span>{rank}</span>
      <span>{SUIT_SYMBOL[suit]}</span>
    </div>
  );
}

function ParticipationBar({
  mode,
  roundOpen,
  roundId,
  onParticipation,
  onStartRound,
  onEndRound,
}: {
  mode: "playing" | "observing";
  roundOpen: boolean;
  roundId: number;
  onParticipation: (m: "playing" | "observing") => void;
  onStartRound: () => void;
  onEndRound: () => void;
}) {
  return (
    <Card eyebrow={`Runde ${roundId}`} title="Spielstatus">
      <div className="flex flex-wrap items-center gap-3">
        <span className="text-sm text-ink-muted">Ich bin am Tisch:</span>
        <div className="flex rounded-lg border border-border p-0.5">
          {(
            [
              ["playing", "Ich spiele"],
              ["observing", "Ich spiele nicht"],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => onParticipation(value)}
              className={clsx(
                "rounded-md px-3 py-1.5 text-sm transition",
                mode === value
                  ? "bg-emerald-mist/60 text-neon"
                  : "text-ink-muted hover:text-ink"
              )}
            >
              {label}
            </button>
          ))}
        </div>
        <span className="text-xs text-ink-faint">
          {roundOpen ? "Runde läuft" : "Keine aktive Runde"}
        </span>
        <div className="ml-auto flex gap-2">
          <Button type="button" variant="primary" disabled={roundOpen} onClick={onStartRound}>
            Runde starten
          </Button>
          <Button type="button" variant="secondary" disabled={!roundOpen} onClick={onEndRound}>
            Runde beenden
          </Button>
        </div>
      </div>
      {mode === "observing" ? (
        <p className="mt-2 text-xs text-ink-muted">
          Beobachtungsmodus: Karten können für den Tisch erfasst werden, ohne eine
          Spielerentscheidung.
        </p>
      ) : null}
    </Card>
  );
}
