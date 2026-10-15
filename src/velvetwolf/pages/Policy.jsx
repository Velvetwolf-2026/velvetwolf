// Privacy notice (gallery help page). Header: a data map of what we collect, why we use it and
// who we share it with; hovering a data type lights up its links.
import { useEffect, useRef } from "react";
import HelpLayout, { DocBody } from "../gallery/help/HelpLayout";
import { PRIVACY } from "../gallery/help/content";

export function meta() {
  return [{ title: "Privacy policy · VelvetWolf" }, { name: "description", content: "What VelvetWolf collects, why, and who sees it. We don't sell your data." }];
}

export default function PrivacyPolicy() {
  const motifRef = useRef(null);

  useEffect(() => {
    const map = motifRef.current?.querySelector(".motif-map");
    if (!map) return undefined;
    const hi = (id) => {
      map.classList.toggle("is-focus", !!id);
      map.querySelectorAll(".map-node").forEach((n) => n.classList.toggle("is-on", n.dataset.id === id));
      map.querySelectorAll(".map-link").forEach((l) => l.classList.toggle("is-on", l.dataset.a === id || l.dataset.b === id));
    };
    const over = (e) => hi(e.target.closest(".map-node")?.dataset.id);
    const leave = () => hi(null);
    map.addEventListener("pointerover", over);
    map.addEventListener("pointerleave", leave);
    return () => { map.removeEventListener("pointerover", over); map.removeEventListener("pointerleave", leave); };
  }, []);

  return (
    <HelpLayout page="privacy-policy" eyebrow="Policy" title="Privacy" station="quiet" motifRef={motifRef} doc updated
      lede="What we collect, why, and who sees it. We don't sell your data.">
      <DocBody sections={PRIVACY} />
    </HelpLayout>
  );
}
