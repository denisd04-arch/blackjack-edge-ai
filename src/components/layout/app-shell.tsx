import type { ReactNode } from "react";
import Link from "next/link";
import { SideNav } from "./side-nav";
import { MobileNav } from "./mobile-nav";

export function AppShell({
  children,
  title,
  subtitle,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
}) {
  return (
    <div className="min-h-screen bg-felt-gradient text-ink">
      <div className="pointer-events-none fixed inset-0 bg-emerald-radial" />
      <ShellHeader />
      <div className="relative mx-auto flex w-full max-w-7xl gap-6 px-4 py-6 lg:px-8">
        <aside className="hidden w-64 shrink-0 lg:block">
          <SideNav />
        </aside>
        <main className="min-w-0 flex-1">
          <MobileNav />
          {title ? (
            <header className="mb-6 mt-4 lg:mt-0">
              <h1 className="font-display text-2xl font-semibold tracking-tight text-ink md:text-3xl">
                {title}
              </h1>
              {subtitle ? (
                <p className="mt-2 max-w-2xl text-sm text-ink-muted">
                  {subtitle}
                </p>
              ) : null}
            </header>
          ) : null}
          {children}
        </main>
      </div>
    </div>
  );
}

function ShellHeader() {
  return (
    <header className="relative border-b border-border/80 bg-canvas/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 lg:px-8">
        <BrandMark />
        <p className="hidden font-mono text-xs text-ink-faint sm:block">
          Evolution · Free Bet · Nur deterministische Mathematik
        </p>
      </div>
    </header>
  );
}

function BrandMark() {
  return (
    <Link href="/" className="group flex items-center gap-3">
      <span
        aria-hidden
        className="flex h-9 w-9 items-center justify-center rounded-lg border border-neon-dim/50 bg-emerald-mist/40 font-mono text-sm font-bold text-neon shadow-neon"
      >
        BJ
      </span>
      <span>
        <span className="font-display text-lg font-semibold text-ink group-hover:text-neon">
          Blackjack Edge AI
        </span>
        <span className="block text-xs text-ink-muted">Terminal · Live</span>
      </span>
    </Link>
  );
}