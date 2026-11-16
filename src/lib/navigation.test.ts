import { describe, expect, it } from "vitest";
import { FORWARD_SECTION, HEADER_NAV, NAV_SECTIONS } from "./navigation";

describe("navigation", () => {
  it("keeps forward testing off the header and linked from testing", () => {
    expect(HEADER_NAV.map((s) => s.href)).toEqual(["/settings", "/testing", "/rulebook"]);
    expect(FORWARD_SECTION.href).toBe("/forward");
    expect(NAV_SECTIONS.map((s) => s.href)).toEqual([
      "/settings",
      "/testing",
      "/rulebook",
      "/forward",
    ]);
  });
});
