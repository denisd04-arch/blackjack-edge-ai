"use client";

import { consumeShoe, settingsSnapshot } from "@blackjack-edge/engine";
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
  const [note, setNote] = useState("No batch yet.");
  const snapshot = settingsSnapshot(settings);

  async function run(count: number) {
    setRunning(true);
    const next: Row[] = [];
    const background = count > 200 ? 1 : 4;
    for (let i = 0; i < count; i += 1) {
      const seed = 1000 + i;
      const result = consumeShoe({
        seed,
        cutDealt: snapshot.cut.mode === "CUT_AFTER_CARDS_DEALT" ? snapshot.cut.cardsDealt : 312,
        backgroundCards: background,
        maxRounds: 40,
      });
      const split = i < count * 0.5 ? "train" : i < count * 0.75 ? "validation" : "holdout";
      next.push({ seed, net: result.net, rounds: result.rounds, split });
      if (i % 5 === 0) {
        setRows([...next]);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
    setRows(next);
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
      <h1 className="font-display text-3xl">Testing</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#f6f1e4]/70">
        Manual entry stays on the main shoe. Autoplay and multi-shoe runs use one fixed rules policy, draw real background cards, and stop at the cut. Settings are copied before the run.
      </p>
      <p className="mt-2 font-mono text-xs">Snapshot preset {snapshot.presetId} · paytable {snapshot.paytableId}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <button type="button" className="min-h-11 rounded-lg bg-[#e2c27a] px-4 text-[#1a1408]" disabled={running} onClick={() => run(10)}>10 shoes</button>
        <button type="button" className="min-h-11 rounded-lg border border-[#e2c27a] px-4" disabled={running} onClick={() => run(50)}>50 shoes</button>
      </div>
      <p className="mt-3 text-sm">{running ? "Running off the interaction, one shoe at a time." : note}</p>
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
