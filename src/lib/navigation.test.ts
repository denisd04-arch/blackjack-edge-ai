import { describe, expect, it } from "vitest";
import { NAV_SECTIONS } from "./navigation";

describe("navigation", () => {
  it("keeps the shoe on one screen and four secondary routes", () => {
    expect(NAV_SECTIONS.map((s) => s.href)).toEqual([
      "/settings",
      "/testing",
      "/rulebook",
      "/forward",
    ]);
  });
});
