"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { NAV_SECTIONS } from "@/lib/navigation";
import { useInfinite } from "@/lib/use-infinite";

export function InfiniteShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { settings, onNewShoe, onNextRound, session } = useInfinite();
  return (
    <div className="min-h-screen bg-[#04140f] text-[#f6f1e4]">
      <header className="sticky top-0 z-20 border-b border-[#e2c27a]/30 bg-[#06281c]/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-2 px-3 py-3">
          <Link href="/" className="mr-auto min-h-11">
            <span className="font-display text-lg font-semibold tracking-tight">Blackjack Edge AI</span>
            <span className="block text-xs text-[#e2c27a]">Infinite Free Bet · one shoe</span>
          </Link>
          <button type="button" className="min-h-11 rounded-lg bg-[#e2c27a] px-4 font-semibold text-[#1a1408]" onClick={onNewShoe}>
            NEW SHOE
          </button>
          <button
            type="button"
            className="min-h-11 rounded-lg border border-[#e2c27a] px-4 font-semibold text-[#e2c27a]"
            onClick={() => {
              const error = onNextRound();
              if (error) window.alert(error);
            }}
          >
            NEXT ROUND
          </button>
          <nav aria-label="Secondary" className="flex flex-wrap gap-1">
            {NAV_SECTIONS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`min-h-11 rounded-lg px-3 py-2 text-sm ${path === item.href ? "bg-[#e2c27a] text-[#1a1408]" : "text-[#f6f1e4]/80"}`}
              >
                {item.label}
              </Link>
            ))}
          </nav>
          <p className="font-mono text-xs text-[#e2c27a]">
            {settings.currency} {settings.bankroll} · round {session.round}
          </p>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-3 py-4">{children}</main>
    </div>
  );
}
