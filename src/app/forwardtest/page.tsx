import { renderSectionPage, sectionMetadata } from "@/lib/section-page";

const HREF = "/forwardtest";

export const metadata = sectionMetadata(HREF);

export default function Page() {
  return renderSectionPage(HREF);
}
