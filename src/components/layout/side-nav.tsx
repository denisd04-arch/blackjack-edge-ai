"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/navigation";
import { formatPhaseLabel } from "@/lib/i18n";

export function SideNav() {
  const pathname = usePathname();

  return (
  <nav
    aria-label="Hauptnavigation"
    className="flex flex-col gap-1"
  >
    {NAV_SECTIONS.map((section) => {
      const active =
        pathname === section.href || pathname.startsWith(`${section.href}/`);
      return (
        <Link
          key={section.href}
          href={section.href}
          className={clsx(
            "group rounded-lg border px-3 py-2 transition",
            active
              ? "border-neon-dim/60 bg-emerald-mist/40 text-neon shadow-neon"
              : "border-transparent text-ink-muted hover:border-border hover:bg-canvas-panel/80 hover:text-ink"
          )}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">{section.labelDe}</span>
            <span className="font-mono text-[10px] text-ink-faint group-hover:text-ink-muted">
              {formatPhaseLabel(section.phase)}
            </span>
          </span>
        </Link>
      );
    })}
  </nav>
  );
}