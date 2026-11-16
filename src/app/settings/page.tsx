"use client";

import { PRESETS, type PresetId, type TableSettings } from "@blackjack-edge/engine";
import { InfiniteShell } from "@/components/infinite/shell";
import { useInfinite } from "@/lib/use-infinite";

const IDS = Object.keys(PRESETS) as PresetId[];

export default function SettingsPage() {
  const { settings, setSettings } = useInfinite();
  const patch = (partial: Partial<TableSettings>) => setSettings({ ...settings, ...partial, presetId: "CUSTOM" });
  return (
    <InfiniteShell>
      <h1 className="font-display text-3xl">Settings</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#f6f1e4]/70">
        Presets are version 2 and locked to paytable EVOLUTION_INFINITE_FREE_BET_PAYTABLE_V2. A test run stores a copy that later edits do not change.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {IDS.map((id) => (
          <button key={id} type="button" className="min-h-11 rounded-lg border border-[#e2c27a]/40 px-3" onClick={() => setSettings(PRESETS[id as keyof typeof PRESETS])}>
            {id.replaceAll("_", " ")}
          </button>
        ))}
      </div>
      <form className="mt-6 grid max-w-xl gap-3">
        <label className="text-sm">Currency
          <select className="mt-1 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3" value={settings.currency} onChange={(e) => patch({ currency: e.target.value as TableSettings["currency"] })}>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="units">units</option>
          </select>
        </label>
        <label className="text-sm">Bankroll
          <input className="mt-1 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3" type="number" value={settings.bankroll} onChange={(e) => patch({ bankroll: Number(e.target.value) })} />
        </label>
        <label className="text-sm">Kelly fraction ({settings.kellyFraction})
          <input className="mt-1 block w-full" type="range" min={0.1} max={1} step={0.05} value={settings.kellyFraction} onChange={(e) => patch({ kellyFraction: Number(e.target.value) })} />
        </label>
        <label className="text-sm">Minimum edge
          <input className="mt-1 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3" type="number" step={0.001} value={settings.minEdge} onChange={(e) => patch({ minEdge: Number(e.target.value) })} />
        </label>
        <label className="text-sm">Count system
          <select className="mt-1 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3" value={settings.countSystem} onChange={(e) => patch({ countSystem: e.target.value as TableSettings["countSystem"] })}>
            <option value="hi_lo">Hi-Lo</option>
            <option value="ko">KO</option>
            <option value="omega_ii">Omega II</option>
            <option value="zen">Zen</option>
          </select>
        </label>
        <label className="text-sm">Cut after cards dealt
          <input className="mt-1 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3" type="number" value={settings.cut.mode === "CUT_AFTER_CARDS_DEALT" ? settings.cut.cardsDealt : 312} onChange={(e) => patch({ cut: { mode: "CUT_AFTER_CARDS_DEALT", cardsDealt: Number(e.target.value) } })} />
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm">
          <input type="checkbox" checked={settings.experimentalFreeBetComparison} onChange={(e) => patch({ experimentalFreeBetComparison: e.target.checked })} />
          Show the experimental free-bet comparison next to Kelly. It is not an optimal stake.
        </label>
      </form>
    </InfiniteShell>
  );
}
