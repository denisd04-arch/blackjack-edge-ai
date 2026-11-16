"use client";

import {
  FULL_RANKS,
  SUITS,
  INFINITE_SUIT_SYMBOL as SUIT_SYMBOL,
  type FullRank,
  type Suit,
} from "@blackjack-edge/engine";

type CardTarget = "shared" | "dealer_up" | "dealer_hole" | "dealer_draw" | "my_hand" | "other";
import { cardsDealtPhysical, cutReached, expectedTarget, holeReserved, useInfinite } from "@/lib/use-infinite";

const TARGETS: CardTarget[] = ["shared", "dealer_up", "dealer_hole", "dealer_draw", "my_hand", "other"];

export function TableScreen() {
  const store = useInfinite();
  const { session, live, edge, solving, settings } = store;
  const dealt = cardsDealtPhysical(session);
  const remaining = 52 * session.decks - dealt;
  const call = edge?.recommendation ?? "SKIP_INSUFFICIENT";
  const edgePct = edge?.playerEdge === null || edge?.playerEdge === undefined ? null : edge.playerEdge * 100;
  const roundEvents = session.events.filter((e) => e.round === session.round);

  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <section className="rounded-2xl border border-[#e2c27a]/30 bg-[#0c3b2e] p-4">
        <h2 className="text-sm uppercase tracking-widest text-[#e2c27a]">Shoe</h2>
        <p className="mt-2 font-display text-4xl">{remaining}</p>
        <p className="text-sm text-[#f6f1e4]/70">cards still unseen · {dealt} removed</p>
        <p className="mt-3 text-sm">Cut {session.cut.mode.replaceAll("_", " ")}</p>
        <p className="text-sm text-[#f6f1e4]/70">
          {session.cut.mode === "CUT_AFTER_CARDS_DEALT" ? `${dealt} / ${session.cut.cardsDealt}` : session.cut.mode}
        </p>
        {cutReached(session) ? (
          <p className="mt-3 rounded-lg bg-[#1a1408] p-3 text-sm text-[#e2c27a]">
            Cut reached. Finish this round, read the shoe report, then NEW SHOE only.
          </p>
        ) : null}
        <dl className="mt-4 space-y-1 text-sm">
          <div className="flex justify-between"><dt>True count</dt><dd>{live?.trueCountStatus === "OK" ? live.trueCount?.toFixed(2) : "INVALID"}</dd></div>
          <div className="flex justify-between"><dt>System</dt><dd>{settings.countSystem}</dd></div>
          <div className="flex justify-between"><dt>Hole reserved</dt><dd>{holeReserved(session) ? "yes" : "no"}</dd></div>
        </dl>
        <h3 className="mt-4 text-xs uppercase tracking-widest text-[#e2c27a]">Free bet chances</h3>
        <p className="text-sm">Double {((live?.freeBet.pFreeDouble ?? 0) * 100).toFixed(2)}%</p>
        <p className="text-sm">Split {((live?.freeBet.pFreeSplit ?? 0) * 100).toFixed(2)}%</p>
        <p className="text-sm">Both {((live?.freeBet.pBoth ?? 0) * 100).toFixed(2)}%</p>
        <p className="text-sm">Either {((live?.freeBet.pEither ?? 0) * 100).toFixed(2)}%</p>
        <p className="mt-2 text-xs text-[#f6f1e4]/60">P(either) = P(double)+P(split)−P(both). Not added on top of the round EV.</p>
      </section>

      <div className="space-y-4">
        <section className={`rounded-3xl border p-6 text-center ${call === "PLAY" ? "border-[#e2c27a] bg-[#145c40]" : "border-white/10 bg-[#0a2a20]"}`}>
          <p className="text-xs uppercase tracking-[0.2em] text-[#e2c27a]">Next round from this shoe</p>
          <p className="font-display text-6xl sm:text-7xl">
            {solving || !edge ? "…" : call === "SKIP_INSUFFICIENT" ? "SKIP" : call}
          </p>
          {!solving && edge && call === "SKIP_INSUFFICIENT" ? <p className="text-sm">INSUFFICIENT DATA</p> : null}
          <p className="mt-2 font-mono text-xl">
            {solving || edgePct === null ? "Solving the remaining shoe…" : `${edgePct >= 0 ? "+" : ""}${edgePct.toFixed(2)}% player edge`}
          </p>
          <p className="text-xs text-[#f6f1e4]/70">
            {edge ? `${edge.nextRound.quality} · EV ${edge.nextRound.ev.toFixed(4)} units` : "Waiting for the composition solve"}
          </p>
          <p className="mx-auto mt-2 max-w-xl text-xs text-[#f6f1e4]/60">
            This edge is recomputed from the unseen cards, the Evolution rules, and optimal play. The help-screen RTP is a fresh-shoe label only. A long shoe is marked approximate because cards drawn inside the hand do not further change the composition.
          </p>
        </section>

        <section className="rounded-3xl bg-[radial-gradient(circle_at_top,#16624a,#0b3d2e_55%,#06281c)] p-4 shadow-inner">
          <div className="flex flex-wrap justify-between gap-4">
            <Hand title="Shared" cards={roundEvents.filter((e) => e.target === "shared")} />
            <Hand title="Dealer" cards={roundEvents.filter((e) => e.target.startsWith("dealer"))} hole={holeReserved(session)} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Hand title="My hits" cards={roundEvents.filter((e) => e.target === "my_hand")} />
            <Hand title="Other players" cards={roundEvents.filter((e) => e.target === "other")} />
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="min-h-11 rounded-lg bg-[#e2c27a] px-4 text-[#1a1408]" onClick={store.onStand}>Stand</button>
            <button type="button" className="min-h-11 rounded-lg border border-[#e2c27a]/50 px-4" onClick={store.onComplete}>Round complete</button>
            <button type="button" className="min-h-11 rounded-lg border border-white/20 px-4" onClick={store.onUndo}>Undo</button>
            <button type="button" className="min-h-11 rounded-lg border border-white/20 px-4" onClick={store.onRedo}>Redo</button>
            {edge?.hand ? (
              <button type="button" className="min-h-11 rounded-lg bg-white/10 px-4" onClick={() => store.chooseAction(edge.hand!.best.action)}>
                Best {edge.hand.best.action} {edge.hand.fallback === "BASIC_STRATEGY" ? "(basic fallback)" : ""}
              </button>
            ) : null}
          </div>
          {edge?.hand ? (
            <ul className="mt-3 grid gap-1 text-sm sm:grid-cols-2">
              {edge.hand.actions.map((a) => (
                <li key={a.action}>
                  <button type="button" className="min-h-11 w-full rounded-lg bg-black/20 px-3 text-left" onClick={() => store.chooseAction(a.action)}>
                    {a.action} · EV {a.ev.toFixed(3)}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </section>

        <section>
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <h2 className="text-sm uppercase tracking-widest text-[#e2c27a]">One-tap cards</h2>
            <button type="button" className="min-h-11 rounded-lg border border-white/20 px-3 text-sm" onClick={() => store.setQuick(!session.quickMode)}>
              {session.quickMode ? "Quick mode" : "Advanced"}
            </button>
            <span className="text-xs text-[#f6f1e4]/60">Next target {expectedTarget(session) ?? "none"}</span>
          </div>
          {!session.quickMode ? (
            <div className="mb-2 flex flex-wrap gap-1">
              {TARGETS.map((target) => (
                <button key={target} type="button" className="min-h-11 rounded-lg border border-[#e2c27a]/40 px-2 text-xs" onClick={() => store.setForcedTarget(target)}>
                  {target}
                </button>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-1">
            {SUITS.flatMap((suit) =>
              FULL_RANKS.map((rank) => {
                const used = session.events.filter((e) => e.rank === rank && e.suit === suit).length;
                const left = session.decks - used;
                return (
                  <button
                    key={`${rank}${suit}`}
                    type="button"
                    disabled={left <= 0}
                    className="min-h-11 rounded-md bg-[#f7f3ea] px-1 text-sm font-semibold text-[#1a1408] disabled:opacity-30"
                    onClick={() => store.deal(rank, suit, session.quickMode ? undefined : session.forcedTarget ?? undefined)}
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
        </section>

        <section className="grid gap-3 md:grid-cols-2">
          {(live?.sideBets ?? []).map((bet) => (
            <article key={bet.id} className="rounded-2xl border border-white/10 bg-[#08261c] p-3">
              <h3 className="text-sm uppercase text-[#e2c27a]">{bet.id.replaceAll("_", " ")}</h3>
              <p className="font-mono text-lg">{bet.decision} · EV {bet.ev.toFixed(4)}</p>
              <p className="text-xs text-[#f6f1e4]/60">Computed RTP {(bet.computedRtp * 100).toFixed(4)}% from this shoe. Not the help-screen figure.</p>
            </article>
          ))}
        </section>

        <section>
          <h2 className="text-sm uppercase tracking-widest text-[#e2c27a]">Timeline</h2>
          <ol className="mt-2 max-h-48 space-y-1 overflow-auto text-sm">
            {session.events.map((event) => (
              <li key={event.id} className="flex flex-wrap items-center gap-2">
                <span className="font-mono">#{event.seq}</span>
                <span>{event.rank}{SUIT_SYMBOL[event.suit]}</span>
                <span className="text-[#f6f1e4]/60">{event.target}</span>
                <button type="button" className="min-h-11 px-2" onClick={() => store.onDelete(event.id)}>Delete</button>
                <button
                  type="button"
                  className="min-h-11 px-2"
                  onClick={() => store.onRetarget(event.id, event.target === "other" ? "dealer_draw" : "other")}
                >
                  Retarget
                </button>
              </li>
            ))}
          </ol>
        </section>
        {session.report ? (
          <pre className="overflow-auto rounded-xl bg-black/40 p-3 text-xs">{JSON.stringify(session.report, null, 2)}</pre>
        ) : null}
      </div>
    </div>
  );
}

function Hand({
  title,
  cards,
  hole,
}: {
  title: string;
  cards: { id: string; rank: FullRank; suit: Suit }[];
  hole?: boolean;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-widest text-[#e2c27a]">{title}</p>
      <div className="mt-1 flex gap-1">
        {cards.map((card) => (
          <span key={card.id} className="flex h-16 w-12 items-center justify-center rounded-md bg-[#f7f3ea] font-semibold text-[#1a1408]">
            <span className={card.suit === "hearts" || card.suit === "diamonds" ? "text-red-700" : ""}>
              {card.rank}
              {SUIT_SYMBOL[card.suit]}
            </span>
          </span>
        ))}
        {hole ? <span className="flex h-16 w-12 items-center justify-center rounded-md bg-[#123] text-xs text-[#e2c27a]">hole</span> : null}
      </div>
    </div>
  );
}
