import { describe, expect, it } from "vitest";
import { forwardTestProjection } from "./forward-test";
import { DigitalTableSession } from "./table-session";

describe("forwardTestProjection", () => {
  it("never returns definitive dollar projection", () => {
    const session = new DigitalTableSession({ decks: 8 });
    const { counts } = session.snapshot();
    const r = forwardTestProjection({
      counts,
      participationHandsRemaining: 5,
    });
    expect(r.definitive).toBe(false);
    expect(r.observationsDe.length).toBeGreaterThan(0);
  });
});