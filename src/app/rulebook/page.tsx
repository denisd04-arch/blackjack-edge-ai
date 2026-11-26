"use client";

import {
  FRESH_SHOE_HELP_REFERENCE,
  INFINITE_RULE_FIELDS,
  PAYTABLE_V2,
  freshShoeGapNotes,
} from "@blackjack-edge/engine";
import { useMemo, type ReactNode } from "react";
import { InfiniteShell } from "@/components/infinite/shell";
import { ruleStatusLabel } from "@/components/infinite/copy";

export default function RulebookPage() {
  const gap = useMemo(() => freshShoeGapNotes(), []);
  return (
    <InfiniteShell>
      <h1 className="font-display text-3xl">Regelwerk</h1>
      <p className="mt-2 max-w-3xl text-sm text-[#f6f1e4]/80">
        This assistant follows Evolution Infinite Free Bet Blackjack. Eight decks. The dealer stands on soft 17. Blackjack pays 3 to 2. A normal win pays 1 to 1. Insurance pays 2 to 1 and is a separate bet.
      </p>

      <section className="mt-6 rounded-2xl border border-[#e2c27a]/40 bg-[#0c3b2e] p-4">
        <h2 className="text-xl">Main expected value is partially verified</h2>
        <p className="mt-2 max-w-3xl text-sm text-[#f6f1e4]/80">
          The help screen lists a fresh-shoe blackjack return of {(FRESH_SHOE_HELP_REFERENCE.blackjack * 100).toFixed(2)}%. That figure is a label for an untouched shoe. It is not the edge of the shoe you are in, and it is not scaled by the count. The engine recomputes the next round from the cards that remain. Its product rules do not match that help-screen figure, and double after split, resplit, and the four-hand maximum are still a conflicting reading against an earlier rules sheet. Because of that, a positive number is not a play. The table shows Not definitive instead, and the suggested stake stays at zero.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xl">How a round moves</h2>
        <ul className="mt-2 max-w-3xl list-disc space-y-2 pl-5 text-sm text-[#f6f1e4]/80">
          <li>New shoe starts another eight-deck shoe. It is not the next round.</li>
          <li>Next round is allowed only after the table round is settled.</li>
          <li>Standing, a bust, or Six Card Charlie ends your hand. Other players and the dealer still take cards into this shoe. The round is not settled just because you stood.</li>
          <li>Die Hole Card wird einmal reserviert, sobald die beiden eigenen Startkarten und die Upcard da sind. Sie bleibt in der Zusammensetzung unbekannt, bis sie aufgedeckt wird. Das Aufdecken ersetzt die Reservierung und entfernt keine zweite Karte.</li>
          <li>Die Abrechnung läuft von allein, wenn der Dealer fertig ist. Ein extra Button „Runde fertig“ gibt es nicht. Nur Dealer 22 bei Bust It wird nachgefragt, weil diese Regel UNVERIFIED ist.</li>
          <li>The live shoe is stored in this browser. It is not written to the database.</li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xl">Your hand</h2>
        <ul className="mt-2 max-w-3xl list-disc space-y-2 pl-5 text-sm text-[#f6f1e4]/80">
          <li>Free double on hard 9, 10, or 11. The casino posts the extra unit.</li>
          <li>Regular double on the same hard totals. You post the extra unit. The two doubles are alternatives.</li>
          <li>Free split on pairs of ace through 9. The extra hand is the casino&apos;s stake.</li>
          <li>Regular split on ten-value pairs, with your cash on both hands.</li>
          <li>The active rule set resplits up to four hands and allows double after split. An earlier sheet did not. Those three rules are marked conflicting.</li>
          <li>Split aces take one card each. They are not resplit, and a ten on a split ace is not a natural.</li>
          <li>There is no surrender.</li>
          <li>Dealer 22 pushes a non-busted hand, including Six Card Charlie. A player bust still loses. A natural still pays 3 to 2 against dealer 22.</li>
          <li>Six Card Charlie wins even money per hand when the six cards total 21 or less.</li>
          <li>With an ace or ten up, a dealer blackjack is treated as peeked before extra player stakes are lost. That peek is only partially verified.</li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xl">Fresh-shoe help reference</h2>
        <p className="mt-2 max-w-3xl text-sm text-[#f6f1e4]/70">{gap.explanation}</p>
        <ul className="mt-3 grid gap-2 md:grid-cols-2">
          <li className="rounded-xl bg-[#0c3b2e] p-3 text-sm">Blackjack help reference {(FRESH_SHOE_HELP_REFERENCE.blackjack * 100).toFixed(2)}%</li>
          <li className="rounded-xl bg-[#0c3b2e] p-3 text-sm">Any pair help {(FRESH_SHOE_HELP_REFERENCE.perfectPairs * 100).toFixed(2)}% · computed {(gap.pairs * 100).toFixed(4)}%</li>
          <li className="rounded-xl bg-[#0c3b2e] p-3 text-sm">21+3 help {(FRESH_SHOE_HELP_REFERENCE.twentyOnePlusThree * 100).toFixed(2)}% · computed {(gap.twentyOnePlusThree * 100).toFixed(4)}%</li>
          <li className="rounded-xl bg-[#0c3b2e] p-3 text-sm">Hot 3 help {(FRESH_SHOE_HELP_REFERENCE.hot3 * 100).toFixed(2)}% · computed {(gap.hot3 * 100).toFixed(4)}%</li>
          <li className="rounded-xl bg-[#0c3b2e] p-3 text-sm">Bust It help {(FRESH_SHOE_HELP_REFERENCE.bustIt * 100).toFixed(2)}% · if 22 pays {(gap.bustItIf22Pays * 100).toFixed(4)}% · if 22 does not pay {(gap.bustItIf22DoesNotPay * 100).toFixed(4)}%</li>
        </ul>
      </section>

      <section className="mt-6">
        <h2 className="text-xl">Bust It is unverified</h2>
        <p className="mt-2 max-w-3xl text-sm text-[#f6f1e4]/80">
          The main game pushes dealer 22. The paytable screenshots do not say whether Bust It pays on 22. If 22 pays, the fresh-shoe return is {(gap.bustItIf22Pays * 100).toFixed(4)}%. If it does not, the return is {(gap.bustItIf22DoesNotPay * 100).toFixed(4)}%. The help screen says {(FRESH_SHOE_HELP_REFERENCE.bustIt * 100).toFixed(2)}%. Both engine readings are kept. Bust It never becomes a definitive bet.
        </p>
      </section>

      <section className="mt-6">
        <h2 className="text-xl">Paytable</h2>
        <p className="mt-2 text-sm text-[#f6f1e4]/70">Version 2, from the live help screenshots. A listed multiple is net profit, so 25 to 1 returns the stake as well.</p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Pay title="Any pair">
            <Line name="Perfect pair" odds={`${PAYTABLE_V2.anyPair.perfect} to 1`} />
            <Line name="Colored pair" odds={`${PAYTABLE_V2.anyPair.colored} to 1`} />
            <Line name="Mixed pair" odds={`${PAYTABLE_V2.anyPair.mixed} to 1`} />
          </Pay>
          <Pay title="21+3">
            <Line name="Suited trips" odds={`${PAYTABLE_V2.twentyOnePlusThree.suitedTrips} to 1`} />
            <Line name="Straight flush" odds={`${PAYTABLE_V2.twentyOnePlusThree.straightFlush} to 1`} />
            <Line name="Three of a kind" odds={`${PAYTABLE_V2.twentyOnePlusThree.threeOfAKind} to 1`} />
            <Line name="Straight" odds={`${PAYTABLE_V2.twentyOnePlusThree.straight} to 1`} />
            <Line name="Flush" odds={`${PAYTABLE_V2.twentyOnePlusThree.flush} to 1`} />
          </Pay>
          <Pay title="Hot 3">
            <Line name="7-7-7" odds={`${PAYTABLE_V2.hot3.sevenSevenSeven} to 1`} />
            <Line name="Suited 21" odds={`${PAYTABLE_V2.hot3.suited21} to 1`} />
            <Line name="Unsuited 21" odds={`${PAYTABLE_V2.hot3.unsuited21} to 1`} />
            <Line name="Total 20" odds={`${PAYTABLE_V2.hot3.total20} to 1`} />
            <Line name="Total 19" odds={`${PAYTABLE_V2.hot3.total19} to 1`} />
          </Pay>
          <Pay title="Bust It">
            <Line name="8 or more cards" odds={`${PAYTABLE_V2.bustIt[8]} to 1`} />
            <Line name="7 cards" odds={`${PAYTABLE_V2.bustIt[7]} to 1`} />
            <Line name="6 cards" odds={`${PAYTABLE_V2.bustIt[6]} to 1`} />
            <Line name="5 cards" odds={`${PAYTABLE_V2.bustIt[5]} to 1`} />
            <Line name="4 cards" odds={`${PAYTABLE_V2.bustIt[4]} to 1`} />
            <Line name="3 cards" odds={`${PAYTABLE_V2.bustIt[3]} to 1`} />
          </Pay>
        </div>
      </section>

      <section className="mt-8">
        <h2 className="text-xl">Rule status</h2>
        <ul className="mt-2 space-y-2">
          {INFINITE_RULE_FIELDS.map((rule) => (
            <li key={rule.id} className="rounded-xl border border-white/10 p-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <strong>{rule.label}</strong>
                <span className="rounded-full bg-[#0c3b2e] px-2 py-1 text-xs text-[#e2c27a]">{ruleStatusLabel(rule.status)}</span>
              </div>
              <p className="mt-1 text-[#f6f1e4]/80">{rule.explanation}</p>
              <p className="mt-1 text-xs text-[#f6f1e4]/60">
                Active value {describeValue(rule.override ?? rule.value)}. Source: {rule.source}. Checked {rule.date}.
              </p>
            </li>
          ))}
        </ul>
      </section>
    </InfiniteShell>
  );
}

function Pay({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="rounded-xl bg-[#0c3b2e] p-3">
      <h3 className="text-sm uppercase tracking-widest text-[#e2c27a]">{title}</h3>
      <dl className="mt-2 space-y-1 text-sm">{children}</dl>
    </article>
  );
}

function Line({ name, odds }: { name: string; odds: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt>{name}</dt>
      <dd className="font-mono">{odds}</dd>
    </div>
  );
}

function describeValue(value: unknown): string {
  if (value == null) return "not set";
  if (typeof value === "boolean") return value ? "yes" : "no";
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "number") {
    if (value === 1.5) return "3 to 2";
    if (value === 1) return "1 to 1";
    if (value === 2) return "2 to 1";
    return String(value);
  }
  return "see explanation";
}
