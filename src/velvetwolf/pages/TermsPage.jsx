// Terms of sale (gallery help page). In the hall: sheets settle into a stack as you read.
import { useCallback } from "react";
import HelpLayout, { DocBody } from "../gallery/help/HelpLayout";
import { useGallery } from "../gallery/galleryContext";
import { TERMS } from "../gallery/help/content";
import { pageMeta, webPageLd, breadcrumbLd } from "../utils/seo";

export function meta() {
  const title = "Terms · VelvetWolf";
  const description = "The agreement between you and VelvetWolf when you buy: orders, prices, payment, delivery, returns and custom Studio designs. Written to be read.";
  return pageMeta({ title, description, path: "/terms", schema: [webPageLd({ name: title, description, path: "/terms" }), breadcrumbLd([["Home", "/"], ["Terms", "/terms"]])] });
}

export default function TermsPage() {
  // sheets drift down and settle into a stack as you read; they move only when you scroll
  const { engine } = useGallery();
  const onReadProgress = useCallback((p) => engine?.help.terms.set({ progress: p }), [engine]);
  return (
    <HelpLayout page="terms" eyebrow="Policy" title="Terms of sale" doc updated onReadProgress={onReadProgress}
      lede="The agreement between you and us when you buy. Written to be read.">
      <DocBody sections={TERMS} />
    </HelpLayout>
  );
}
