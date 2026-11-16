import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { InfiniteProvider } from "@/lib/use-infinite";
import { TableScreen } from "./table-screen";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

function renderTable() {
  return render(
    <InfiniteProvider>
      <TableScreen />
    </InfiniteProvider>
  );
}

describe("table participation", () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => cleanup());

  it("asks before any card and does not use a round-complete button", () => {
    renderTable();
    expect(screen.getByRole("dialog", { name: "Did you play" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "YES I PLAYED" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "NO I SKIPPED" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Add a card" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /round complete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /CONFIRM TABLE ROUND SETTLED/i })).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("dialog", { name: "Did you play" }).parentElement!);
    expect(screen.getByRole("dialog", { name: "Did you play" })).toBeInTheDocument();
  });

  it("keeps the card window open after a skipped round starts taking cards", () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: "NO I SKIPPED" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm stakes" }));
    expect(screen.getByRole("dialog", { name: "Add a card" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /2 of hearts/ }));
    expect(screen.getByRole("dialog", { name: "Add a card" })).toBeInTheDocument();
    expect(screen.getByText("Next card: Dealer")).toBeInTheDocument();
    expect(screen.queryByTestId("round-advisor")).not.toBeInTheDocument();
  });
});
