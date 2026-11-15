"use client";

import { useState } from "react";
import {
  CARD_RANKS,
  CARD_SUITS,
  RANK_LABEL_DE,
  SUIT_SYMBOL,
  TARGET_LABEL_DE,
  type CardRank,
  type CardSuit,
  type CardTarget,
  type DealtCard,
} from "@blackjack-edge/engine";
import { Button } from "@/components/ui/button";

type DealtListProps = {
  cards: readonly DealtCard[];
  onUndo: () => void;
  onRemove: (id: string) => void;
  onEdit: (
    id: string,
    rank: CardRank,
    suit: CardSuit,
    target: CardTarget
  ) => void;
  disabled?: boolean;
};

export function DealtList({
  cards,
  onUndo,
  onRemove,
  onEdit,
  disabled,
}: DealtListProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const roundCards = [...cards].sort((a, b) => b.sequence - a.sequence);

  return (
    <section className="rounded-card border border-border bg-canvas-graphite/40 p-4">
      <DealtListHeader onUndo={onUndo} disabled={disabled || cards.length === 0} />
      <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto">
        {roundCards.length === 0 ? (
          <li className="text-sm text-ink-muted">Noch keine Karten erfasst.</li>
        ) : (
          roundCards.map((card) => (
            <li
              key={card.id}
              className="rounded-lg border border-border/70 bg-canvas-panel/50 px-3 py-2"
            >
              {editingId === card.id ? (
                <EditRow
                  card={card}
                  onSave={(rank, suit, target) => {
                    onEdit(card.id, rank, suit, target);
                    setEditingId(null);
                  }}
                  onCancel={() => setEditingId(null)}
                />
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-mono text-sm text-ink">
                    <span
                      className={
                        card.suit === "hearts" || card.suit === "diamonds"
                          ? "text-danger"
                          : ""
                      }
                    >
                      {RANK_LABEL_DE[card.rank]}
                      {SUIT_SYMBOL[card.suit]}
                    </span>
                    <span className="ml-2 text-ink-muted">
                      → {TARGET_LABEL_DE[card.target]}
                    </span>
                    <span className="ml-2 text-xs text-ink-faint">
                      R{card.roundId}
                    </span>
                  </span>
                  <span className="flex gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-2 py-1 text-xs"
                      disabled={disabled}
                      onClick={() => setEditingId(card.id)}
                    >
                      Bearbeiten
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="px-2 py-1 text-xs text-danger"
                      disabled={disabled}
                      onClick={() => onRemove(card.id)}
                    >
                      Entfernen
                    </Button>
                  </span>
                </div>
              )}
            </li>
          ))
        )}
      </ul>
    </section>
  );
}

function DealtListHeader({
  onUndo,
  disabled,
}: {
  onUndo: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <h3 className="text-sm font-semibold text-ink">Kartenlog</h3>
      <Button type="button" variant="secondary" disabled={disabled} onClick={onUndo}>
        Rückgängig
      </Button>
    </div>
  );
}

function EditRow({
  card,
  onSave,
  onCancel,
}: {
  card: DealtCard;
  onSave: (rank: CardRank, suit: CardSuit, target: CardTarget) => void;
  onCancel: () => void;
}) {
  const [rank, setRank] = useState(card.rank);
  const [suit, setSuit] = useState(card.suit);
  const [target, setTarget] = useState(card.target);

  return (
    <div className="grid gap-2 sm:grid-cols-4">
      <select
        value={rank}
        onChange={(e) => setRank(e.target.value as CardRank)}
        className="rounded border border-border bg-canvas px-2 py-1 text-sm"
      >
        {CARD_RANKS.map((r) => (
          <option key={r} value={r}>
            {RANK_LABEL_DE[r]}
          </option>
        ))}
      </select>
      <select
        value={suit}
        onChange={(e) => setSuit(e.target.value as CardSuit)}
        className="rounded border border-border bg-canvas px-2 py-1 text-sm"
      >
        {CARD_SUITS.map((s) => (
          <option key={s} value={s}>
            {s}
          </option>
        ))}
      </select>
      <select
        value={target}
        onChange={(e) => setTarget(e.target.value as CardTarget)}
        className="rounded border border-border bg-canvas px-2 py-1 text-sm"
      >
        {(["player", "dealer", "other"] as CardTarget[]).map((t) => (
          <option key={t} value={t}>
            {TARGET_LABEL_DE[t]}
          </option>
        ))}
      </select>
      <span className="flex gap-1">
        <Button
          type="button"
          variant="primary"
          className="px-2 py-1 text-xs"
          onClick={() => onSave(rank, suit, target)}
        >
          Speichern
        </Button>
        <Button type="button" variant="ghost" className="px-2 py-1 text-xs" onClick={onCancel}>
          Abbrechen
        </Button>
      </span>
    </div>
  );
}