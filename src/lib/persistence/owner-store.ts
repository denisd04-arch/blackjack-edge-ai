export interface Owned {
  id: string;
  ownerId: string;
}

export interface ShoeRow extends Owned {
  archivedAt: string | null;
  bankroll: number;
}

export interface EventRow extends Owned {
  shoeId: string;
  sequence: number;
  rank: string;
  suit: string;
}

export interface RoundRow extends Owned {
  shoeId: string;
  roundNumber: number;
  settlementKey: string | null;
}

/**
 * In-memory stand-in for the Supabase tables.
 * A viewer reads and writes only rows they own. Production SQL is not applied here.
 */
export class OwnerStore {
  shoes: ShoeRow[] = [];
  events: EventRow[] = [];
  rounds: RoundRow[] = [];

  constructor(private viewer: string) {}

  saveShoe(row: ShoeRow): { ok: true } | { ok: false; error: string } {
    if (row.ownerId !== this.viewer) return { ok: false, error: "RLS" };
    const index = this.shoes.findIndex((shoe) => shoe.id === row.id);
    if (index >= 0) this.shoes[index] = row;
    else this.shoes.push(row);
    return { ok: true };
  }

  saveEvent(row: EventRow): { ok: true; inserted: boolean } | { ok: false; error: string } {
    if (row.ownerId !== this.viewer) return { ok: false, error: "RLS" };
    const shoe = this.shoes.find((item) => item.id === row.shoeId && item.ownerId === this.viewer);
    if (!shoe) return { ok: false, error: "RLS" };
    const existing = this.events.find((event) => event.shoeId === row.shoeId && event.sequence === row.sequence);
    if (existing) return { ok: true, inserted: false };
    this.events.push(row);
    return { ok: true, inserted: true };
  }

  saveRound(row: RoundRow): { ok: true; inserted: boolean } | { ok: false; error: string } {
    if (row.ownerId !== this.viewer) return { ok: false, error: "RLS" };
    const shoe = this.shoes.find((item) => item.id === row.shoeId && item.ownerId === this.viewer);
    if (!shoe) return { ok: false, error: "RLS" };
    const existing = this.rounds.find((item) => item.settlementKey && item.settlementKey === row.settlementKey);
    if (existing) return { ok: true, inserted: false };
    this.rounds.push(row);
    return { ok: true, inserted: true };
  }

  archive(shoeId: string): { ok: true; bankroll: number } | { ok: false; error: string } {
    const shoe = this.shoes.find((item) => item.id === shoeId && item.ownerId === this.viewer);
    if (!shoe) return { ok: false, error: "RLS" };
    shoe.archivedAt = "archived";
    return { ok: true, bankroll: shoe.bankroll };
  }

  readShoes(): ShoeRow[] {
    return this.shoes.filter((shoe) => shoe.ownerId === this.viewer);
  }
}
