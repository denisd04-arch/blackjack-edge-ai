import { analyzeDecision, type AnalyzeDecisionInput, type DecisionAnalysisResult } from "./decision-analysis";
import type { BlackjackMathEngine, EngineHealth, GameProfile } from "./types";

export class FiniteShoeEvEngine implements BlackjackMathEngine {
  constructor(readonly profile: GameProfile) {}

  health(): EngineHealth {
    if (this.profile.incomplete) {
      return {
        ready: true,
        messageDe:
          "Finite-Shoe-EV aktiv — definitiver EV nur bei vollständigem Regelprofil.",
      };
    }
    return {
      ready: true,
      messageDe: "Finite-Shoe-EV bereit (kombinatorisch, kein Monte Carlo).",
    };
  }

  analyze(input: Omit<AnalyzeDecisionInput, "profile">): DecisionAnalysisResult {
    return analyzeDecision({ ...input, profile: this.profile });
  }
}