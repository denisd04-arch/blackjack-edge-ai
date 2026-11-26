# Implementation status

Current phase: complete on branch `cursor/full-completion-dbeb`. Not merged. Not deployed.

Base: `origin/main` at `6814d9a478cae0afbe73585eb768d10e07d99662`.

## Done

- Phase 0. Audited the Infinite engine, session, settlement, and tests. Baseline before this branch: `npx vitest run` — 25 files, 95 tests, passed.
- Phase 1. One shoe. Terminal hands freeze on stand, bust, natural blackjack, and Six Card Charlie. Split hands are separate. The hole is reserved once and replaced on reveal. Skipped rounds have no personal recommendation and still remove cards. Settlement is idempotent and labels WIN, LOSS, PUSH, BLACKJACK, BUST, DEALER_BUST, DEALER_22. Acceptance A–J passed.
- Phase 2. RTP gap is recomputed, not fitted to 98.45%. Product rules stay near 99.347% and are PARTIALLY_VERIFIED. A positive edge is NOT DEFINITIVE and produces no stake. Kelly sizing exists only for a verified full distribution.
- Phase 3. `consumeShoe` no longer settles through `fastAction`. Autoplay uses `playShoeEngine`: same composition policy, real cards, dealer rules, and `handProfit`. Verified-edge and Kelly plans stake nothing while the model is partial. Backtests are not a profitability claim.
- Phase 4. Live key `beai-infinite-session-v2` is still written. A verified copy goes to `beai-infinite-archive-v1` and the live key is not deleted. Owner-scoped save, restore, archive, and idempotency are tested in memory. SQL file `supabase/migrations/20261126180000_round_settlement.sql` was NOT applied.
- Phase 5. Live shell, table entry, settings, test, forward, and rulebook are German, with the usual blackjack terms left as terms. Portfolio control is gone. Cut and deck count apply on the next shoe. Custom presets can be saved, renamed, and deleted. Side-bet toggle stops side bets from being staked.

## Open

- Signed-in Supabase sync of the live shoe is not connected. This run has no production database credentials and must not apply migrations.
- Some engine notes and older unused phase screens are still English. The routed Infinite screens are the German UI.
- Seven-seat Free Bet stays an incomplete profile. No unsourced differences were added.
- Bust It on dealer 22 stays UNVERIFIED. Both hypotheses remain.
- DAS, resplit, and max hands stay CONFLICTING overrides. They are why the main RTP is not the help-screen figure.
- A browser walk of every viewport was not run in this session. Component tests cover the start-round and card dialog.

## Known bugs

None found by the suite after the last edit. The suggested stake stays empty on purpose.

## Tests actually run

- Baseline, before edits: `npx vitest run` — 95 passed.
- After the work: `npx tsc --noEmit` — passed. `npm run typecheck -w @blackjack-edge/engine` — passed. `npx next lint` — no warnings or errors. `npx vitest run` — 28 files, 113 tests, passed (about 17s).

## Decisions

- `observeShoe` accepts a confirmed Infinite other-player card as a shoe removal. It is not a second copy of the personal hand.
- No second engine. `fastAction` remains in the file and is not the settlement path.
- No PLAY and no stake from the partially verified main model.

## Next step

Review the branch. Do not treat it as production until it is merged and a deployment is verified READY. Apply the new SQL only in a non-production database first.
