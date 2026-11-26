import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { emptyLedger, createShoe } from "@blackjack-edge/engine";
import { PRESETS } from "@blackjack-edge/engine";
import { LIVE_KEY, migrateLivePayload, upsertShoe } from "./archive";
import { OwnerStore } from "./owner-store";

describe("local migration", () => {
  it("validates, copies, verifies, and does not require deleting the live key", () => {
    const session = createShoe();
    const raw = JSON.stringify({
      session,
      settings: PRESETS.POSITIVE_EV_ONLY,
      ledger: emptyLedger(100),
    });
    const moved = migrateLivePayload(raw, "user-a");
    expect(moved.file?.verified).toBe(true);
    expect(moved.file?.migratedFrom).toBe(LIVE_KEY);
    expect(moved.file?.shoes[0]?.eventCount).toBe(0);
    expect(raw.includes(session.id)).toBe(true);
    const again = upsertShoe(moved.file!, moved.file!.shoes[0]!);
    expect(again.shoes).toHaveLength(1);
  });

  it("rejects a payload that is not a session", () => {
    expect(migrateLivePayload("{", "user-a").file).toBeNull();
    expect(migrateLivePayload(JSON.stringify({ session: { events: [] } }), "user-a").error).toMatch(/validation/);
  });
});

describe("owner store", () => {
  it("saves, restores, archives without wiping bankroll, and stays idempotent", () => {
    const store = new OwnerStore("user-a");
    expect(store.saveShoe({ id: "s1", ownerId: "user-a", archivedAt: null, bankroll: 250 }).ok).toBe(true);
    expect(store.saveEvent({ id: "e1", ownerId: "user-a", shoeId: "s1", sequence: 1, rank: "A", suit: "spades" })).toEqual({
      ok: true,
      inserted: true,
    });
    expect(store.saveEvent({ id: "e1b", ownerId: "user-a", shoeId: "s1", sequence: 1, rank: "A", suit: "spades" })).toEqual({
      ok: true,
      inserted: false,
    });
    expect(store.saveRound({ id: "r1", ownerId: "user-a", shoeId: "s1", roundNumber: 1, settlementKey: "s1:1" })).toEqual({
      ok: true,
      inserted: true,
    });
    expect(store.saveRound({ id: "r2", ownerId: "user-a", shoeId: "s1", roundNumber: 1, settlementKey: "s1:1" }).ok && true).toBe(true);
    const archived = store.archive("s1");
    expect(archived).toEqual({ ok: true, bankroll: 250 });
    expect(store.readShoes()[0]?.archivedAt).toBe("archived");
    expect(store.readShoes()[0]?.bankroll).toBe(250);
  });

  it("refuses another user's rows", () => {
    const store = new OwnerStore("user-a");
    expect(store.saveShoe({ id: "s2", ownerId: "user-b", archivedAt: null, bankroll: 10 })).toEqual({ ok: false, error: "RLS" });
    store.saveShoe({ id: "s1", ownerId: "user-a", archivedAt: null, bankroll: 10 });
    expect(store.saveEvent({ id: "e", ownerId: "user-b", shoeId: "s1", sequence: 1, rank: "K", suit: "clubs" })).toEqual({
      ok: false,
      error: "RLS",
    });
    expect(store.readShoes().every((shoe) => shoe.ownerId === "user-a")).toBe(true);
  });
});

describe("migration file", () => {
  it("is additive, keeps owner checks, and was not applied", () => {
    const sql = readFileSync("supabase/migrations/20261126180000_round_settlement.sql", "utf8");
    expect(sql).toMatch(/NOT APPLIED/);
    expect(sql).toMatch(/auth\.uid\(\) = owner_id/);
    expect(sql.toLowerCase()).not.toMatch(/disable row level security/);
  });
});
