// Terms of sale (gallery help page). Header: lines being typeset, left to right.
import HelpLayout, { DocBody } from "../gallery/help/HelpLayout";
import { TERMS } from "../gallery/help/content";

export function meta() {
  return [{ title: "Terms · VelvetWolf" }, { name: "description", content: "The agreement between you and VelvetWolf when you buy. Written to be read." }];
}

export default function TermsPage() {
  return (
    <HelpLayout page="terms" eyebrow="Policy" title="Terms of sale" station="quiet" doc updated
      lede="The agreement between you and us when you buy. Written to be read.">
      <DocBody sections={TERMS} />
    </HelpLayout>
  );
}
