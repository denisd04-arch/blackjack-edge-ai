"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { applyLedgerEntry, type LedgerEntry } from "@blackjack-edge/engine";

type BankrollValue = {
  entries: readonly LedgerEntry[];
  recordDelta: (delta: number, noteDe: string) => void;
  reset: () => void;
};

const BankrollContext = createContext<BankrollValue | null>(null);
let ledgerId = 0;

export function BankrollProvider({ children }: { children: ReactNode }) {
  const [entries, setEntries] = useState<LedgerEntry[]>([
    {
      id: "init",
      atMs: Date.now(),
      delta: 1000,
      balanceAfter: 1000,
      noteDe: "Startbankroll (Demo, nur lokal)",
    },
  ]);

  const recordDelta = useCallback((delta: number, noteDe: string) => {
    ledgerId += 1;
    setEntries((prev) =>
      applyLedgerEntry(prev, `led-${ledgerId}`, delta, noteDe)
    );
  }, []);

  const reset = useCallback(() => {
    setEntries([
      {
        id: "init",
        atMs: Date.now(),
        delta: 1000,
        balanceAfter: 1000,
        noteDe: "Reset",
      },
    ]);
  }, []);

  const value = useMemo(
    () => ({ entries, recordDelta, reset }),
    [entries, recordDelta, reset]
  );

  return (
    <BankrollContext.Provider value={value}>{children}</BankrollContext.Provider>
  );
}

export function useBankroll(): BankrollValue {
  const ctx = useContext(BankrollContext);
  if (!ctx) throw new Error("useBankroll erfordert BankrollProvider.");
  return ctx;
}