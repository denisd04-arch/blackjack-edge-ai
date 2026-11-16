import { describe, expect, it } from "vitest";
import { attachActualAction, buildLogEntry, isDeviation } from "./decision-log";
import type { DecisionAnalysisResult } from "./decision-analysis";

const mockAnalysis: DecisionAnalysisResult = {
  definitive: true,
  messageDe: "ok",
  rulesLabelDe: "test",
  recommended: "stand",
  dealerBustPct: 20,
  dealer22PushPct: 0,
  insurance: {
    offered: false,
    definitive: false,
    dealerBlackjackPct: null,
    evPerInsuranceUnit: null,
    messageDe: "keine",
  },
  actions: [
    {
      action: "stand",
      labelDe: "Stehen",
      ev: 0.5,
      variance: 0.1,
      winPct: 50,
      pushPct: 5,
      lossPct: 45,
      maxLoss: 1,
      available: true,
    },
    {
      action: "hit",
      labelDe: "Karte",
      ev: 0.2,
      variance: 0.2,
      winPct: 40,
      pushPct: 5,
      lossPct: 55,
      maxLoss: 1,
      available: true,
    },
    {
      action: "double",
      labelDe: "Verdoppeln",
      ev: 0,
      variance: 0,
      winPct: 0,
      pushPct: 0,
      lossPct: 0,
      maxLoss: 0,
      available: false,
    },
    {
      action: "split",
      labelDe: "Teilen",
      ev: 0,
      variance: 0,
      winPct: 0,
      pushPct: 0,
      lossPct: 0,
      maxLoss: 0,
      available: false,
    },
  ],
};

describe("decision log", () => {
  it("flags deviation when actual differs", () => {
    const base = buildLogEntry({
      id: "1",
      createdAtMs: 0,
      roundId: 1,
      playerCards: ["10", "K"],
      dealerUpcard: "6",
      analysis: mockAnalysis,
    });
    const updated = attachActualAction(base, "hit", mockAnalysis);
    expect(isDeviation(updated)).toBe(true);
  });
});