import { renderSectionPage, sectionMetadata } from "@/lib/section-page";

const HREF = "/regeln";

export const metadata = sectionMetadata(HREF);

export default function Page() {
  return renderSectionPage(HREF);
}
