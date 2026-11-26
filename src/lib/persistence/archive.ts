import type { Ledger, ShoeSession, TableSettings } from "@blackjack-edge/engine";

export const LIVE_KEY = "beai-infinite-session-v2";
export const ARCHIVE_KEY = "beai-infinite-archive-v1";

export interface ArchivedShoe {
  id: string;
  ownerId: string;
  session: ShoeSession;
  settings: TableSettings;
  ledger: Ledger;
  archivedAt: string;
  eventCount: number;
}

export interface ArchiveFile {
  migratedFrom: typeof LIVE_KEY | null;
  verified: boolean;
  shoes: ArchivedShoe[];
}

export interface LocalPayload {
  session?: ShoeSession;
  settings?: TableSettings;
  ledger?: Ledger;
}

/** Validate, copy, verify. The live key is left in place. */
export function migrateLivePayload(raw: string | null, ownerId: string): { file: ArchiveFile | null; error?: string } {
  if (!raw) return { file: null, error: "Nothing stored." };
  let parsed: LocalPayload;
  try {
    parsed = JSON.parse(raw) as LocalPayload;
  } catch {
    return { file: null, error: "Stored session is not JSON." };
  }
  if (!parsed.session?.events || !parsed.settings?.paytableId || !parsed.ledger) {
    return { file: null, error: "Stored session failed validation." };
  }
  const eventCount = parsed.session.events.length;
  const file: ArchiveFile = {
    migratedFrom: LIVE_KEY,
    verified: false,
    shoes: [
      {
        id: parsed.session.id,
        ownerId,
        session: parsed.session,
        settings: parsed.settings,
        ledger: parsed.ledger,
        archivedAt: new Date(0).toISOString(),
        eventCount,
      },
    ],
  };
  const check = file.shoes[0]!;
  if (check.session.events.length !== eventCount || check.ledger.entries.length !== parsed.ledger.entries.length) {
    return { file: null, error: "Migration verify failed." };
  }
  file.verified = true;
  return { file };
}

export function upsertShoe(file: ArchiveFile, shoe: ArchivedShoe): ArchiveFile {
  const existing = file.shoes.findIndex((row) => row.id === shoe.id && row.ownerId === shoe.ownerId);
  const shoes = existing >= 0 ? file.shoes.map((row, index) => (index === existing ? shoe : row)) : [...file.shoes, shoe];
  return { ...file, shoes };
}
