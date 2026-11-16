"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  CARD_RANKS,
  RANK_LABEL_DE,
  adviseParticipation,
  shoeIncludingVisible,
  FiniteShoeEvEngine,
  type CardRank,
} from "@blackjack-edge/engine";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { DataPanel, DataPanelGrid } from "@/components/ui/data-panel";
import { LiveDecisionTracker } from "@/components/decisions/live-decision-tracker";
import { useGameProfile } from "@/lib/game-profile-context";
import { useTableSession } from "@/lib/table-session-context";

export function DecisionAnalyzerView() {
  const { snapshot } = useTableSession();
  const { profile, profileId, setProfileId, profiles } = useGameProfile();
  const [playerCards, setPlayerCards] = useState<CardRank[]>([]);
  const [dealerUp, setDealerUp] = useState<CardRank | null>(null);
  const [restoreVisible, setRestoreVisible] = useState(false);

  const engine = useMemo(() => new FiniteShoeEvEngine(profile), [profile]);

  const analysis = useMemo(() => {
    if (!dealerUp || playerCards.length < 2) return null;
    const shoe = restoreVisible
      ? shoeIncludingVisible(snapshot.shoe.remainingByRank, [
          ...playerCards,
          dealerUp,
        ])
      : snapshot.shoe.remainingByRank;
    return engine.analyze({
      playerCards,
      dealerUpcard: dealerUp,
      shoeRemainingByRank: shoe,
    });
  }, [
    dealerUp,
    engine,
    playerCards,
    restoreVisible,
    snapshot.shoe.remainingByRank,
  ]);

  const participation = analysis ? adviseParticipation(analysis, profile) : null;

  function loadFromTableRound() {
    const roundCards = snapshot.dealt.filter((c) => c.roundId === snapshot.roundId);
    const player = roundCards
      .filter((c) => c.target === "player")
      .map((c) => c.rank);
    const dealer = roundCards
      .filter((c) => c.target === "dealer")
      .map((c) => c.rank);
    if (player.length >= 2 && dealer.length >= 1) {
      setPlayerCards(player.slice(0, 8));
      setDealerUp(dealer[0]);
      setRestoreVisible(true);
    }
  }

  function addPlayerRank(rank: CardRank) {
    setRestoreVisible(false);
    setPlayerCards((prev) => (prev.length >= 8 ? prev : [...prev, rank]));
  }

  function removePlayerAt(index: number) {
    setRestoreVisible(false);
    setPlayerCards((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <AppShell
      title="Entscheidungstracker"
      subtitle="Live-Tracking + manuelle Analyse — Finite-Shoe-EV, keine Mock-Werte."
    >
      <LiveDecisionTracker />
      <Card eyebrow="Profil" title="Regelwerk">
        <div className="flex flex-wrap gap-2">
          {profiles.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setProfileId(p.id)}
              className={clsx(
                "rounded-lg border px-3 py-1.5 text-sm",
                profileId === p.id
                  ? "border-neon bg-emerald-mist/40 text-neon"
                  : "border-line text-ink-muted"
              )}
            >
              {p.labelDe}
            </button>
          ))}
        </div>
        {profile.incomplete ? (
          <p className="mt-3 text-sm text-warning">
            Offene Felder: {profile.missingFields.join(", ")}. Hände, die davon
            abhängen, bekommen keine Empfehlung.
          </p>
        ) : (
          <p className="mt-3 text-sm text-ink-muted">
            Profil ist für bedingten Schuh-EV geschlossen. Das ist kein
            Hausvorteil.
          </p>
        )}
        <Button className="mt-3" variant="secondary" onClick={loadFromTableRound}>
          Aus aktueller Runde übernehmen
        </Button>
      </Card>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card title="Spielerhand" eyebrow="Eingabe">
          <p className="mb-2 text-xs text-ink-muted">
            Gewählte Karten ({playerCards.length}/5):{" "}
            {playerCards.map((r) => RANK_LABEL_DE[r]).join(", ") || "—"}
          </p>
          <div className="mb-2 flex flex-wrap gap-2">
            {playerCards.map((rank, i) => (
              <button
                key={`${rank}-${i}`}
                type="button"
                onClick={() => removePlayerAt(i)}
                className="rounded border border-neon/50 bg-emerald-mist/30 px-2 py-1 font-mono text-sm"
                title="Entfernen"
              >
                {rank} ×
              </button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {CARD_RANKS.map((rank) => (
              <button
                key={rank}
                type="button"
                onClick={() => addPlayerRank(rank)}
                className="rounded border border-line px-2 py-1 font-mono text-sm hover:border-neon"
              >
                {rank}
              </button>
            ))}
          </div>
          <Button
            className="mt-2"
            variant="ghost"
            onClick={() => setPlayerCards([])}
          >
            Spieler leeren
          </Button>
        </Card>
        <Card title="Dealer-Upcard" eyebrow="Eingabe">
          <div className="flex flex-wrap gap-2">
            {CARD_RANKS.map((rank) => (
              <button
                key={rank}
                type="button"
                onClick={() => setDealerUp(rank)}
                className={clsx(
                  "rounded border px-2 py-1 font-mono text-sm",
                  dealerUp === rank
                    ? "border-neon text-neon"
                    : "border-line hover:border-neon"
                )}
              >
                {RANK_LABEL_DE[rank]}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {!analysis ? (
        <p className="mt-6 text-sm text-ink-muted">
          Mindestens zwei Spielerkarten und eine Dealer-Upcard wählen.
        </p>
      ) : null}

      {analysis && !analysis.definitive ? (
        <p className="mt-6 rounded-lg border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-warning">
          {analysis.messageDe}
        </p>
      ) : null}

      {participation ? (
        <p className="mt-4 text-sm text-ink-muted">{participation.messageDe}</p>
      ) : null}

      {analysis?.insurance.offered ? (
        <p className="mt-2 text-sm text-ink-muted">
          {analysis.insurance.messageDe}{" "}
          {analysis.insurance.definitive &&
          analysis.insurance.evPerInsuranceUnit != null
            ? `EV je Versicherungseinheit ${analysis.insurance.evPerInsuranceUnit.toFixed(4)}.`
            : null}
        </p>
      ) : null}

      {analysis && analysis.definitive ? (
        <div className="mt-6 space-y-4">
          <p className="text-sm text-ink-muted">{analysis.messageDe}</p>
          <DataPanelGrid>
            <DataPanel
              label="Empfehlung"
              value={actionLabel(analysis.recommended)}
              hint={analysis.rulesLabelDe}
            />
            <DataPanel
              label="Dealer bust"
              value={`${analysis.dealerBustPct.toFixed(1)}%`}
            />
            {analysis.dealer22PushPct > 0 ? (
              <DataPanel
                label="Dealer 22 Push"
                value={`${analysis.dealer22PushPct.toFixed(1)}%`}
              />
            ) : null}
          </DataPanelGrid>
          <div className="overflow-x-auto rounded-xl border border-line">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-ink-muted">
                  <th className="px-3 py-2">Aktion</th>
                  <th className="px-3 py-2">EV</th>
                  <th className="px-3 py-2">Varianz</th>
                  <th className="px-3 py-2">Gewinn</th>
                  <th className="px-3 py-2">Push</th>
                  <th className="px-3 py-2">Verlust</th>
                  <th className="px-3 py-2">Max. Verlust</th>
                  <th className="px-3 py-2">Eigener Einsatz</th>
                </tr>
              </thead>
              <tbody>
                {analysis.actions.map((row) => (
                  <tr
                    key={row.action}
                    className={clsx(
                      "border-b border-line/50",
                      analysis.recommended === row.action && "bg-emerald-mist/20"
                    )}
                  >
                    <td className="px-3 py-2 font-medium">
                      {row.labelDe}
                      {!row.available ? (
                        <span className="ml-2 text-xs text-ink-faint">—</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {row.available ? formatEv(row.ev) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {row.available ? row.variance.toFixed(3) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {row.available ? `${row.winPct.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {row.available ? `${row.pushPct.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {row.available ? `${row.lossPct.toFixed(1)}%` : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {row.available ? row.maxLoss.toFixed(2) : "—"}
                    </td>
                    <td className="px-3 py-2 font-mono">
                      {row.available
                        ? `${row.playerStakeUnits.toFixed(0)}${
                            row.freeStakeUnits > 0 ? " + Free" : ""
                          }`
                        : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}
    </AppShell>
  );
}

function formatEv(ev: number): string {
  const s = ev > 0 ? "+" : "";
  return `${s}${ev.toFixed(4)}`;
}

function actionLabel(
  a: "stand" | "hit" | "double" | "split" | null
): string {
  if (!a) return "—";
  const map = {
    stand: "Stehen",
    hit: "Karte",
    double: "Verdoppeln",
    split: "Teilen",
  };
  return map[a];
}
