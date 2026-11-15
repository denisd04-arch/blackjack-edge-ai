import type { Metadata } from "next";
import { IBM_Plex_Mono, IBM_Plex_Sans, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { LOCALE } from "@/lib/i18n";

const plexSans = IBM_Plex_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const plexMono = IBM_Plex_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: {
    default: "Blackjack Edge AI",
    template: "%s · Blackjack Edge AI",
  },
  description:
    "Mathematische Analyse für Evolution Free Bet und Infinite Free Bet Blackjack.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang={LOCALE}>
      <body
        className={`${plexSans.variable} ${spaceGrotesk.variable} ${plexMono.variable} font-sans`}
      >
        {children}
      </body>
    </html>
  );
}