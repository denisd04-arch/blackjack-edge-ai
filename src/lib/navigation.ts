export type NavSection = {
  href: string;
  label: string;
  description: string;
};

/** Secondary panels. The shoe itself is the home screen. */
export const NAV_SECTIONS: NavSection[] = [
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
  {
    href: "/forward",
    label: "Forward Testing",
    description: "Immutable recommendations captured before you act.",
  },
];
