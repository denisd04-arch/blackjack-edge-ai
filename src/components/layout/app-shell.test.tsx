import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { InfiniteShell } from "@/components/infinite/shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
}));

vi.mock("@/lib/use-infinite", () => ({
  useInfinite: () => ({
    settings: { currency: "EUR", bankroll: 1000 },
    session: { round: 1 },
    onNewShoe: vi.fn(),
    onNextRound: vi.fn(),
  }),
}));

describe("InfiniteShell", () => {
  it("offers NEW SHOE and NEXT ROUND as separate controls", () => {
    render(
      <InfiniteShell>
        <p>Shoe</p>
      </InfiniteShell>
    );
    expect(screen.getByText("Blackjack Edge AI")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "NEUER SCHUH" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "NÄCHSTE RUNDE" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "EINSTELLUNGEN" })).toHaveAttribute("href", "/settings");
    expect(screen.getByRole("link", { name: "TEST" })).toHaveAttribute("href", "/testing");
    expect(screen.getByRole("link", { name: "REGELWERK" })).toHaveAttribute("href", "/rulebook");
    expect(screen.queryByRole("link", { name: "Forward Testing" })).not.toBeInTheDocument();
  });
});
