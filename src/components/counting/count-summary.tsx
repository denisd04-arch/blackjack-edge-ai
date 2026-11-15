"use client";

import type { CountSnapshot } from "@blackjack-edge/engine";
import { DataPanel, DataPanelGrid } from "@/components/ui/data-panel";

export function CountSummary({
  counts,
  compact = false,
}: {
  counts: CountSnapshot;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex flex-wrap gap-3 text-sm font-mono text-accent">
        <span>
          Hi-Lo RC {formatSigned(counts.hiLo.running)} / TC{" "}
          {formatSigned(counts.hiLo.true)}
        </span>
        <span className="text-ink-muted">·</span>
        <span>
          ΩII RC {formatSigned(counts.omegaII.running)} / TC{" "}
          {formatSigned(counts.omegaII.true)}
        </span>
      </div>
    );
  }

  return (
    <DataPanelGrid>
      <DataPanel
        label="Hi-Lo Running"
        value={formatSigned(counts.hiLo.running)}
        hint={`True ${formatSigned(counts.hiLo.true)}`}
      />
      <DataPanel
        label="Omega II Running"
        value={formatSigned(counts.omegaII.running)}
        hint={`True ${formatSigned(counts.omegaII.true)}`}
      />
      <DataPanel
        label="Decks übrig"
        value={counts.decksRemaining.toFixed(2)}
        hint={`Penetration ${counts.penetration}%`}
      />
      <DataPanel
        label="Komposition"
        value={`${counts.composition.low2to9} · ${counts.composition.tens} · ${counts.composition.aces}`}
        hint="2–9 · Zehner · Asse"
      />
    </DataPanelGrid>
  );
}

function formatSigned(n: number): string {
  return n > 0 ? `+${n}` : String(n);
}