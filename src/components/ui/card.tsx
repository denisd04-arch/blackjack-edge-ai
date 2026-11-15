import clsx from "clsx";
import type { ReactNode } from "react";

export function Card({
  title,
  eyebrow,
  children,
  className,
}: {
  title?: string;
  eyebrow?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={clsx(
        "rounded-card border border-border bg-panel-glass p-5 shadow-panel backdrop-blur-sm",
        className
      )}
    >
      {eyebrow ? (
        <p className="font-mono text-[11px] uppercase tracking-widest text-neon-dim">
          {eyebrow}
        </p>
      ) : null}
      {title ? (
        <h2 className="font-display mt-1 text-lg font-semibold text-ink">
          {title}
        </h2>
      ) : null}
      <div className={title || eyebrow ? "mt-3" : undefined}>{children}</div>
    </section>
  );
}