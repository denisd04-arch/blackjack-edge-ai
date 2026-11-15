import { describe, expect, it } from "vitest";
import { buildSessionAnalytics } from "./session-analytics";
import { DigitalTableSession } from "./table-session";

describe("buildSessionAnalytics", () => {
  it("merges shoe counts and decisions", () => {
    const session = new DigitalTableSession({ decks: 8 });
    const snap = session.snapshot();
    const stats = buildSessionAnalytics({
      shoe: snap.shoe,
      counts: snap.counts,
      decisions: [],
    });
    expect(stats.decisionPoints).toBe(0);
    expect(stats.definitiveCounts).toBe(true);
  });
});