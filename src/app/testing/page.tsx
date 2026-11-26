"use client";

import { playShoeEngine, settingsSnapshot } from "@blackjack-edge/engine";
import Link from "next/link";
import { useState } from "react";
import { InfiniteShell } from "@/components/infinite/shell";
import { useInfinite } from "@/lib/use-infinite";

interface Row {
  seed: number;
  net: number;
  rounds: number;
  split: "train" | "validation" | "holdout";
}

export default function TestingPage() {
  const { settings } = useInfinite();
  const [rows, setRows] = useState<Row[]>([]);
  const [running, setRunning] = useState(false);
  const [note, setNote] = useState("Noch kein Lauf.");
  const [moneyNote, setMoneyNote] = useState("Noch kein Shoe.");
  const [custom, setCustom] = useState(25);
  const snapshot = settingsSnapshot(settings);

  async function run(count: number) {
    setRunning(true);
    const next: Row[] = [];
    const background = count > 200 ? 1 : 2;
    for (let i = 0; i < count; i += 1) {
      const seed = 1000 + i;
      const result = playShoeEngine({
        seed,
        cutDealt: snapshot.cut.mode === "CUT_AFTER_CARDS_DEALT" ? snapshot.cut.cardsDealt : 312,
        extraBurns: background,
        maxRounds: count > 100 ? 8 : 20,
        stake: "flat",
        sideBets: snapshot.sideBets,
        otherPlayers: 1,
        bankroll: snapshot.bankroll,
        decks: snapshot.decks ?? 8,
      });
      const split = i < count * 0.5 ? "train" : i < count * 0.75 ? "validation" : "holdout";
      next.push({ seed, net: result.totalNet, rounds: result.rounds, split });
      if (i % 5 === 0) {
        setRows([...next]);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    setRows(next);
    const total = next.reduce((sum, row) => sum + row.net, 0);
    setMoneyNote(
      `Summe ${total.toFixed(2)} über ${next.length} Shoes. Dieselbe Engine wie der Tisch. Kein Profitabilitätsbeleg, solange das Hauptspiel nur teilweise verifiziert ist.`
    );
    const hold = next.filter((r) => r.split === "holdout");
    const holdMean = hold.reduce((s, r) => s + r.net, 0) / Math.max(1, hold.length);
    setNote(
      hold.length < 20
        ? "Sample is too small to name a winner. Classified by net result, not win rate. This is not a profitability claim."
        : `Holdout mean net ${holdMean.toFixed(2)} over ${hold.length} shoes. Not labeled optimal.`
    );
    setRunning(false);
  }

  const forecast = rows[0];
  return (
    <InfiniteShell>
      <h1 className="font-display text-3xl">Test</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#f6f1e4]/70">
        Manuelle Karten bleiben auf dem Tisch. Autoplay spielt volle Runden mit derselben Policy, inklusive Split, Double und Dealer. Der Lauf sieht keine zukünftigen Karten. Kein Profitabilitätsbeleg.
      </p>
      <p className="mt-2 font-mono text-xs">Snapshot preset {snapshot.presetId} · paytable {snapshot.paytableId}</p>
      <p className="mt-4 max-w-2xl text-sm">
        <Link href="/forward" className="font-semibold text-[#e2c27a] underline">
          Forward-Test
        </Link>
        {" "}
        opens the recommendations frozen before each round on the live shoe. A batch on this page does not rewrite them.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {[10, 50, 100, 500, 1000].map((count) => (
          <button key={count} type="button" className="min-h-11 rounded-lg border border-[#e2c27a] px-4" disabled={running} onClick={() => run(count)}>
            {count} Shoes
          </button>
        ))}
        <label className="flex min-h-11 items-center gap-2 text-sm">
          Eigene Anzahl
          <input className="min-h-11 w-24 rounded-lg bg-[#0c3b2e] px-2" type="number" min={1} value={custom} onChange={(event) => setCustom(Math.max(1, Math.round(Number(event.target.value) || 1)))} />
        </label>
        <button type="button" className="min-h-11 rounded-lg bg-[#e2c27a] px-4 text-[#1a1408]" disabled={running} onClick={() => run(custom)}>
          Start
        </button>
      </div>
      <p className="mt-3 text-sm">{running ? "Running off the interaction, one shoe at a time." : note}</p>
      <p className="mt-2 max-w-2xl text-sm">{moneyNote}</p>
      {forecast ? (
        <p className="mt-2 text-sm">
          First shoe net {forecast.net.toFixed(2)} after {forecast.rounds} consumed rounds. Five- and ten-round totals are prefixes of that shoe, not one round multiplied.
        </p>
      ) : null}
      <ul className="mt-4 max-h-80 space-y-1 overflow-auto text-sm">
        {rows.map((row) => (
          <li key={row.seed} className="flex justify-between gap-3">
            <span>seed {row.seed} · {row.split}</span>
            <span className="font-mono">{row.net.toFixed(2)} / {row.rounds} rounds</span>
          </li>
        ))}
      </ul>
    </InfiniteShell>
  );
}
