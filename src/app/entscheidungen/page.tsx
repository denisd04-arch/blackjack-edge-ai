import { renderSectionPage, sectionMetadata } from "@/lib/section-page";

const HREF = "/entscheidungen";

export const metadata = sectionMetadata(HREF);

export default function Page() {
  return renderSectionPage(HREF);
}
