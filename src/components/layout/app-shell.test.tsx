import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AppShell } from "./app-shell";

vi.mock("next/navigation", () => ({
  usePathname: () => "/",
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

describe("AppShell", () => {
  it("renders brand and child content", () => {
    render(
      <AppShell title="Test">
        <p>Inhalt</p>
      </AppShell>
    );
    expect(screen.getByText("Blackjack Edge AI")).toBeInTheDocument();
    expect(screen.getByText("Inhalt")).toBeInTheDocument();
    expect(screen.getByLabelText("Hauptnavigation")).toBeInTheDocument();
  });
});