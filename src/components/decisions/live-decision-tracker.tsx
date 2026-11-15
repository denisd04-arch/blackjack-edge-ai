"use client";

import clsx from "clsx";
import {
  actionLabelDe,
  isDeviation,
  liveHandFromDealt,
  type PlayerAction,
} from "@blackjack-edge/engine";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDecisionTracker } from "@/lib/decision-tracker-context";
import { useTableSession } from "@/lib/table-session-context";

const ACTIONS: PlayerAction[] = ["stand", "hit", "double", "split"];

export function LiveDecisionTracker() {
  const { snapshot } = useTableSession();
  const { entries, recordActual, clearLog } = useDecisionTracker();

  const live = liveHandFromDealt(
    snapshot.dealt,
    snapshot.roundId,
    snapshot.roundOpen,
    snapshot.participation
  );

  const latest = entries.length > 0 ? entries[entries.length - 1] : null;

  return (
    <Card
      className="mt-6"
      eyebrow="Live"
      title="Entscheidungstracker (Session)"
    >
      <p className="mb-3 text-sm text-ink-muted">
        Automatische EV-Snapshots bei neuer Spielerhand auf dem Tisch — nur mit
        Referenzprofil Standard H17. Keine DB-Persistenz (Phase 5 client-only).
      </p>

      <div className="rounded-lg border border-line bg-canvas-graphite/40 px-4 py-3 text-sm">
        <p className="font-medium text-ink">Aktuelle Runde</p>
        {live.ready ? (
          <p className="mt-1 font-mono text-neon">
            Spieler [{live.playerCards.join(" ")}] · Dealer{" "}
            {live.dealerUpcard}
          </p>
        ) : (
          <p className="mt-1 text-ink-muted">{live.reasonDe}</p>
        )}
        {latest && live.ready ? (
          <p className="mt-2 text-xs text-ink-muted">
            Letzte Empfehlung:{" "}
            {latest.definitive && latest.recommended
              ? `${actionLabelDe(latest.recommended)} (EV ${formatEv(latest.recommendedEv)})`
              : latest.messageDe}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="ghost" onClick={clearLog}>
          Log leeren
        </Button>
      </div>

      {entries.length === 0 ? (
        <p className="mt-4 text-sm text-ink-muted">
          Noch keine Entscheidungspunkte — Karten auf /tisch erfassen (Ich
          spiele, Runde offen).
        </p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-line text-left text-ink-muted">
                <th className="py-2 pr-2">Runde</th>
                <th className="py-2 pr-2">Hand</th>
                <th className="py-2 pr-2">Empfehlung</th>
                <th className="py-2 pr-2">EV</th>
                <th className="py-2 pr-2">Tatsächlich</th>
              </tr>
            </thead>
            <tbody>
              {[...entries].reverse().map((e) => (
                <tr
                  key={e.id}
                  className={clsx(
                    "border-b border-line/50",
                    isDeviation(e) && "bg-danger/10"
                  )}
                >
                  <td className="py-2 pr-2 font-mono">{e.roundId}</td>
                  <td className="py-2 pr-2 font-mono">
                    {e.playerCards.join(" ")} vs {e.dealerUpcard}
                  </td>
                  <td className="py-2 pr-2">
                    {e.definitive && e.recommended
                      ? actionLabelDe(e.recommended)
                      : "—"}
                  </td>
                  <td className="py-2 pr-2 font-mono">
                    {e.recommendedEv != null ? formatEv(e.recommendedEv) : "—"}
                  </td>
                  <td className="py-2 pr-2">
                    <div className="flex flex-wrap gap-1">
                      {ACTIONS.map((a) => (
                        <button
                          key={a}
                          type="button"
                          onClick={() => recordActual(e.id, a)}
                          className={clsx(
                            "rounded border px-1.5 py-0.5 text-xs",
                            e.actualAction === a
                              ? "border-neon text-neon"
                              : "border-line text-ink-muted hover:border-neon"
                          )}
                        >
                          {actionLabelDe(a)}
                        </button>
                      ))}
                    </div>
                    {e.actualEv != null ? (
                      <span className="mt-1 block text-xs font-mono text-ink-muted">
                        EV {formatEv(e.actualEv)}
                      </span>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function formatEv(ev: number | null): string {
  if (ev == null) return "—";
  return ev > 0 ? `+${ev.toFixed(3)}` : ev.toFixed(3);
}
