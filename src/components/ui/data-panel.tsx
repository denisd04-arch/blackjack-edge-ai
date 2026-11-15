import clsx from "clsx";
import type { ReactNode } from "react";

export function DataPanel({
  label,
  value,
  hint,
  className,
}: {
  label: string;
  value: ReactNode;
  hint?: string;
  className?: string;
}) {
  return (
    <PanelShell className={className}>
      <dt className="text-xs uppercase tracking-wide text-ink-faint">{label}</dt>
      <dd className="font-mono text-xl text-neon tabular-nums">{value}</dd>
      {hint ? <p className="mt-1 text-xs text-ink-muted">{hint}</p> : null}
    </PanelShell>
  );
}

function PanelShell({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <dl
      className={clsx(
        "rounded-lg border border-border/80 bg-canvas-graphite/50 px-4 py-3",
        className
      )}
    >
      {children}
    </dl>
  );
}

export function DataPanelGrid({ children }: { children: ReactNode }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}