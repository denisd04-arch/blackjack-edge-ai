import { describe, expect, it } from "vitest";
import { EVOLUTION_FREE_BET_STUB } from "../profiles";
import {
  evolutionRuleReport,
  freeDoubleEligible,
  freeSplitEligible,
  mapFreeDoubleProfit,
  mapFreeSplitSideProfit,
} from "./free-bet-rules";

describe("free bet rules", () => {
  it("reports open split fields and push 22", () => {
    const report = evolutionRuleReport(EVOLUTION_FREE_BET_STUB);
    expect(report.incomplete).toBe(true);
    expect(report.missingFields).toContain("maxSplitsPerHand");
    expect(report.capabilities.pushOn22).toBe(true);
  });

  it("frees every non-ten pair and not tens", () => {
    const on = EVOLUTION_FREE_BET_STUB.rules.freeSplitOn;
    expect(freeSplitEligible(["8", "8"], on)).toBe(true);
    expect(freeSplitEligible(["7", "7"], on)).toBe(true);
    expect(freeSplitEligible(["A", "A"], on)).toBe(true);
    expect(freeSplitEligible(["10", "10"], on)).toBe(false);
    expect(freeSplitEligible(["K", "Q"], on)).toBe(false);
  });

  it("frees hard 9–11 only", () => {
    const on = EVOLUTION_FREE_BET_STUB.rules.freeDoubleOn;
    expect(freeDoubleEligible(["9", "2"], on)).toBe(true);
    expect(freeDoubleEligible(["5", "5"], on)).toBe(true);
    expect(freeDoubleEligible(["A", "7"], on)).toBe(false);
    expect(freeDoubleEligible(["A", "8"], on)).toBe(false);
  });

  it("maps free-bet profit without scaling an expectation", () => {
    expect(mapFreeDoubleProfit(1)).toBe(2);
    expect(mapFreeDoubleProfit(0)).toBe(0);
    expect(mapFreeDoubleProfit(-1)).toBe(-1);
    expect(mapFreeSplitSideProfit(1)).toBe(1);
    expect(mapFreeSplitSideProfit(0)).toBe(0);
    expect(mapFreeSplitSideProfit(-1)).toBe(0);
  });
});
