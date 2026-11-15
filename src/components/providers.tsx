"use client";

import type { ReactNode } from "react";
import { BankrollProvider } from "@/lib/bankroll-context";
import { DecisionTrackerProvider } from "@/lib/decision-tracker-context";
import { TableSessionProvider } from "@/lib/table-session-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <TableSessionProvider>
      <DecisionTrackerProvider>
        <BankrollProvider>{children}</BankrollProvider>
      </DecisionTrackerProvider>
    </TableSessionProvider>
  );
}