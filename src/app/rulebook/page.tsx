"use client";

import { FRESH_SHOE_HELP_REFERENCE, INFINITE_RULE_FIELDS, PAYTABLE_V2, freshShoeGapNotes } from "@blackjack-edge/engine";
import { useMemo } from "react";
import { InfiniteShell } from "@/components/infinite/shell";

export default function RulebookPage() {
  const gap = useMemo(() => freshShoeGapNotes(), []);
  return (
    <InfiniteShell>
      <h1 className="font-display text-3xl">Rulebook</h1>
      <p className="mt-2 max-w-3xl text-sm text-[#f6f1e4]/70">
        Help-screen RTP is a fresh-shoe reference. It is not the edge of the shoe you are in.
      </p>
      <ul className="mt-4 grid gap-2 md:grid-cols-2">
        <li className="rounded-xl bg-[#0c3b2e] p-3 text-sm">Blackjack help reference {(FRESH_SHOE_HELP_REFERENCE.blackjack * 100).toFixed(2)}%</li>
        <li className="rounded-xl bg-[#0c3b2e] p-3 text-sm">Pairs help reference {(FRESH_SHOE_HELP_REFERENCE.perfectPairs * 100).toFixed(2)}% · computed {(gap.pairs * 100).toFixed(4)}%</li>
        <li className="rounded-xl bg-[#0c3b2e] p-3 text-sm">21+3 help reference {(FRESH_SHOE_HELP_REFERENCE.twentyOnePlusThree * 100).toFixed(2)}% · computed {(gap.twentyOnePlusThree * 100).toFixed(4)}%</li>
        <li className="rounded-xl bg-[#0c3b2e] p-3 text-sm">Hot 3 help reference {(FRESH_SHOE_HELP_REFERENCE.hot3 * 100).toFixed(2)}% · computed {(gap.hot3 * 100).toFixed(4)}%</li>
        <li className="rounded-xl bg-[#0c3b2e] p-3 text-sm">Bust It help reference {(FRESH_SHOE_HELP_REFERENCE.bustIt * 100).toFixed(2)}% · computed if 22 pays {(gap.bustItIf22Pays * 100).toFixed(4)}%</li>
      </ul>
      <p className="mt-4 max-w-3xl text-sm">{gap.explanation}</p>
      <h2 className="mt-8 text-xl">Paytable {PAYTABLE_V2.id}</h2>
      <pre className="mt-2 overflow-auto rounded-xl bg-black/40 p-3 text-xs">{JSON.stringify(PAYTABLE_V2, null, 2)}</pre>
      <h2 className="mt-8 text-xl">Rules</h2>
      <ul className="mt-2 space-y-2">
        {INFINITE_RULE_FIELDS.map((rule) => (
          <li key={rule.id} className="rounded-xl border border-white/10 p-3 text-sm">
            <div className="flex flex-wrap justify-between gap-2">
              <strong>{rule.label}</strong>
              <span className="text-[#e2c27a]">{rule.status}</span>
            </div>
            <p className="mt-1 text-[#f6f1e4]/70">{rule.explanation}</p>
            <p className="mt-1 font-mono text-xs">value {JSON.stringify(rule.override ?? rule.value)} · {rule.source} · {rule.date}</p>
          </li>
        ))}
      </ul>
    </InfiniteShell>
  );
}
