import { FRESH_SHOE_HELP_REFERENCE } from "./side-bets";

/**
 * The help-screen 98.45% is a fresh-shoe label. It is not an input to the solver.
 * Product rules (DAS, resplit, four hands) recompute near 99.347%.
 * The same solver with DAS off and two hands moves toward the help figure and still misses it.
 */
export function explainMainRtpGap(input: { productRtp: number; limitedRtp: number }) {
  const help = FRESH_SHOE_HELP_REFERENCE.blackjack;
  return {
    helpRtp: help,
    helpScope: "fresh-shoe reference only",
    productRtp: input.productRtp,
    limitedRtp: input.limitedRtp,
    deltaProductVsHelp: input.productRtp - help,
    deltaLimitedVsHelp: input.limitedRtp - help,
    method:
      "compositionNextRound: exact hypergeometric weight on the opening two cards and the upcard, depleting-shoe dealer totals including 22, later player draws from that composition with replacement. Long-shoe quality is APPROXIMATE. The help RTP is not read.",
    assumptions: [
      "8 decks, dealer stands on soft 17, blackjack 3:2, ordinary win 1:1",
      "free double on hard 9/10/11, regular double on the same totals",
      "free split on A–9, regular split on tens, split aces take one card and are not resplit",
      "active overrides: resplit until 4 hands, double after split. Both readings conflict with an earlier PDF pass",
      "dealer 22 pushes an eligible hand and is not a bust; natural blackjack still pays 3:2; player busts lose; Six Card Charlie wins 1:1 and pushes on 22",
      "dealer peek is only partially verified",
    ],
    verification: "PARTIALLY_VERIFIED" as const,
    fittedToHelp: false,
    unresolved:
      "Turning DAS off and limiting the round to two hands closes most of the gap and does not land on 98.45%. The remainder is not assigned to an unstated rule.",
  };
}
