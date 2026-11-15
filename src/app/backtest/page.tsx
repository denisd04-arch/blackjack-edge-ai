import { renderSectionPage, sectionMetadata } from "@/lib/section-page";

const HREF = "/backtest";

export const metadata = sectionMetadata(HREF);

export default function Page() {
  return renderSectionPage(HREF);
}
