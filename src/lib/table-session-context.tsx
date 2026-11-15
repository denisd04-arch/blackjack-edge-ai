"use client";

import { createContext, useContext, type ReactNode } from "react";
import { useDigitalTable } from "@/components/table/use-digital-table";

type TableSessionValue = ReturnType<typeof useDigitalTable>;

const TableSessionContext = createContext<TableSessionValue | null>(null);

export function TableSessionProvider({ children }: { children: ReactNode }) {
  const value = useDigitalTable(8);
  return (
    <TableSessionContext.Provider value={value}>
      {children}
    </TableSessionContext.Provider>
  );
}

export function useTableSession(): TableSessionValue {
  const ctx = useContext(TableSessionContext);
  if (!ctx) {
    throw new Error("useTableSession erfordert TableSessionProvider.");
  }
  return ctx;
}