import { AppShell } from "@/components/layout/app-shell";
import { Card } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import type { NavSection } from "@/lib/navigation";
export function SectionStub({ section }: { section: NavSection }) {
  return (
    <AppShell title={section.label} subtitle={section.description}>
      <Card eyebrow="Infinite" title={section.label}>
        <p className="text-sm leading-relaxed text-ink-muted">
          {section.description}
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