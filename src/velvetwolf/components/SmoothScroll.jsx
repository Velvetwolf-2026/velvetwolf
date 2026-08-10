import { useEffect } from "react";

/* ------------------------------------------------------------------ */
/*  VELVETWOLF — global momentum scroll                                */
/*  A lightweight Lenis-style eased wheel scroll. It owns the window   */
/*  scroll position and lerps toward a wheel-driven target, giving the */
/*  whole site a soft inertial feel.                                   */
/*                                                                     */
/*  Deliberately conservative so it never fights the real app:         */
/*   · disabled on touch / coarse-pointer devices (native is better)   */
/*   · disabled under prefers-reduced-motion                           */
/*   · yields to any nested scroll area (cart sidebar, modals, or an   */
/*     element flagged [data-native-scroll]) that can still scroll     */
/*   · re-syncs to the real scrollY when something else moves it       */
/*     (keyboard, scrollbar drag, anchor jump, route reset)            */
/* ------------------------------------------------------------------ */

export default function SmoothScroll() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    const coarse = window.matchMedia("(pointer: coarse)").matches || "ontouchstart" in window;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (coarse || reduce) return;

    const root = document.documentElement;
    const maxScroll = () =>
      Math.max(0, (document.scrollingElement || root).scrollHeight - window.innerHeight);

    let target = window.scrollY;
    let current = target;
    let lastSet = target;
    let raf = 0;
    let ticking = false;

    // Walk up from the wheel target; if any ancestor is itself scrollable in
    // the wheel's direction, let the browser handle it natively.
    const insideScrollable = (node, deltaY) => {
      let el = node;
      while (el && el !== document.body && el !== root) {
        if (el.nodeType === 1) {
          if (el.hasAttribute("data-native-scroll")) return true;
          // Only query computed style if element actually has vertical scrollable height
          if (el.scrollHeight > el.clientHeight + 1) {
            const style = window.getComputedStyle(el);
            const oy = style.overflowY;
            if (oy === "auto" || oy === "scroll") {
              const up = deltaY < 0 && el.scrollTop > 0;
              const down = deltaY > 0 && el.scrollTop + el.clientHeight < el.scrollHeight - 1;
              if (up || down) return true;
            }
          }
        }
        el = el.parentNode;
      }
      return false;
    };

    const loop = () => {
      // If some other mechanism moved the page, adopt that position instead of
      // snapping it back — keeps keyboard, anchors and route resets working.
      if (Math.abs(window.scrollY - lastSet) > 2) {
        current = window.scrollY;
        target = current;
      }

      current += (target - current) * 0.1;
      if (Math.abs(target - current) < 0.4) current = target;

      const next = Math.round(current);
      if (next !== lastSet) {
        window.scrollTo(0, next);
        lastSet = next;
      }

      if (Math.abs(target - current) < 0.4) {
        ticking = false;
        return;
      }
      raf = requestAnimationFrame(loop);
    };

    const start = () => {
      if (!ticking) {
        ticking = true;
        raf = requestAnimationFrame(loop);
      }
    };

    const onWheel = (e) => {
      if (e.ctrlKey) return; // pinch-zoom — leave it alone
      if (insideScrollable(e.target, e.deltaY)) return;

      e.preventDefault();
      // Normalise line / page delta modes to pixels.
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      target = Math.max(0, Math.min(maxScroll(), target + e.deltaY * unit));
      start();
    };

    // While we drive scroll programmatically, disable CSS smooth so scrollTo is
    // instant (otherwise the browser eases on top of our easing).
    const prevBehavior = root.style.scrollBehavior;
    root.style.scrollBehavior = "auto";

    window.addEventListener("wheel", onWheel, { passive: false });

    return () => {
      window.removeEventListener("wheel", onWheel);
      cancelAnimationFrame(raf);
      root.style.scrollBehavior = prevBehavior;
    };
  }, []);

  return null;
}
