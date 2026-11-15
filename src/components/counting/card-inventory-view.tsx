"use client";

import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { ButtonLink } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useTableSession } from "@/lib/table-session-context";
import { CountSummary } from "./count-summary";
import { InventoryGrid } from "./inventory-grid";

export function CardInventoryView() {
  const { snapshot } = useTableSession();
  const { shoe, counts, dealt } = snapshot;

  return (
    <AppShell
      title="Karten & Zählung"
      subtitle="Inventar und Hi-Lo / Omega II — synchron mit dem digitalen Tisch (eine Schuhquelle)."
    >
      <CountSummary counts={counts} />

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2" eyebrow="Inventar" title="Verbleibende Karten">
          <p className="mb-4 text-sm text-ink-muted">
            Farbe und Rang — {shoe.cardsRemaining} von {shoe.cardsTotal} Karten im
            Schuh ({shoe.decks} Decks).
          </p>
          <InventoryGrid inventory={shoe.remainingBySuit} />
        </Card>
        <Card eyebrow="Schuh" title="Kennzahlen">
          <ul className="space-y-2 text-sm text-ink-muted">
            <li>
              Gespielt:{" "}
              <span className="font-mono text-ink">{shoe.cardsDealt}</span>
            </li>
            <li>
              Penetration:{" "}
              <span className="font-mono text-ink">{shoe.penetration}%</span>
            </li>
            <li>
              Decks übrig:{" "}
              <span className="font-mono text-ink">
                {counts.decksRemaining.toFixed(2)}
              </span>
            </li>
            <li>
              Karten 2–9 übrig:{" "}
              <span className="font-mono text-ink">
                {counts.composition.low2to9}
              </span>
            </li>
            <li>
              Zehner übrig:{" "}
              <span className="font-mono text-ink">{counts.composition.tens}</span>
            </li>
            <li>
              Asse übrig:{" "}
              <span className="font-mono text-ink">{counts.composition.aces}</span>
            </li>
          </ul>
          <div className="mt-4 flex flex-col gap-2">
            <ButtonLink href="/tisch" variant="primary">
              Zum digitalen Tisch
            </ButtonLink>
            {dealt.length === 0 ? (
              <p className="text-xs text-ink-muted">
                Noch keine Karten erfasst — Eingabe auf{" "}
                <Link href="/tisch" className="text-accent underline">
                  /tisch
                </Link>
                .
              </p>
            ) : null}
          </div>
        </Card>
      </div>
    </AppShell>
  );
}