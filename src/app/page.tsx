"use client";

import { InfiniteShell } from "@/components/infinite/shell";
import { TableScreen } from "@/components/infinite/table-screen";

export default function HomePage() {
  return (
    <InfiniteShell>
      <TableScreen />
    </InfiniteShell>
  );
}
