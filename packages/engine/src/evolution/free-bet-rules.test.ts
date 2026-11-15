import { describe, expect, it } from "vitest";
import { EVOLUTION_FREE_BET_STUB } from "../profiles";
import {
  evolutionRuleReport,
  freeDoubleEligible,
  freeSplitEligible,
} from "./free-bet-rules";

describe("free bet rules", () => {
  it("reports incomplete Evolution profile", () => {
    const report = evolutionRuleReport(EVOLUTION_FREE_BET_STUB);
    expect(report.incomplete).toBe(true);
    expect(report.missingFields).toContain("penetration");
  });

  it("detects free split on 8s", () => {
    const on = EVOLUTION_FREE_BET_STUB.rules.freeSplitOn;
    expect(freeSplitEligible(["8", "8"], on)).toBe(true);
    expect(freeSplitEligible(["7", "7"], on)).toBe(false);
  });

  it("detects free double on 11", () => {
    const on = EVOLUTION_FREE_BET_STUB.rules.freeDoubleOn;
    expect(freeDoubleEligible(["9", "2"], on)).toBe(true);
  });
});