import { describe, expect, it } from "vitest";
import { NAV_SECTIONS } from "./navigation";

describe("navigation", () => {
  it("defines eleven product sections for phases 2-12", () => {
    expect(NAV_SECTIONS).toHaveLength(11);
    const phases = NAV_SECTIONS.map((s) => s.phase);
    expect(phases).toEqual([2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it("uses unique German routes", () => {
    const hrefs = NAV_SECTIONS.map((s) => s.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });
});