"use client";

import clsx from "clsx";
import {
  CARD_RANKS,
  CARD_SUITS,
  RANK_LABEL_DE,
  SUIT_LABEL_DE,
  SUIT_SYMBOL,
  TARGET_LABEL_DE,
  type CardRank,
  type CardSuit,
  type CardTarget,
} from "@blackjack-edge/engine";

type CardPickerProps = {
  disabled?: boolean;
  onPick: (rank: CardRank, suit: CardSuit, target: CardTarget) => void;
  target: CardTarget;
  onTargetChange: (target: CardTarget) => void;
  selectedRank: CardRank | null;
  onRankSelect: (rank: CardRank) => void;
  targets?: readonly CardTarget[];
};

const DEFAULT_TARGETS: CardTarget[] = ["player", "dealer", "other"];

export function CardPicker({
  disabled,
  onPick,
  target,
  onTargetChange,
  selectedRank,
  onRankSelect,
  targets = DEFAULT_TARGETS,
}: CardPickerProps) {
  return (
    <PickerShell>
      <fieldset className="mb-4" disabled={disabled}>
        <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
          Ziel
        </legend>
        <div className="flex flex-wrap gap-2">
          {targets.map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onTargetChange(t)}
              className={clsx(
                "rounded-lg border px-3 py-1.5 text-sm transition",
                target === t
                  ? "border-neon bg-emerald-mist/50 text-neon"
                  : "border-border text-ink-muted hover:border-border-bright"
              )}
            >
              {TARGET_LABEL_DE[t]}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset disabled={disabled}>
        <legend className="mb-2 text-xs font-medium uppercase tracking-wide text-ink-faint">
          Rang (schnell)
        </legend>
        <div className="grid grid-cols-4 gap-1.5 sm:grid-cols-7 lg:grid-cols-[repeat(13,minmax(0,1fr))]">
          {CARD_RANKS.map((rank) => (
            <button
              key={rank}
              type="button"
              onClick={() => onRankSelect(rank)}
              className={clsx(
                "rounded-md border py-2 font-mono text-sm font-semibold transition",
                selectedRank === rank
                  ? "border-neon bg-neon/15 text-neon shadow-neon"
                  : "border-border bg-canvas-panel/60 text-ink hover:border-neon-dim"
              )}
            >
              {RANK_LABEL_DE[rank]}
            </button>
          ))}
        </div>
      </fieldset>

      {selectedRank && !disabled ? (
        <div className="mt-4">
          <p className="mb-2 text-xs uppercase tracking-wide text-ink-faint">
            Farbe für {RANK_LABEL_DE[selectedRank]}
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {CARD_SUITS.map((suit) => (
              <button
                key={suit}
                type="button"
                disabled={disabled}
                onClick={() => onPick(selectedRank, suit, target)}
                className={clsx(
                  "rounded-lg border px-3 py-3 text-sm font-medium transition",
                  suit === "hearts" || suit === "diamonds"
                    ? "text-danger"
                    : "text-ink",
                  "border-border hover:border-neon hover:bg-emerald-mist/30"
                )}
              >
                <span className="text-lg">{SUIT_SYMBOL[suit]}</span>
                <span className="ml-2">{SUIT_LABEL_DE[suit]}</span>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <p className="mt-4 text-sm text-ink-muted">
          Zuerst einen Rang wählen, dann die Farbe antippen.
        </p>
      )}
    </PickerShell>
  );
}

function PickerShell({ children }: { children: React.ReactNode }) {
  return (
    <section className="rounded-card border border-border bg-panel-glass p-4">
      {children}
    </section>
  );
}