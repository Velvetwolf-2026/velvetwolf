// Terms of sale (gallery help page). In the hall: sheets settle into a stack as you read.
import { useCallback } from "react";
import HelpLayout, { DocBody } from "../gallery/help/HelpLayout";
import { useGallery } from "../gallery/galleryContext";
import { TERMS } from "../gallery/help/content";

export function meta() {
  return [{ title: "Terms · VelvetWolf" }, { name: "description", content: "The agreement between you and VelvetWolf when you buy. Written to be read." }];
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
