# Final project report

Status: implemented on `cursor/full-completion-dbeb`. Not merged. The live site was not updated.

## What is production-ready

The branch keeps the existing Infinite shoe and extends it. Card tracking, freeze, split settlement, and the participation split between recommendation and action are covered by tests. It is not production until this branch is reviewed, merged, and a deployment is verified READY.

Not production-ready: remote persistence. The new SQL file was not applied. There is no signed-in sync in this run.

## Technical changes

- Session hands freeze on stand, bust, natural blackjack, Six Card Charlie, split aces, and a completed double. Other-player cards leave the shoe once and cannot join a frozen hand.
- The hole is a reservation. Reveal writes that one card and does not remove another. Physical dealt count stays the same across the reveal.
- Settlement sums each frozen hand, insurance, and side bets. Dealer 22 is its own result. Bust It on 22 stays pending until the table is confirmed. Repeating a settled key does not move the bankroll.
- Main RTP is still the recomputed product-rule figure, about 99.347%, against the help-screen reference 98.45%. Limiting DAS and hands moves it to about 98.375% and still does not match 98.45%. The solver is not fitted.
- Stake appears only from `stakeFromVerifiedDistribution` when verification is VERIFIED, the distribution is a full profit law, and a Monte Carlo sample (if used) has seed, at least 10,000 trials, a standard error, and an interval above zero. The live screen does not meet that bar, so the stake stays empty.
- `playShoeEngine` is the autoplay and batch path. It deals a shuffled shoe, hides the hole until reveal, lets other seats take their own cards, and settles with `handProfit`.
- Local archive copies a validated session and leaves `beai-infinite-session-v2` in place.
- UI locale is `de`. Cut card and deck count change the next shoe. The open shoe is kept unless the new-shoe confirm is accepted.

## Tests actually run

| Command | Result |
| --- | --- |
| `npx vitest run` before edits | 95 passed |
| `npx tsc --noEmit` | passed |
| `npm run typecheck -w @blackjack-edge/engine` | passed |
| `npx next lint` | no warnings or errors |
| `npx vitest run` after edits | 113 passed, 28 files |

Not run: a full browser pass of desktop, tablet, and phone. No production Supabase call. No Vercel deploy.

## Math validation

- Main EV quality on a long shoe is APPROXIMATE. Verification is PARTIALLY_VERIFIED. Recommendation on a rich shoe is NOT DEFINITIVE, not PLAY.
- Side bets keep Paytable V2. Bust It reports both dealer-22 hypotheses and is never BET.
- Count: running count and true count still come from seen ranks. An invalid inventory does not invent a true count.
- Dealer probabilities, including 22 separate from bust, are unchanged in the dealer solver.
- Split EV remains inside the existing composition solver. Live split settlement uses the cards, not that EV.
- Kelly on the live screen has no stake. A synthetic verified 60/40 distribution does size a capped stake in the unit test.
- ROI is net divided by player cash. Casino-funded free stakes are not cash. Zero cash is N/A.
- Bankroll path is recorded on engine shoes. It is not a claim that the game is profitable.

## Persistence

Offline save, restore, archive, idempotent event sequence, and owner rejection are tested in `src/lib/persistence/persistence.test.ts`. Migration `20261126180000_round_settlement.sql` is marked NOT APPLIED.

## Open items

- Connect the signed-in user to Supabase only after the new SQL is applied somewhere other than production and the RLS policies are checked there.
- Finish German copy on engine notes and any leftover English sentences in the result dialog.
- Source DAS, resplit, max hands, and Bust It on 22 before any of those can become definitive.
- Leave seven-seat Free Bet incomplete until a sourced difference exists.

## Deployment steps still required

1. Review and merge the branch.
2. Apply `supabase/migrations/20261126180000_round_settlement.sql` to a non-production database and confirm a user cannot read another user's rows.
3. Deploy with the existing public Supabase URL and anon key only. Do not add a service role.
4. Confirm the deployment is READY before saying the live site changed.
