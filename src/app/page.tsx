import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { DataPanel, DataPanelGrid } from "@/components/ui/data-panel";
import { NAV_SECTIONS } from "@/lib/navigation";
import {
  EVOLUTION_FREE_BET_STUB,
  EVOLUTION_INFINITE_FREE_BET_STUB,
  StubBlackjackMathEngine,
} from "@blackjack-edge/engine";

export default function HomePage() {
  const health = new StubBlackjackMathEngine(EVOLUTION_FREE_BET_STUB).health();

  return (
    <AppShell
      title="Übersicht"
      subtitle="Premium-Terminal für Evolution Free Bet Blackjack — Mathe-Engine als einzige Wahrheitsquelle."
    >
      <DataPanelGrid>
        <DataPanel label="Varianten" value="2" hint="Nur Evolution Free Bet" />
        <DataPanel
          label="Engine-Status"
          value={health.ready ? "Bereit" : "Stub"}
          hint={health.messageDe}
        />
        <DataPanel
          label="Profil"
          value={
            EVOLUTION_FREE_BET_STUB.incomplete ? "Unvollständig" : "Vollständig"
          }
          hint={`Felder offen: ${EVOLUTION_FREE_BET_STUB.missingFields.length}`}
        />
      </DataPanelGrid>

      <OverviewCards health={health} />
    </AppShell>
  );
}

function OverviewCards({ health }: { health: { messageDe: string } }) {
  return (
    <div className="mt-8 grid gap-4 lg:grid-cols-2">
      <Card eyebrow="Phase 1" title="Design-System & Navigation">
        <p className="text-sm text-ink-muted">
          Alle elf Produktbereiche sind erreichbar. Visuelles System: Near-Black,
          Graphit, Neon-Grün und smaragdene Verläufe — Tisch-nah, nicht generisches
          SaaS.
        </p>
        <ul className="mt-3 space-y-2 text-sm text-ink-muted">
          <li>· {EVOLUTION_FREE_BET_STUB.labelDe}</li>
          <li>· {EVOLUTION_INFINITE_FREE_BET_STUB.labelDe}</li>
        </ul>
      </Card>
      <Card eyebrow="Engine-Schnittstelle" title="Typen dokumentiert">
        <p className="text-sm text-ink-muted">{health.messageDe}</p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/tisch" variant="primary">
            Zum digitalen Tisch
          </ButtonLink>
          <ButtonLink href="/ev">EV-Bereich</ButtonLink>
        </div>
      </Card>
      <Card
        className="lg:col-span-2"
        eyebrow="Module"
        title="Alle Bereiche (Phasen 2–12)"
      >
        <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {NAV_SECTIONS.map((s) => (
            <li key={s.href}>
              <ButtonLink href={s.href} variant="ghost" className="w-full justify-start">
                {s.labelDe}
              </ButtonLink>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}