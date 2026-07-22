// Utility for GSAP animation loading, Framer-to-GSAP ease conversion,
// and scroll-triggered entrance animations extracted from ImageGallery.

export function ensureGsap() {
  return new Promise((resolve) => {
    if (typeof window !== "undefined" && window.gsap) {
      return resolve(window.gsap);
    }
    let gsapScript = document.getElementById("ma-gsap");
    if (!gsapScript) {
      gsapScript = document.createElement("script");
      gsapScript.id = "ma-gsap";
      gsapScript.src = "https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js";
      gsapScript.async = true;
      document.head.appendChild(gsapScript);
    }
    if (window.gsap) {
      resolve(window.gsap);
    } else {
      gsapScript.addEventListener("load", () => resolve(window.gsap));
    }
  });
}

export function framerEaseToGsap(ease) {
  if (!ease || ease === "linear") return "none";
  if (Array.isArray(ease))
    return `cubic-bezier(${ease[0]},${ease[1]},${ease[2]},${ease[3]})`;
  const map = {
    easeIn: "power2.in",
    easeOut: "power2.out",
    easeInOut: "power2.inOut",
    circIn: "circ.in",
    circOut: "circ.out",
    circInOut: "circ.inOut",
    backIn: "back.in",
    backOut: "back.out",
    backInOut: "back.inOut",
    anticipate: "back.inOut(1.7)",
    bounceIn: "bounce.in",
    bounceOut: "bounce.out",
  };
  return map[ease] ?? "power2.out";
}

/**
 * Animates a list of card DOM elements into view using GSAP
 * with scale, translation offset, opacity, and staggered delay.
 */
export async function animateCardsEntrance(elements, options = {}) {
  const gsap = await ensureGsap();
  if (!gsap || !elements || elements.length === 0) return;

  const {
    duration = 1.2,
    ease = "easeInOut",
    stagger = 0.15,
    initialScale = 1.15,
    initialOffsetY = 40,
  } = options;

  const gsapEase = framerEaseToGsap(ease);

  elements.forEach((el, index) => {
    gsap.killTweensOf(el);
    gsap.set(el, {
      opacity: 0,
      scale: initialScale,
      y: initialOffsetY,
      transformOrigin: "center center",
      willChange: "transform, opacity",
    });

    gsap.to(el, {
      opacity: 1,
      scale: 1,
      y: 0,
      duration: duration,
      delay: index * stagger,
      ease: gsapEase,
      clearProps: "willChange",
    });
  });
}
