export type NavSection = {
  href: string;
  labelDe: string;
  phase: number;
  descriptionDe: string;
};

/** Eleven product sections (Phasen 2–12). */
export const NAV_SECTIONS: NavSection[] = [
  {
    href: "/tisch",
    labelDe: "Digitaler Tisch",
    phase: 2,
    descriptionDe: "Manuelle Karteneingabe und Tischansicht.",
  },
  {
    href: "/karten",
    labelDe: "Kartenvorrat",
    phase: 3,
    descriptionDe: "Reststapel, Zählung Hi-Lo und Omega II.",
  },
  {
    href: "/ev",
    labelDe: "Wahrscheinlichkeit & EV",
    phase: 4,
    descriptionDe: "Zusammensetzungsabhängige Erwartungswerte.",
  },
  {
    href: "/entscheidungen",
    labelDe: "Entscheidungstracker",
    phase: 5,
    descriptionDe: "Live-Hände und optimale Aktionen.",
  },
  {
    href: "/regeln",
    labelDe: "Free-Bet-Regeln",
    phase: 6,
    descriptionDe: "Evolution Free Bet und Infinite Free Bet.",
  },
  {
    href: "/nebenwetten",
    labelDe: "Nebenwetten",
    phase: 7,
    descriptionDe: "Analyse von Side Bets.",
  },
  {
    href: "/bankroll",
    labelDe: "Bankroll",
    phase: 8,
    descriptionDe: "Risiko, Einsatz und Varianz.",
  },
  {
    href: "/backtest",
    labelDe: "Backtesting",
    phase: 9,
    descriptionDe: "Historische Simulationen.",
  },
  {
    href: "/forwardtest",
    labelDe: "Forwardtesting",
    phase: 10,
    descriptionDe: "Laufende Validierung im Spiel.",
  },
  {
    href: "/assistent",
    labelDe: "KI-Assistent",
    phase: 11,
    descriptionDe: "Erklärungen nur auf Engine-Daten.",
  },
  {
    href: "/analyse",
    labelDe: "Leistung & QA",
    phase: 12,
    descriptionDe: "Analytics und Qualitätssicherung.",
  },
];