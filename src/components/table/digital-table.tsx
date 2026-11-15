"use client";

import { useState } from "react";
import clsx from "clsx";
import type { CardRank, CardTarget } from "@blackjack-edge/engine";
import { StubBlackjackMathEngine, EVOLUTION_FREE_BET_STUB } from "@blackjack-edge/engine";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { CardPicker } from "./card-picker";
import { DealtList } from "./dealt-list";
import { ShoePanel } from "./shoe-panel";
import { useTableSession } from "@/lib/table-session-context";
import { CountSummary } from "@/components/counting/count-summary";

export function DigitalTable() {
  const { snapshot, lastError, actions, clearError } = useTableSession();
  const [target, setTarget] = useState<CardTarget>("player");
  const [selectedRank, setSelectedRank] = useState<CardRank | null>(null);
  const engineNote = new StubBlackjackMathEngine(EVOLUTION_FREE_BET_STUB).health()
    .messageDe;
  const inputDisabled = !snapshot.roundOpen;

  return (
    <AppShell
      title="Digitaler Tisch"
      subtitle="Manuelle Karteneingabe mit Schuh-Validierung — Zählung in Echtzeit, EV in Phase 4."
    >
      <CountSummary counts={snapshot.counts} compact />
      {lastError ? (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-danger/50 bg-danger/10 px-4 py-2 text-sm text-danger"
        >
          {lastError}
          <button
            type="button"
            className="ml-3 text-xs underline"
            onClick={clearError}
          >
            Schließen
          </button>
        </div>
      ) : null}

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <ParticipationBar
            mode={snapshot.participation}
            roundOpen={snapshot.roundOpen}
            roundId={snapshot.roundId}
            onParticipation={actions.setParticipation}
            onStartRound={actions.startRound}
            onEndRound={actions.endRound}
          />
          <CardPicker
            disabled={inputDisabled}
            target={target}
            onTargetChange={setTarget}
            selectedRank={selectedRank}
            onRankSelect={(rank) => {
              setSelectedRank(rank);
              clearError();
            }}
            onPick={(rank, suit, t) => {
              if (actions.deal(rank, suit, t)) setSelectedRank(null);
            }}
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
          <Card title="Engine-Hinweis" eyebrow="Kein EV">
            <p className="text-sm text-ink-muted">{engineNote}</p>
            <p className="mt-2 text-xs text-ink-faint">
              Zählung und Restinventar-Visualisierung folgen in Phase 3 (
              <code className="font-mono">/karten</code>).
            </p>
          </Card>
        </aside>
      </div>
    </AppShell>
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
          <Button
            type="button"
            variant="primary"
            disabled={roundOpen}
            onClick={onStartRound}
          >
            Runde starten
          </Button>
          <Button
            type="button"
            variant="secondary"
            disabled={!roundOpen}
            onClick={onEndRound}
          >
            Runde beenden
          </Button>
        </div>
      </div>
      {mode === "observing" ? (
        <p className="mt-2 text-xs text-ink-muted">
          Beobachtungsmodus: Karten können für den Tisch erfasst werden (für
          spätere Zählung), ohne Spieler-Entscheidungen in Phase 5.
        </p>
      ) : null}
    </Card>
  );
}