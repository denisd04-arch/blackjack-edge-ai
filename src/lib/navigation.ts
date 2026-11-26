export type NavSection = {
  href: string;
  label: string;
  description: string;
};

/** Header links. The shoe itself is the home screen. */
export const HEADER_NAV: NavSection[] = [
  {
    href: "/settings",
    label: "Einstellungen",
    description: "Einsätze, Cut Card, Zählsystem und Presets.",
  },
  {
    href: "/testing",
    label: "Test",
    description: "Manuell, Autoplay und mehrere Shoes.",
  },
  {
    href: "/rulebook",
    label: "Regelwerk",
    description: "Regelstatus und die Fresh-Shoe-Referenz.",
  },
];

export const FORWARD_SECTION: NavSection = {
  href: "/forward",
  label: "Forward-Test",
  description: "Empfehlungen, die vor der Aktion eingefroren werden.",
};

/** Header routes plus forward testing, which is opened from Testing. */
export const NAV_SECTIONS: NavSection[] = [...HEADER_NAV, FORWARD_SECTION];
