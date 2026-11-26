"use client";

import {
  FULL_RANKS,
  SUITS,
  INFINITE_SUIT_SYMBOL as SUIT_SYMBOL,
  cutReached,
  dealerFinished,
  decisionHand,
  expectedTarget,
  holeReserved,
  lifetimeRollup,
  myHandTotal,
  runningCount,
  seenRanks,
  settleSessionRound,
  shoeRollup,
  type FullRank,
  type LiveAnalysis,
  type RoundStakes,
  type Suit,
} from "@blackjack-edge/engine";
import { useEffect, useState, type ReactNode } from "react";
import { cardsDealtPhysical, cutLabel, useInfinite } from "@/lib/use-infinite";
import {
  ENGLISH_TARGETS,
  actionLabel,
  advisorDetail,
  cardAria,
  countSystemLabel,
  engineTargetFor,
  englishFromEngine,
  probabilityLabel,
  qualityLabel,
  retargetEngine,
  roundIsActive,
  sideBetName,
  sideDecisionLabel,
  targetLabel,
  type EnglishTarget,
} from "./copy";

export function TableScreen() {
  const store = useInfinite();
  const { session, live, edge, solving, settings } = store;
  const dealt = cardsDealtPhysical(session);
  const remaining = 52 * session.decks - dealt;
  const roundEvents = session.events.filter((event) => event.round === session.round);
  const active = roundIsActive(session);
  const blocked =
    cutReached(session) && !session.events.some((event) => event.round === session.round);
  const joined = session.participation?.round === session.round ? session.participation : null;
  const [forced, setForced] = useState<EnglishTarget | null>(null);
  const [drawer, setDrawer] = useState(false);
  const [sideId, setSideId] = useState<string | null>(null);
  const [cardClosedFor, setCardClosedFor] = useState<string | null>(null);
  const [dismissedKey, setDismissedKey] = useState<string | null>(null);
  const [reopened, setReopened] = useState(false);
  const [doubleArmed, setDoubleArmed] = useState(false);
  const [armedHits, setArmedHits] = useState(0);

  const engineTarget = blocked || !joined ? null : expectedTarget(session);
  const resolved = !engineTarget
    ? null
    : forced
      ? {
          english: forced,
          engine: engineTargetFor(forced, {
            phase: session.phase,
            shared: roundEvents.filter((event) => event.target === "shared").length,
            hasUp: roundEvents.some((event) => event.target === "dealer_up"),
            hasHole: roundEvents.some((event) => event.target === "dealer_hole"),
            handFinished: Boolean(session.frozenHandIds),
            dealerTurn: session.revealHole,
            cutBlocksNewRound: blocked,
          }),
        }
      : { english: englishFromEngine(engineTarget), engine: engineTarget };
  const cardNeedKey = resolved
    ? `${session.round}:${resolved.engine}:${session.events.length}:${session.phase}:${session.revealHole ? 1 : 0}`
    : null;
  const cardOpen = Boolean(cardNeedKey && cardClosedFor !== cardNeedKey);

  const liveHand = session.phase === "decision" ? decisionHand(session) : null;
  const decisionKey = liveHand
    ? `${session.id}:${session.round}:${liveHand.cards.join(".")}:${liveHand.up}`
    : null;

  useEffect(() => {
    setReopened(false);
  }, [decisionKey]);

  const myHits = roundEvents.filter((event) => event.target === "my_hand").length;
  useEffect(() => {
    if (doubleArmed && myHits > armedHits) {
      setDoubleArmed(false);
      store.onStand();
    }
  }, [armedHits, doubleArmed, myHits, store]);

  const recommendationOpen = Boolean(
    decisionKey && !solving && edge?.hand && (reopened || dismissedKey !== decisionKey)
  );

  const call = edge?.recommendation ?? "SKIP_INSUFFICIENT";
  const edgePct = edge?.playerEdge == null ? null : edge.playerEdge * 100;
  const running = runningCount(seenRanks(session), settings.countSystem);
  const trueText =
    live?.trueCountStatus === "OK" && live.trueCount != null ? live.trueCount.toFixed(2) : "ungültig";
  const quote = joined ? settleSessionRound(session) : null;
  const shoeMoney = shoeRollup(store.ledger, session.id);
  const lifeMoney = lifetimeRollup(store.ledger);
  const myCards = session.frozenHandIds
    ? session.frozenHandIds.flatMap((id) => roundEvents.filter((event) => event.id === id))
    : roundEvents.filter((event) => event.target === "shared" || event.target === "my_hand");
  const side = (live?.sideBets ?? []).find((bet) => bet.id === sideId) ?? null;

  function closeRecommendation() {
    if (!decisionKey) return;
    setDismissedKey(decisionKey);
    setReopened(false);
  }

  function takeAction(action: string) {
    const recommended = edge?.hand?.best.action ?? "STAND";
    store.chooseAction(action, recommended);
    closeRecommendation();
    if (action === "STAND") store.onStand();
    if (action === "SPLIT_FREE" || action === "SPLIT_REGULAR") store.split(action);
    if (action === "DOUBLE_FREE" || action === "DOUBLE_REGULAR") {
      store.doubleDown(action === "DOUBLE_FREE" ? "free-double" : "regular-double");
      setArmedHits(myHits);
      setDoubleArmed(true);
    }
  }

  return (
    <div className="grid gap-3 lg:grid-cols-[15rem_minmax(0,1fr)]">
      <section className="rounded-2xl border border-[#e2c27a]/30 bg-[#0c3b2e] p-3" aria-label="Schuh">
        <h2 className="text-xs uppercase tracking-widest text-[#e2c27a]">Schuh</h2>
        <p className="font-display text-4xl leading-none">{remaining}</p>
        <dl className="mt-2 space-y-1 text-sm">
          <Row label="Gegeben" value={String(dealt)} />
          <Row label="Decks" value={String(session.decks)} />
          <Row label="Cut" value={cutLabel(session.cut, session)} />
          <Row label="Running Count" value={String(running)} />
          <Row label="True Count" value={trueText} />
          <Row label="System" value={countSystemLabel(settings.countSystem)} />
          <Row
            label="Qualität"
            value={qualityLabel(edge?.nextRound.quality ?? null, solving || !edge, live?.trueCountStatus !== "INVALID")}
          />
        </dl>
        {cutReached(session) ? (
          <p className="mt-2 text-xs text-[#e2c27a]">Cut reached. Finish the round, then start a new shoe.</p>
        ) : null}
        <button type="button" className="mt-3 min-h-11 w-full rounded-lg border border-[#e2c27a]/40 text-sm" onClick={() => setDrawer(true)}>
          Shoe details
        </button>
      </section>

      <div className="min-w-0 space-y-3">
        {!active ? (
          <section
            data-testid="round-advisor"
            className="rounded-3xl border border-[#e2c27a]/40 bg-[#0a2a20] p-4 text-center sm:p-6"
          >
            <p className="text-xs uppercase tracking-[0.2em] text-[#e2c27a]">Nächste Runde aus diesem Shoe</p>
            <p className="font-display text-5xl sm:text-7xl">{solving || !edge ? "…" : actionLabel(call)}</p>
            {!solving && edge ? <p className="text-sm">{advisorDetail(call)}</p> : null}
            <p className="mt-2 font-mono text-lg">
              {solving || edgePct == null
                ? "Solving the remaining shoe…"
                : `${edgePct >= 0 ? "+" : ""}${edgePct.toFixed(2)}% player edge`}
            </p>
            <p className="mx-auto mt-2 max-w-xl text-xs text-[#f6f1e4]/60">
              Recomputed from the unseen cards. The help-screen return is a fresh-shoe label only. A positive number is not a play while the main model is partially verified.
            </p>
          </section>
        ) : null}

        <section className="rounded-3xl bg-[radial-gradient(circle_at_top,#16624a,#0b3d2e_55%,#06281c)] p-3 sm:p-4">
          <div className="flex flex-wrap gap-4">
            <Hand title={session.frozenHandIds ? "My Hand · frozen" : "My Hand"} cards={myCards} />
            <Hand
              title="Dealer"
              cards={roundEvents.filter((event) => event.target.startsWith("dealer") && event.target !== "dealer_hole")}
              hole={holeReserved(session)}
              revealed={roundEvents.filter((event) => event.target === "dealer_hole")}
            />
            <Hand title="Andere Spieler" cards={roundEvents.filter((event) => event.target === "other")} />
          </div>
          <p className="mt-3 text-sm text-[#e2c27a]">
            {session.frozenHandIds ? `Frozen total ${myHandTotal(session) ?? "—"}. Other cards do not change it.` : null}
            {resolved ? ` Nächste Karte: ${targetLabel(resolved.english)}` : " Keine Karte nötig."}
            {doubleArmed ? " One more card finishes the double." : ""}
            {session.frozenHandIds && !dealerFinished(session) ? " Settlement waits until the dealer finishes." : ""}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {session.phase === "decision" ? (
              <button type="button" className="min-h-11 rounded-lg bg-[#e2c27a] px-4 text-[#1a1408]" onClick={() => takeAction("STAND")}>
                Stand
              </button>
            ) : null}
            {session.frozenHandIds && !roundEvents.some((event) => event.target === "dealer_hole") && !session.revealHole ? (
              <button type="button" className="min-h-11 rounded-lg border border-[#e2c27a] px-4" onClick={store.revealHole}>
                Reveal hidden card
              </button>
            ) : null}
            {!cardOpen && resolved ? (
              <button type="button" className="min-h-11 rounded-lg border border-white/20 px-4" onClick={() => setCardClosedFor(null)}>
                Karte hinzufügen
              </button>
            ) : null}
            {decisionKey && edge?.hand && !recommendationOpen ? (
              <button
                type="button"
                className="min-h-11 rounded-lg bg-white/10 px-4"
                onClick={() => setReopened(true)}
              >
                Show recommendation
              </button>
            ) : null}
            <button type="button" className="min-h-11 rounded-lg border border-white/20 px-4" onClick={store.onUndo}>
              Undo
            </button>
            <button type="button" className="min-h-11 rounded-lg border border-white/20 px-4" onClick={store.onRedo}>
              Redo
            </button>
          </div>
        </section>

        <section aria-label="Side bets">
          <h2 className="text-xs uppercase tracking-widest text-[#e2c27a]">Side bets</h2>
          <ul className="mt-2 divide-y divide-white/10 rounded-2xl border border-white/10 bg-[#08261c]">
            {(live?.sideBets ?? []).map((bet) => (
              <li key={bet.id}>
                <button
                  type="button"
                  className="flex min-h-11 w-full items-center justify-between gap-3 px-3 text-left text-sm"
                  onClick={() => setSideId(bet.id)}
                >
                  <span>{sideBetName(bet.id)}</span>
                  <span>{sideDecisionLabel(bet.decision, bet.verification === "UNVERIFIED")}</span>
                  <span className="font-mono">EV {bet.ev.toFixed(4)}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>

        <details className="rounded-2xl border border-white/10 bg-[#08261c]">
          <summary className="min-h-11 cursor-pointer px-3 py-2 text-sm">Timeline ({session.events.length})</summary>
          <ol className="max-h-60 space-y-2 overflow-auto px-3 pb-3 text-sm">
            {session.events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-2">
                <span className="font-mono">#{event.seq}</span>
                <span>
                  {event.rank}
                  {SUIT_SYMBOL[event.suit]}
                </span>
                <span className="text-[#f6f1e4]/60">Round {event.round}</span>
                <label className="text-xs">
                  Target
                  <select
                    className="ml-1 min-h-11 rounded-md bg-[#0c3b2e] px-2"
                    value={englishFromEngine(event.target)}
                    onChange={(e) =>
                      store.onRetarget(event.id, retargetEngine(e.target.value as EnglishTarget, event.target))
                    }
                  >
                    {ENGLISH_TARGETS.map((target) => (
                      <option key={target} value={target}>
                        {targetLabel(target)}
                      </option>
                    ))}
                  </select>
                </label>
                <button type="button" className="min-h-11 px-2" onClick={() => store.onDelete(event.id)}>
                  Delete
                </button>
              </li>
            ))}
          </ol>
        </details>
      </div>

      {cardOpen && resolved ? (
        <CardModal
          english={resolved.english}
          automatic={forced == null}
          decks={session.decks}
          used={(rank, suit) => session.events.filter((event) => event.rank === rank && event.suit === suit).length}
          notice={store.notice}
          onClose={() => setCardClosedFor(cardNeedKey)}
          onUndo={store.onUndo}
          onRedo={store.onRedo}
          onAutomatic={() => setForced(null)}
          onForce={setForced}
          onDeal={(rank, suit) => store.deal(rank, suit, resolved.engine)}
        />
      ) : null}

      {recommendationOpen && edge?.hand && decisionKey ? (
        <RecommendationModal
          hand={edge.hand}
          insurance={edge.insurance}
          onClose={closeRecommendation}
          onTake={takeAction}
          onInsurance={(choice) => {
            store.chooseAction(choice, edge.insurance?.recommendation ?? "SKIP");
            const main = session.participation?.stakes.main ?? 0;
            store.insure(choice === "INSURANCE" ? Math.floor(main / 2) : 0);
          }}
        />
      ) : null}

      {drawer ? (
        <Modal title="Shoe details" onClose={() => setDrawer(false)}>
          <p className="text-sm text-[#f6f1e4]/70">
            Counts use the cards removed from this shoe, including a hidden card that is reserved but not yet turned over.
          </p>
          <dl className="mt-3 space-y-1 text-sm">
            <Row label="Free double chance" value={pct(live?.freeBet.pFreeDouble ?? 0)} />
            <Row label="Free split chance" value={pct(live?.freeBet.pFreeSplit ?? 0)} />
            <Row label="Both" value={pct(live?.freeBet.pBoth ?? 0)} />
            <Row label="Either" value={pct(live?.freeBet.pEither ?? 0)} />
            <Row label="Hidden card reserved" value={holeReserved(session) ? "Yes" : "No"} />
            <Row label="Einsatz" value={edge?.kelly.stake ? `${settings.currency} ${edge.kelly.stake.toFixed(2)}` : "kein Einsatz"} />
          </dl>
          <p className="mt-2 text-xs text-[#f6f1e4]/60">
            Either is the double chance plus the split chance, minus both. It is not added on top of the round edge. The suggested stake stays at zero while the main model is partially verified. The shoe and the money ledger are saved in this browser, not the database.
          </p>
          <p className="mt-2 text-sm">
            Session bankroll {settings.currency} {store.ledger.bankroll.toFixed(0)}. Shoe net {money(shoeMoney.roundNet)}. Lifetime net {money(lifeMoney.roundNet)}.
          </p>
          <p className="text-xs text-[#f6f1e4]/70">
            Shoe return {roiText(shoeMoney.roundRoi)}. Main {roiText(shoeMoney.mainRoi)}. Side {roiText(shoeMoney.sideRoi)}. Lifetime {roiText(lifeMoney.roundRoi)}.
            {shoeMoney.winning === null ? "" : shoeMoney.winning ? " This shoe is ahead." : " This shoe is not ahead."}
          </p>
          {edge?.kelly.experimentalStake != null ? (
            <p className="mt-2 text-sm">
              Experimental free-bet figure {settings.currency} {edge.kelly.experimentalStake.toFixed(2)}. This is not an optimal stake.
            </p>
          ) : null}
          {session.report ? (
            <p className="mt-3 text-sm">
              Shoe report: {session.report.cardsDealt} cards dealt, {session.report.cardsRemaining} remaining, {session.report.roundsStarted} rounds started.
            </p>
          ) : null}
        </Modal>
      ) : null}

      {side ? (
        <Modal title={sideBetName(side.id)} onClose={() => setSideId(null)}>
          <p className="text-sm">
            {sideDecisionLabel(side.decision, side.verification === "UNVERIFIED")} · EV {side.ev.toFixed(4)} · computed return {(side.computedRtp * 100).toFixed(4)}%
          </p>
          {side.alternateEv != null ? (
            <p className="mt-2 text-sm">
              If dealer 22 does not pay, EV {side.alternateEv.toFixed(4)}. Both readings are kept. There is no definitive bet.
            </p>
          ) : null}
          <p className="mt-2 text-sm text-[#f6f1e4]/70">{side.note}</p>
          <p className="mt-2 text-xs text-[#f6f1e4]/60">
            Computed from this shoe. The help-screen return is a fresh-shoe label only. Paytable version 2 is unchanged.
          </p>
          <ul className="mt-3 space-y-1 text-sm">
            {Object.entries(side.probabilities).map(([key, value]) => (
              <li key={key} className="flex justify-between gap-3">
                <span>{probabilityLabel(key)}</span>
                <span className="font-mono">{pct(value)}</span>
              </li>
            ))}
          </ul>
        </Modal>
      ) : null}

      {!session.roundStarted && !blocked && session.phase !== "complete" && roundEvents.length === 0 ? (
        <button type="button" className="min-h-11 rounded-lg bg-[#e2c27a] px-4 font-semibold text-[#1a1408]" onClick={() => store.beginRound()}>
          Runde starten
        </button>
      ) : null}

      {session.roundStarted && !joined && !blocked && session.phase !== "complete" ? (
        <ParticipationModal
          recommendation={solving || !edge ? "The assistant is still solving. That is not a wager." : `Assistant says ${actionLabel(call)}. ${advisorDetail(call)} That is not a wager.`}
          currency={settings.currency}
          onPlay={(stakes) => store.confirmPlay(edge?.recommendation ?? "SKIP_INSUFFICIENT", stakes)}
          onSkip={(stakes) => store.confirmSkip(edge?.recommendation ?? "SKIP_INSUFFICIENT", stakes)}
        />
      ) : null}

      {quote?.status === "PENDING" && quote.pendingReason?.includes("Bust It") ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 sm:items-center">
          <div role="dialog" aria-modal="true" aria-label="Bust It confirmation" className="w-full max-w-lg rounded-2xl bg-[#f6f1e4] p-4 text-[#1a1408]">
            <h2 className="font-display text-2xl">Bust It on dealer 22</h2>
            <p className="mt-2 text-sm">{quote.pendingReason} The main hand is not paid from this guess.</p>
            <div className="mt-4 flex flex-wrap gap-2">
              <button type="button" className="min-h-11 rounded-lg bg-[#145c40] px-4 text-[#f6f1e4]" onClick={() => store.answerBust(true)}>
                Yes, 22 paid
              </button>
              <button type="button" className="min-h-11 rounded-lg border border-[#1a1408]/30 px-4" onClick={() => store.answerBust(false)}>
                No, 22 did not pay
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {session.phase === "complete" && quote?.status === "SETTLED" ? (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-2 sm:items-center">
          <div role="dialog" aria-modal="true" aria-label="Round result" className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#f6f1e4] p-4 text-[#1a1408]">
            <p className="text-xs uppercase tracking-[0.2em] text-[#6b5424]">Settled from the cards</p>
            <h2 className="font-display text-3xl">
              {quote.playerTotal === null ? "No main hand" : `${quote.playerTotal} against ${quote.dealerLabel}`}
            </h2>
            <p className="mt-2 text-sm">
              You {quote.actual === "PLAYED" ? "played" : "skipped"}. The assistant had said {actionLabel(quote.recommendation)}.
            </p>
            <dl className="mt-3 space-y-1 text-sm">
              <div className="flex justify-between"><dt>Main net</dt><dd>{money(quote.mainNet)} on {quote.mainCash} cash</dd></div>
              <div className="flex justify-between"><dt>Side net</dt><dd>{money(quote.sideNet)} on {quote.sideCash} cash</dd></div>
              <div className="flex justify-between"><dt>Round net</dt><dd>{money(quote.roundNet)} on {quote.roundCash} cash</dd></div>
              <div className="flex justify-between"><dt>Main return</dt><dd>{roiText(quote.mainRoi)}</dd></div>
              <div className="flex justify-between"><dt>Side return</dt><dd>{roiText(quote.sideRoi)}</dd></div>
              <div className="flex justify-between"><dt>Round return</dt><dd>{roiText(quote.roundRoi)}</dd></div>
              <div className="flex justify-between"><dt>Shoe return</dt><dd>{roiText(shoeMoney.roundRoi)}</dd></div>
              <div className="flex justify-between"><dt>Lifetime return</dt><dd>{roiText(lifeMoney.roundRoi)}</dd></div>
            </dl>
            <p className="mt-2 text-sm">
              {shoeMoney.winning === null ? "No settled money in this shoe yet." : shoeMoney.winning ? "This shoe is ahead on net profit." : "This shoe is not ahead on net profit."}
            </p>
            <ul className="mt-2 text-sm">
              {quote.sides.filter((side) => side.stake > 0).map((side) => (
                <li key={side.id}>{side.name}: {side.category}, net {money(side.net)}</li>
              ))}
            </ul>
            {cutReached(session) ? (
              <p className="mt-4 text-sm">The cut card is out. Start a new shoe when you are ready.</p>
            ) : (
              <button
                type="button"
                className="mt-4 min-h-11 rounded-lg bg-[#145c40] px-4 text-[#f6f1e4]"
                onClick={() => {
                  const error = store.onNextRound();
                  if (error) window.alert(error);
                }}
              >
                NEXT ROUND
              </button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-[#f6f1e4]/70">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function Hand({
  title,
  cards,
  hole,
  revealed = [],
}: {
  title: string;
  cards: { id: string; rank: FullRank; suit: Suit }[];
  hole?: boolean;
  revealed?: { id: string; rank: FullRank; suit: Suit }[];
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[#e2c27a]">{title}</p>
      <div className="mt-1 flex flex-wrap gap-1">
        {cards.map((card) => (
          <Pip key={card.id} rank={card.rank} suit={card.suit} />
        ))}
        {hole ? (
          <span className="flex h-16 w-12 items-center justify-center rounded-md bg-[#123] text-center text-[10px] text-[#e2c27a]">
            Hidden
          </span>
        ) : null}
        {revealed.map((card) => (
          <Pip key={card.id} rank={card.rank} suit={card.suit} />
        ))}
        {cards.length === 0 && !hole && revealed.length === 0 ? (
          <span className="text-sm text-[#f6f1e4]/40">None yet</span>
        ) : null}
      </div>
    </div>
  );
}

function Pip({ rank, suit }: { rank: FullRank; suit: Suit }) {
  const red = suit === "hearts" || suit === "diamonds";
  return (
    <span className="flex h-16 w-12 items-center justify-center rounded-md bg-[#f7f3ea] font-semibold text-[#1a1408]">
      <span className={red ? "text-red-700" : ""}>
        {rank}
        {SUIT_SYMBOL[suit]}
      </span>
    </span>
  );
}

function CardModal({
  english,
  automatic,
  decks,
  used,
  notice,
  onClose,
  onUndo,
  onRedo,
  onAutomatic,
  onForce,
  onDeal,
}: {
  english: EnglishTarget;
  automatic: boolean;
  decks: number;
  used: (rank: FullRank, suit: Suit) => number;
  notice: string | null;
  onClose: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onAutomatic: () => void;
  onForce: (target: EnglishTarget) => void;
  onDeal: (rank: FullRank, suit: Suit) => void;
}) {
  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-black/60 p-2 sm:items-center" data-testid="card-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Karte hinzufügen"
        className="max-h-[85vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-[#06281c] p-3 text-[#f6f1e4] shadow-xl sm:p-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="font-display text-2xl">Karte hinzufügen</h2>
            <p className="text-sm text-[#e2c27a]">
              {targetLabel(english)} · {automatic ? "automatic" : "chosen"}
            </p>
          </div>
          <button type="button" className="min-h-11 rounded-lg border border-white/20 px-3" onClick={onClose}>
            Close
          </button>
        </div>
        {notice ? <p className="mt-2 text-sm text-[#e2c27a]">{notice}</p> : null}
        <div className="mt-3 flex flex-wrap gap-1">
          {SUITS.flatMap((suit) =>
            FULL_RANKS.map((rank) => {
              const left = decks - used(rank, suit);
              return (
                <button
                  key={`${rank}${suit}`}
                  type="button"
                  disabled={left <= 0}
                  aria-label={cardAria(rank, suit, left)}
                  className="min-h-11 rounded-md bg-[#f7f3ea] px-1.5 text-sm font-semibold text-[#1a1408] disabled:opacity-30"
                  onClick={() => onDeal(rank, suit)}
                >
                  <span className={suit === "hearts" || suit === "diamonds" ? "text-red-700" : ""}>
                    {rank}
                    {SUIT_SYMBOL[suit]}
                  </span>
                  <span className="block text-[10px] font-normal">{left}</span>
                </button>
              );
            })
          )}
        </div>
        <details className="mt-3">
          <summary className="min-h-11 cursor-pointer text-sm">Advanced targeting</summary>
          <div className="mt-2 flex flex-wrap gap-2">
            {ENGLISH_TARGETS.map((target) => (
              <button
                key={target}
                type="button"
                className="min-h-11 rounded-lg border border-[#e2c27a]/40 px-3 text-sm"
                onClick={() => onForce(target)}
              >
                {targetLabel(target)}
              </button>
            ))}
            <button type="button" className="min-h-11 rounded-lg border border-white/20 px-3 text-sm" onClick={onAutomatic}>
              Use automatic
            </button>
          </div>
        </details>
        <div className="mt-3 flex gap-2">
          <button type="button" className="min-h-11 rounded-lg border border-white/20 px-4" onClick={onUndo}>
            Undo
          </button>
          <button type="button" className="min-h-11 rounded-lg border border-white/20 px-4" onClick={onRedo}>
            Redo
          </button>
        </div>
      </div>
    </div>
  );
}

function RecommendationModal({
  hand,
  insurance,
  onClose,
  onTake,
  onInsurance,
}: {
  hand: NonNullable<LiveAnalysis["hand"]>;
  insurance: LiveAnalysis["insurance"];
  onClose: () => void;
  onTake: (action: string) => void;
  onInsurance: (choice: string) => void;
}) {
  const advice = hand;
  if (!advice) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-2 sm:items-center" data-testid="recommendation-backdrop">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Recommendation"
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#f6f1e4] p-4 text-[#1a1408] shadow-xl sm:p-6"
      >
        <p className="text-xs uppercase tracking-[0.2em] text-[#6b5424]">Best action</p>
        <p className="font-display text-5xl leading-none sm:text-6xl">{actionLabel(advice.best.action)}</p>
        <p className="mt-2 text-sm">
          EV {advice.best.ev.toFixed(4)} · win {pct(advice.best.win)} · push {pct(advice.best.push)} · loss {pct(advice.best.loss)}
        </p>
        <p className="mt-1 text-xs text-[#1a1408]/70">
          {advice.fallback === "BASIC_STRATEGY"
            ? "Basic strategy fallback. The remaining shoe could not be solved."
            : "From the remaining shoe. Only legal actions are listed."}
        </p>
        <ul className="mt-4 space-y-2">
          {advice.actions.map((action) => (
            <li key={action.action}>
              <button
                type="button"
                className={`min-h-11 w-full rounded-xl px-3 text-left ${action.action === advice.best.action ? "bg-[#145c40] text-[#f6f1e4]" : "bg-white"}`}
                onClick={() => onTake(action.action)}
              >
                <span className="font-semibold">{actionLabel(action.action)}</span>
                <span className="mt-0.5 block font-mono text-xs">
                  EV {action.ev.toFixed(4)} · win {pct(action.win)} · push {pct(action.push)} · loss {pct(action.loss)} · bust {pct(action.bust)}
                </span>
              </button>
            </li>
          ))}
        </ul>
        {insurance && insurance.recommendation !== "SKIP_INSUFFICIENT" ? (
          <div className="mt-4 rounded-xl bg-white p-3 text-sm">
            <p className="font-semibold">Insurance</p>
            <p>
              Ten in the hole {pct(insurance.probabilityTen)} · EV per unit {insurance.evPerUnit.toFixed(4)} · {actionLabel(insurance.recommendation)}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" className="min-h-11 rounded-lg border border-[#1a1408]/20 px-3" onClick={() => onInsurance("INSURANCE")}>
                Take insurance
              </button>
              <button type="button" className="min-h-11 rounded-lg border border-[#1a1408]/20 px-3" onClick={() => onInsurance("SKIP_INSURANCE")}>
                Skip insurance
              </button>
            </div>
          </div>
        ) : null}
        <button type="button" className="mt-4 min-h-11 rounded-lg border border-[#1a1408]/20 px-4" onClick={onClose}>
          Empfehlung schließen
        </button>
      </div>
    </div>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/60 p-2 sm:items-center">
      <div role="dialog" aria-modal="true" aria-label={title} className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#06281c] p-4 text-[#f6f1e4]">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-2xl">{title}</h2>
          <button type="button" className="min-h-11 rounded-lg border border-white/20 px-3" onClick={onClose}>
            Close
          </button>
        </div>
        <div className="mt-3">{children}</div>
      </div>
    </div>
  );
}

function pct(value: number): string {
  return `${(value * 100).toFixed(2)}%`;
}

function money(value: number | null): string {
  if (value === null) return "waiting";
  return `${value >= 0 ? "+" : ""}${value.toFixed(2)}`;
}

function roiText(value: number | null): string {
  if (value === null) return "not available";
  return pct(value);
}

function ParticipationModal({
  recommendation,
  currency,
  onPlay,
  onSkip,
}: {
  recommendation: string;
  currency: string;
  onPlay: (stakes: RoundStakes) => void;
  onSkip: (stakes: RoundStakes) => void;
}) {
  const [choice, setChoice] = useState<"played" | "skipped" | null>(null);
  const [main, setMain] = useState(1);
  const [anyPair, setAnyPair] = useState(0);
  const [plus, setPlus] = useState(0);
  const [hot, setHot] = useState(0);
  const [bust, setBust] = useState(0);
  const stakes = { main: choice === "skipped" ? 0 : main, anyPair, twentyOnePlusThree: plus, hot3: hot, bustIt: bust };
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-2 sm:items-center">
      <div role="dialog" aria-modal="true" aria-label="Hast du mitgespielt" className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[#f6f1e4] p-4 text-[#1a1408]">
        <h2 className="font-display text-3xl">Hast du diese Runde mitgespielt?</h2>
        <p className="mt-2 text-sm">{recommendation}</p>
        {choice === null ? (
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="min-h-11 rounded-lg bg-[#145c40] px-4 text-[#f6f1e4]" onClick={() => setChoice("played")}>
              JA, ICH HABE GESPIELT
            </button>
            <button type="button" className="min-h-11 rounded-lg border border-[#1a1408]/30 px-4" onClick={() => setChoice("skipped")}>
              NEIN, ICH HABE AUSGESETZT
            </button>
          </div>
        ) : (
          <form
            className="mt-4 space-y-3"
            onSubmit={(event) => {
              event.preventDefault();
              if (choice === "played") onPlay(stakes);
              else onSkip(stakes);
            }}
          >
            {choice === "played" ? (
              <StakeField label={`Main bet (${currency})`} value={main} min={1} onChange={setMain} />
            ) : (
              <p className="text-sm">Main stake stays 0. Skipping does not create profit or change the bankroll. Cards still leave the shoe.</p>
            )}
            <StakeField label="Any pair" value={anyPair} min={0} onChange={setAnyPair} />
            <StakeField label="21+3" value={plus} min={0} onChange={setPlus} />
            <StakeField label="Hot 3" value={hot} min={0} onChange={setHot} />
            <StakeField label="Bust It" value={bust} min={0} onChange={setBust} />
            <p className="text-xs text-[#1a1408]/70">Whole units only. A free double or free split is the casino&apos;s money, not yours. Only these amounts are exposure.</p>
            <div className="flex flex-wrap gap-2">
              <button type="submit" className="min-h-11 rounded-lg bg-[#145c40] px-4 text-[#f6f1e4]">Einsätze bestätigen</button>
              <button type="button" className="min-h-11 rounded-lg border border-[#1a1408]/30 px-4" onClick={() => setChoice(null)}>Back</button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function StakeField({ label, value, min, onChange }: { label: string; value: number; min: number; onChange: (value: number) => void }) {
  return (
    <label className="block text-sm">
      {label}
      <input
        className="mt-1 block min-h-11 w-full rounded-lg border border-[#1a1408]/20 px-3"
        type="number"
        inputMode="numeric"
        step={1}
        min={min}
        value={value}
        onChange={(event) => onChange(Math.max(min, Math.round(Number(event.target.value) || 0)))}
      />
    </label>
  );
}
