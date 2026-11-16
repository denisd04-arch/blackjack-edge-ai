export type NavSection = {
  href: string;
  label: string;
  description: string;
};

/** Header links. The shoe itself is the home screen. */
export const HEADER_NAV: NavSection[] = [
  {
    href: "/settings",
    label: "Settings",
    description: "Stakes, cut card, counting system, and presets.",
  },
  {
    href: "/testing",
    label: "Testing",
    description: "Manual, autoplay, and multi-shoe runs.",
  },
  {
    href: "/rulebook",
    label: "Rulebook",
    description: "Rule status and the fresh-shoe help reference.",
  },
];

export const FORWARD_SECTION: NavSection = {
  href: "/forward",
  label: "Forward testing",
  description: "Immutable recommendations captured before you act.",
};

/** Header routes plus forward testing, which is opened from Testing. */
export const NAV_SECTIONS: NavSection[] = [...HEADER_NAV, FORWARD_SECTION];
