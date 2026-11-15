"use client";

import type { ReactNode } from "react";
import { TableSessionProvider } from "@/lib/table-session-context";

export function Providers({ children }: { children: ReactNode }) {
  return <TableSessionProvider>{children}</TableSessionProvider>;
}