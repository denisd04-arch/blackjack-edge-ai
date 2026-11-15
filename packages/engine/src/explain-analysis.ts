import type { CountSnapshot } from "./counting";
import type { DecisionAnalysisResult } from "./decision-analysis";
import { actionLabelDe } from "./decision-log";

export interface StructuredExplanation {
  titleDe: string;
  paragraphsDe: string[];
  dataOnly: true;
}

export function explainDecisionAnalysis(
  analysis: DecisionAnalysisResult,
  counts: CountSnapshot | null
): StructuredExplanation {
  const paragraphs: string[] = [];
  paragraphs.push(analysis.messageDe);
  if (!analysis.definitive) {
    return {
      titleDe: "Keine definitive Analyse",
      paragraphsDe: paragraphs,
      dataOnly: true,
    };
  }
  if (analysis.recommended) {
    paragraphs.push(
      `Engine-Empfehlung: ${actionLabelDe(analysis.recommended)}.`
    );
    const rec = analysis.actions.find((a) => a.action === analysis.recommended);
    if (rec?.available) {
      paragraphs.push(
        `Erwartungswert ca. ${formatEv(rec.ev)} (Gewinn ${rec.winPct.toFixed(1)}%, Push ${rec.pushPct.toFixed(1)}%, Verlust ${rec.lossPct.toFixed(1)}%).`
      );
    }
  }
  paragraphs.push(
    `Dealer bustet in ca. ${analysis.dealerBustPct.toFixed(1)}% der verbleibenden Schuhmischungen.`
  );
  if (counts) {
    paragraphs.push(
      `Zählstand: Hi-Lo RC ${counts.hiLo.running} / TC ${counts.hiLo.true}; Omega II RC ${counts.omegaII.running} / TC ${counts.omegaII.true}.`
    );
  }
  paragraphs.push(
    "Hinweis: Nur strukturierte Engine-Ausgabe — keine erfundenen Strategien."
  );
  return {
    titleDe: "Erklärung (Engine)",
    paragraphsDe: paragraphs,
    dataOnly: true,
  };
}

function formatEv(ev: number): string {
  return ev > 0 ? `+${ev.toFixed(4)}` : ev.toFixed(4);
}