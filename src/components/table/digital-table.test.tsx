import { render, screen, fireEvent } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DigitalTable } from "./digital-table";

vi.mock("next/navigation", () => ({
  usePathname: () => "/tisch",
}));

vi.mock("next/link", () => ({
  default: ({
    children,
    href,
  }: {
    children: React.ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe("DigitalTable", () => {
  it("requires starting a round before suit picker appears", () => {
    render(<DigitalTable />);
    fireEvent.click(screen.getAllByRole("button", { name: "Ass" })[0]);
    expect(screen.queryByText(/Farbe für Ass/)).not.toBeInTheDocument();
    fireEvent.click(screen.getAllByRole("button", { name: "Runde starten" })[0]);
    fireEvent.click(screen.getAllByRole("button", { name: "Ass" })[0]);
    expect(screen.getByText(/Farbe für Ass/)).toBeInTheDocument();
  });

  it("toggles participation labels", () => {
    render(<DigitalTable />);
    const buttons = screen.getAllByRole("button", { name: "Ich spiele nicht" });
    fireEvent.click(buttons[0]);
    expect(screen.getByText(/Beobachtungsmodus/)).toBeInTheDocument();
  });
});