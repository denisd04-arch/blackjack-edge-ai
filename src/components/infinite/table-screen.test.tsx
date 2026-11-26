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
    expect(screen.queryByRole("dialog", { name: "Hast du mitgespielt" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Runde starten" }));
    expect(screen.getByRole("dialog", { name: "Hast du mitgespielt" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "JA, ICH HABE GESPIELT" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "NEIN, ICH HABE AUSGESETZT" })).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "Karte hinzufügen" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /round complete/i })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /CONFIRM TABLE ROUND SETTLED/i })).not.toBeInTheDocument();
    fireEvent.mouseDown(screen.getByRole("dialog", { name: "Hast du mitgespielt" }).parentElement!);
    expect(screen.getByRole("dialog", { name: "Hast du mitgespielt" })).toBeInTheDocument();
  });

  it("keeps the card window open after a skipped round starts taking cards", () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: "Runde starten" }));
    fireEvent.click(screen.getByRole("button", { name: "NEIN, ICH HABE AUSGESETZT" }));
    fireEvent.click(screen.getByRole("button", { name: "Einsätze bestätigen" }));
    expect(screen.getByRole("dialog", { name: "Karte hinzufügen" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /2 Herz/ }));
    expect(screen.getByRole("dialog", { name: "Karte hinzufügen" })).toBeInTheDocument();
    expect(screen.getByText("Nächste Karte: Dealer")).toBeInTheDocument();
    expect(screen.queryByTestId("round-advisor")).not.toBeInTheDocument();
  });
});
