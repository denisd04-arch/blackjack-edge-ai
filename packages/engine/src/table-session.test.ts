import { describe, expect, it } from "vitest";
import { DigitalTableSession } from "./table-session";

describe("DigitalTableSession", () => {
  it("requires open round to deal", () => {
    const session = new DigitalTableSession({ decks: 1 });
    const res = session.dealCard("A", "spades", "dealer");
    expect(res.ok).toBe(false);
  });

  it("deals, undoes, and validates shoe", () => {
    const session = new DigitalTableSession({ decks: 1 });
    expect(session.startRound().ok).toBe(true);
    const deal = session.dealCard("K", "hearts", "player");
    expect(deal.ok).toBe(true);
    expect(session.snapshot().shoe.cardsDealt).toBe(1);
    expect(session.undoLast().ok).toBe(true);
    expect(session.snapshot().shoe.cardsDealt).toBe(0);
  });

  it("rejects deal when rank exhausted", () => {
    const session = new DigitalTableSession({ decks: 1 });
    session.startRound();
    const suits = ["clubs", "diamonds", "hearts", "spades"] as const;
    for (const suit of suits) {
      expect(session.dealCard("2", suit, "other").ok).toBe(true);
    }
    const blocked = session.dealCard("2", "clubs", "dealer");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("SHOE_DEPLETED");
  });

  it("exposes count snapshot synced with deals", () => {
    const session = new DigitalTableSession({ decks: 8 });
    session.startRound();
    session.dealCard("5", "hearts", "player");
    session.dealCard("K", "spades", "dealer");
    const { counts } = session.snapshot();
    expect(counts.hiLo.running).toBe(0);
    expect(counts.omegaII.running).toBe(0);
    expect(counts.cardsRemaining).toBe(8 * 52 - 2);
  });

  it("blocks deal when suit exhausted but rank remains", () => {
    const session = new DigitalTableSession({ decks: 1 });
    session.startRound();
    expect(session.dealCard("A", "spades", "player").ok).toBe(true);
    const blocked = session.dealCard("A", "spades", "dealer");
    expect(blocked.ok).toBe(false);
  });

  it("edit and remove restore inventory", () => {
    const session = new DigitalTableSession({ decks: 2 });
    session.startRound();
    session.dealCard("5", "spades", "dealer");
    const id = session.snapshot().dealt[0].id;
    expect(session.editCard(id, "9", "hearts").ok).toBe(true);
    expect(session.removeCard(id).ok).toBe(true);
    expect(session.snapshot().dealt).toHaveLength(0);
  });
});