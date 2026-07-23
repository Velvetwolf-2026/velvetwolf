import { lazy, Suspense, useState, useEffect } from "react";

// Cinematic3DHero pulls in three.js + GLTFLoader — heavy, WebGL-only, and worth
// zero SEO value. Keeping it out of the server render (and out of the initial
// client bundle) fixes both an SSR crash (it reads localStorage at render time)
// and the homepage's oversized JS payload in one move.
const Cinematic3DHero = lazy(() => import("./Cinematic3DHero"));

function HeroPlaceholder() {
  return (
    <div
      style={{
        width: "100%",
        minHeight: "100vh",
        background: "radial-gradient(circle at 50% 40%, #1a1a1a 0%, #0a0a0a 70%)",
      }}
      aria-hidden="true"
    />
  );
}

export default function ClientOnly3DHero() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted) return <HeroPlaceholder />;

  return (
    <Suspense fallback={<HeroPlaceholder />}>
      <Cinematic3DHero />
    </Suspense>
  );
}
