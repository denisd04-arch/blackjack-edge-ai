"use client";

import clsx from "clsx";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_SECTIONS } from "@/lib/navigation";

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Mobile Navigation"
      className="flex gap-2 overflow-x-auto pb-1 lg:hidden"
    >
      {NAV_SECTIONS.map((section) => {
        const active = pathname === section.href;
        return (
          <Link
            key={section.href}
            href={section.href}
            className={clsx(
              "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition",
              active
                ? "border-neon bg-emerald-mist/50 text-neon"
                : "border-border text-ink-muted"
            )}
          >
            {section.label}
          </Link>
        );
      })}
    </nav>
  );
}