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
    for (let i = 0; i < 4; i++) {
      expect(session.dealCard("2", "clubs", "other").ok).toBe(true);
    }
    const blocked = session.dealCard("2", "diamonds", "dealer");
    expect(blocked.ok).toBe(false);
    if (!blocked.ok) expect(blocked.code).toBe("SHOE_DEPLETED");
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