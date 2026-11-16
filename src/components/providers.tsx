"use client";

import type { ReactNode } from "react";
import { InfiniteProvider } from "@/lib/use-infinite";

export function Providers({ children }: { children: ReactNode }) {
  return <InfiniteProvider>{children}</InfiniteProvider>;
}