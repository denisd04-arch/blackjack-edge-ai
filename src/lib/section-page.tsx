import { notFound } from "next/navigation";
import { SectionStub } from "@/components/sections/section-stub";
import { NAV_SECTIONS } from "@/lib/navigation";

export function renderSectionPage(href: string) {
  const section = NAV_SECTIONS.find((s) => s.href === href);
  if (!section) notFound();
  return <SectionStub section={section} />;
}

export function sectionMetadata(href: string) {
  const section = NAV_SECTIONS.find((s) => s.href === href);
  if (!section) return { title: "Blackjack Edge AI" };
  return { title: section.label };
}