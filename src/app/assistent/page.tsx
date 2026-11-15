import { renderSectionPage, sectionMetadata } from "@/lib/section-page";

const HREF = "/assistent";

export const metadata = sectionMetadata(HREF);

export default function Page() {
  return renderSectionPage(HREF);
}
