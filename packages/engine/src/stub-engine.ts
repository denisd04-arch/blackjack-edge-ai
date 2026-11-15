import type { BlackjackMathEngine, GameProfile } from "./types";

export class StubBlackjackMathEngine implements BlackjackMathEngine {
  constructor(readonly profile: GameProfile) {}

  health() {
    return {
      ready: false,
      messageDe:
        "Mathe-Engine noch nicht implementiert (Phase 4). Profil vorbereitet.",
    } as const;
  }
}