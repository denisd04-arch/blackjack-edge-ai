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
    expect(screen.getByRole("button", { name: "NEW SHOE" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "NEXT ROUND" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Forward Testing" })).toHaveAttribute("href", "/forward");
  });
});
