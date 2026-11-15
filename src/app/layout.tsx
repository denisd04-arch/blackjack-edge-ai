import type { Metadata } from "next";
import "./globals.css";
import { LOCALE } from "@/lib/i18n";
import { Providers } from "@/components/providers";

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
      <body className="font-sans">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}