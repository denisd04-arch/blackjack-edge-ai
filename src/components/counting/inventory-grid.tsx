"use client";

import clsx from "clsx";
import {
  CARD_RANKS,
  CARD_SUITS,
  RANK_LABEL_DE,
  SUIT_LABEL_DE,
  SUIT_SYMBOL,
  type SuitInventory,
} from "@blackjack-edge/engine";

export function InventoryGrid({ inventory }: { inventory: SuitInventory }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-surface/60">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-line text-left text-ink-muted">
            <th className="px-3 py-2 font-medium">Farbe</th>
            {CARD_RANKS.map((rank) => (
              <th key={rank} className="px-2 py-2 text-center font-mono">
                {RANK_LABEL_DE[rank]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {CARD_SUITS.map((suit) => (
            <tr key={suit} className="border-b border-line/60 last:border-0">
              <td className="px-3 py-2 whitespace-nowrap">
                <span className="mr-1">{SUIT_SYMBOL[suit]}</span>
                {SUIT_LABEL_DE[suit]}
              </td>
              {CARD_RANKS.map((rank) => {
                const n = inventory[suit][rank];
                return (
                  <td key={rank} className="px-2 py-2 text-center">
                    <span
                      className={clsx(
                        "inline-block min-w-[2rem] rounded px-1 font-mono",
                        n === 0
                          ? "bg-danger/20 text-danger"
                          : n === 1
                            ? "text-warning"
                            : "text-ink"
                      )}
                    >
                      {n}
                    </span>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}