"use client";

import { useState } from "react";
import {
  compareForwardResult,
  forwardTestProjection,
  lockFromRecord,
  type ForwardLock,
} from "@blackjack-edge/engine";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useDecisionTracker } from "@/lib/decision-tracker-context";
import { useGameProfile } from "@/lib/game-profile-context";
import { useTableSession } from "@/lib/table-session-context";

export function ForwardtestView() {
  const { snapshot } = useTableSession();
  const { profile } = useGameProfile();
  const { entries } = useDecisionTracker();
  const [lock, setLock] = useState<ForwardLock | null>(null);
  const [realized, setRealized] = useState("");
  const projection = forwardTestProjection({
    counts: snapshot.counts,
    participationHandsRemaining: Math.max(
      0,
      snapshot.shoe.cardsRemaining - snapshot.shoe.cardsDealt
    ),
  });
  const latest = entries[entries.length - 1];
  const comparison =
    lock == null
      ? null
      : compareForwardResult(
          lock,
          realized.trim() === "" ? null : Number(realized)
        );

  function lockLatest() {
    setLock(
      lockFromRecord({
        profile,
        recommended: latest?.recommended ?? null,
        expectedEv: latest?.recommendedEv ?? null,
        definitive: latest?.definitive ?? false,
      })
    );
  }

  return (
    <AppShell
      title="Forwardtesting"
      subtitle="Empfehlung vor dem Ergebnis sperren. Eine Hand ist kein Vorteil."
    >
      <p className="text-sm text-warning">{projection.messageDe}</p>
      <Card className="mt-4" title="Sperre">
        <p className="text-sm text-ink-muted">
          {latest
            ? `Letzte Engine-Empfehlung: ${latest.recommended ?? "keine"} · EV ${
                latest.recommendedEv == null ? "—" : latest.recommendedEv.toFixed(4)
              }`
            : "Noch keine Entscheidung im Log."}
        </p>
        <Button className="mt-3" onClick={lockLatest} disabled={lock?.status === "LOCKED"}>
          Empfehlung sperren
        </Button>
        {lock ? (
          <p className="mt-3 text-sm text-ink">
            {lock.status === "LOCKED"
              ? `Gesperrt: ${lock.recommendation} · erwartet ${lock.expectedEv?.toFixed(4)}`
              : "INSUFFICIENT DATA"}
          </p>
        ) : null}
        <label className="mt-3 block text-sm text-ink-muted">
          Realisierter Spielergewinn (danach)
          <input
            className="mt-1 w-full rounded border border-line bg-transparent px-2 py-1"
            value={realized}
            onChange={(event) => setRealized(event.target.value)}
            inputMode="decimal"
          />
        </label>
        {comparison ? (
          <p className="mt-3 text-sm text-ink-muted">{comparison.messageDe}</p>
        ) : null}
      </Card>
      <Card className="mt-4" title="Schuh & Zählung">
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
          {projection.observationsDe.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Card>
      <Card className="mt-4" title="Nicht behauptet">
        <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
          {projection.nonClaimsDe.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Card>
    </AppShell>
  );
}
