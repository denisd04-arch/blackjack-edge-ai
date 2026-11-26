"use client";

import { PRESETS, type PresetId, type TableSettings } from "@blackjack-edge/engine";
import type { ReactNode } from "react";
import { InfiniteShell } from "@/components/infinite/shell";
import { presetBlurb, presetLabel } from "@/components/infinite/copy";
import { useInfinite } from "@/lib/use-infinite";

const IDS = Object.keys(PRESETS) as Exclude<PresetId, "CUSTOM">[];

export default function SettingsPage() {
  const { settings, setSettings, customPresets, savePreset, renamePreset, deletePreset } = useInfinite();
  const patch = (partial: Partial<TableSettings>) => setSettings({ ...settings, ...partial, presetId: "CUSTOM" });
  return (
    <InfiniteShell>
      <h1 className="font-display text-3xl">Einstellungen</h1>
      <p className="mt-2 max-w-2xl text-sm text-[#f6f1e4]/70">
        Presets bleiben auf Paytable Version 2. Cut Card und Decks gelten für den nächsten Shoe. Der offene Shoe bleibt unverändert. Ohne Anmeldung liegt alles in diesem Browser.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        {IDS.map((id) => (
          <button
            key={id}
            type="button"
            className="min-h-11 rounded-lg border border-[#e2c27a]/40 px-3 text-left"
            onClick={() => setSettings(PRESETS[id])}
          >
            <span className="block font-semibold">{presetLabel(id)}</span>
            <span className="block max-w-xs text-xs text-[#f6f1e4]/70">{presetBlurb(id)}</span>
          </button>
        ))}
      </div>
      <p className="mt-4 text-sm">Aktives Preset: {presetLabel(settings.presetId)}. {presetBlurb(settings.presetId)}</p>
      <form
        className="mt-3 flex flex-wrap gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          savePreset(String(data.get("name") ?? ""));
          event.currentTarget.reset();
        }}
      >
        <input name="name" aria-label="Preset-Name" className="min-h-11 rounded-lg bg-[#0c3b2e] px-3" placeholder="Name für dieses Preset" />
        <button type="submit" className="min-h-11 rounded-lg bg-[#e2c27a] px-4 text-[#1a1408]">Preset speichern</button>
      </form>
      <ul className="mt-3 space-y-2">
        {customPresets.map((preset) => (
          <li key={preset.id} className="flex flex-wrap items-center gap-2 text-sm">
            <button type="button" className="min-h-11 rounded-lg border border-[#e2c27a]/40 px-3" onClick={() => setSettings(preset.settings)}>
              {preset.name}
            </button>
            <input
              aria-label={`Preset umbenennen ${preset.name}`}
              className="min-h-11 rounded-lg bg-[#0c3b2e] px-3"
              defaultValue={preset.name}
              onBlur={(event) => renamePreset(preset.id, event.target.value)}
            />
            <button type="button" className="min-h-11 rounded-lg border border-white/20 px-3" onClick={() => deletePreset(preset.id)}>
              Löschen
            </button>
          </li>
        ))}
      </ul>
      <form className="mt-6 grid max-w-2xl gap-4">
        <Field
          label="Currency"
          hint="How money amounts are labeled."
          detail="Changes the currency shown next to the bankroll and the suggested stake. It does not change main expected value, side bets, the count, testing, or forward testing."
        >
          <select className="mt-1 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3" value={settings.currency} onChange={(e) => patch({ currency: e.target.value as TableSettings["currency"] })}>
            <option value="EUR">EUR</option>
            <option value="USD">USD</option>
            <option value="units">units</option>
          </select>
        </Field>
        <Field
          label="Bankroll"
          hint="The bankroll Kelly uses for stake size."
          detail="Changes sizing only. It does not change main expected value, side-bet expected value, or the cards drawn in a test shoe. Forward testing still freezes the recommendation, not this number."
        >
          <input className="mt-1 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3" type="number" value={settings.bankroll} onChange={(e) => patch({ bankroll: Number(e.target.value) })} />
        </Field>
        <Field
          label={`Kelly fraction (${settings.kellyFraction})`}
          hint="Scales the full Kelly stake."
          detail="Changes sizing only. It does not change expected value. While the main model is partially verified, the suggested stake stays at zero even if this fraction is larger."
        >
          <input className="mt-1 block min-h-11 w-full" type="range" min={0.1} max={1} step={0.05} value={settings.kellyFraction} onChange={(e) => patch({ kellyFraction: Number(e.target.value) })} />
        </Field>
        <Field
          label="Minimum edge"
          hint="How far above zero the edge must be before it can qualify."
          detail="Changes the next-round advisor and the side-bet skip threshold. It does not change the computed expected value. It cannot turn a partially verified positive edge into Play."
        >
          <input className="mt-1 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3" type="number" step={0.001} value={settings.minEdge} onChange={(e) => patch({ minEdge: Number(e.target.value) })} />
        </Field>
        <Field
          label="Count system"
          hint="Which published weights make the running count and true count."
          detail="Changes the running count, the true count, and a count-filter skip. It does not replace the composition expected value and it does not change side-bet math, the paytable, or the cards in a test shoe."
        >
          <select className="mt-1 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3" value={settings.countSystem} onChange={(e) => patch({ countSystem: e.target.value as TableSettings["countSystem"] })}>
            <option value="hi_lo">Hi-Lo</option>
            <option value="ko">KO</option>
            <option value="omega_ii">Omega II</option>
            <option value="zen">Zen</option>
          </select>
        </Field>
        <Field
          label="Count threshold"
          hint="Optional extra skip when the true count is below this number."
          detail="When set, the advisor skips if the true count is missing or below the threshold. Clear it to stop using the filter. It does not change expected value, side bets, or forward-test history already frozen."
        >
          <input
            className="mt-1 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3"
            type="number"
            step={0.5}
            value={settings.countThreshold ?? ""}
            placeholder="Unused"
            onChange={(e) => patch({ countThreshold: e.target.value === "" ? null : Number(e.target.value) })}
          />
        </Field>
        <Field
          label="Cut Card"
          hint="Gilt für den nächsten Shoe, nicht für den laufenden."
          detail="Der nächste Shoe stoppt bei diesem Cut. Der laufende Shoe behält seinen Cut. Erwartungswert und Paytable bleiben gleich."
        >
          <select
            className="mt-1 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3"
            value={settings.cut.mode}
            onChange={(e) => {
              const mode = e.target.value;
              if (mode === "CUT_AFTER_CARDS_DEALT") patch({ cut: { mode, cardsDealt: 312 } });
              else if (mode === "CUT_AFTER_REMAINING") patch({ cut: { mode, cardsRemaining: 104 } });
              else if (mode === "PERCENT_PENETRATION") patch({ cut: { mode, penetration: 0.75 } });
              else patch({ cut: { mode: "MANUAL", fired: false } });
            }}
          >
            <option value="CUT_AFTER_CARDS_DEALT">After this many cards dealt</option>
            <option value="CUT_AFTER_REMAINING">When this many cards remain</option>
            <option value="PERCENT_PENETRATION">After this share of the shoe</option>
            <option value="MANUAL">Manual</option>
          </select>
          {settings.cut.mode === "CUT_AFTER_CARDS_DEALT" ? (
            <input className="mt-2 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3" type="number" value={settings.cut.cardsDealt} onChange={(e) => patch({ cut: { mode: "CUT_AFTER_CARDS_DEALT", cardsDealt: Number(e.target.value) } })} />
          ) : null}
          {settings.cut.mode === "CUT_AFTER_REMAINING" ? (
            <input className="mt-2 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3" type="number" value={settings.cut.cardsRemaining} onChange={(e) => patch({ cut: { mode: "CUT_AFTER_REMAINING", cardsRemaining: Number(e.target.value) } })} />
          ) : null}
          {settings.cut.mode === "PERCENT_PENETRATION" ? (
            <input className="mt-2 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3" type="number" min={0.1} max={1} step={0.05} value={settings.cut.penetration} onChange={(e) => patch({ cut: { mode: "PERCENT_PENETRATION", penetration: Number(e.target.value) } })} />
          ) : null}
        </Field>
        <Field
          label="Decks"
          hint="8 Decks sind die verifizierte Infinite-Vorgabe. Gilt ab dem nächsten Shoe."
          detail="Ändert die Kartenmenge des nächsten Shoes. Der laufende Shoe zählt weiter mit der Deckzahl, mit der er begonnen hat."
        >
          <input className="mt-1 block min-h-11 w-full rounded-lg bg-[#0c3b2e] px-3" type="number" min={1} max={8} value={settings.decks ?? 8} onChange={(e) => patch({ decks: Math.min(8, Math.max(1, Math.round(Number(e.target.value) || 8))) })} />
        </Field>
        <Field
          label="Side bets"
          hint="Schaltet, ob Side Bets gesetzt werden."
          detail="Aus: die vier Side Bets werden weiter gerechnet, aber keine davon wird gesetzt. Bust It bleibt UNVERIFIED. Die Paytable ändert sich nicht."
        >
          <label className="mt-1 flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.sideBets} onChange={(e) => patch({ sideBets: e.target.checked })} />
            Side Bets in diesem Preset setzen
          </label>
        </Field>
        <Field
          label="Experimental free-bet comparison"
          hint="A second stake figure next to Kelly."
          detail="Changes a sizing display only. The figure is not an optimal stake and it does not change main expected value, side bets, or the paytable."
        >
          <label className="mt-1 flex min-h-11 items-center gap-2 text-sm">
            <input type="checkbox" checked={settings.experimentalFreeBetComparison} onChange={(e) => patch({ experimentalFreeBetComparison: e.target.checked })} />
            Show the experimental comparison
          </label>
        </Field>
      </form>
    </InfiniteShell>
  );
}

function Field({
  label,
  hint,
  detail,
  children,
}: {
  label: string;
  hint: string;
  detail: string;
  children: ReactNode;
}) {
  return (
    <fieldset className="rounded-xl border border-white/10 p-3">
      <legend className="px-1 text-sm font-semibold">{label}</legend>
      <p className="text-sm text-[#f6f1e4]/70">{hint}</p>
      {children}
      <details className="mt-2">
        <summary className="min-h-11 cursor-pointer text-sm text-[#e2c27a]">What this does</summary>
        <p className="pb-2 text-sm text-[#f6f1e4]/80">{detail}</p>
      </details>
    </fieldset>
  );
}
