"use client";

import { InfiniteShell } from "@/components/infinite/shell";
import { useInfinite } from "@/lib/use-infinite";

export default function ForwardPage() {
  const { snapshots, session } = useInfinite();
  return (
    <InfiniteShell>
      <h1 className="font-display text-3xl">Forward testing</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#f6f1e4]/70">
        Each row was frozen before the round was dealt. Acting on the table does not rewrite it. Counting continues on the same shoe after you stand.
      </p>
      <p className="mt-2 text-sm">Shoe {session.id} · events {session.events.length} · overrides {session.overrides.length}</p>
      <ul className="mt-4 space-y-2">
        {snapshots.length === 0 ? <li className="text-sm text-[#f6f1e4]/60">No frozen recommendation yet.</li> : null}
        {snapshots.map((snap) => (
          <li key={snap.id} className="rounded-xl border border-[#e2c27a]/30 p-3 text-sm">
            <p>Round {snap.round} · {snap.recommendation} · edge {snap.playerEdge === null ? "n/a" : `${(snap.playerEdge * 100).toFixed(2)}%`}</p>
            <p className="text-xs text-[#f6f1e4]/60">{snap.at} · {snap.quality} · {snap.paytableId} · help RTP is not this edge</p>
          </li>
        ))}
      </ul>
      <h2 className="mt-6 text-lg">Your overrides</h2>
      <ul className="mt-2 text-sm">
        {session.overrides.map((row, i) => (
          <li key={`${row.round}-${i}`}>Round {row.round}: recommended {row.recommended}, you chose {row.chosen}</li>
        ))}
      </ul>
    </InfiniteShell>
  );
}
