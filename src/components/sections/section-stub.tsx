import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import type { NavSection } from "@/lib/navigation";
import { formatPhaseLabel } from "@/lib/i18n";

export function SectionStub({ section }: { section: NavSection }) {
  return (
    <AppShell title={section.labelDe} subtitle={section.descriptionDe}>
      <Card
        eyebrow={formatPhaseLabel(section.phase)}
        title={`${section.labelDe} — In Vorbereitung`}
      >
        <p className="text-sm leading-relaxed text-ink-muted">
          {section.descriptionDe} Dieser Bereich wird in{" "}
          {formatPhaseLabel(section.phase)} implementiert. Bis dahin liefert die
          Mathe-Engine keine definitiven EV-Werte bei unvollständigen Profilen.
        </p>
        <div className="mt-4">
          <ButtonLink href="/" variant="ghost">
            Zurück zur Übersicht
          </ButtonLink>
        </div>
      </Card>
    </AppShell>
  );
}