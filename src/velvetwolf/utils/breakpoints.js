import { useState, useEffect } from "react";

const BREAKPOINTS = {
  mobile: 640,
  tablet: 1024,
};

export function useBreakpoint() {
  // Always starts at the desktop default so the server render and the
  // client's pre-hydration render match exactly; the effect below corrects
  // it to the real viewport width immediately after mount. Reading
  // window.innerWidth in the initializer would make the client's first
  // render diverge from the server's, causing a hydration mismatch.
  const [width, setWidth] = useState(1200);

  useEffect(() => {
    setWidth(window.innerWidth);
    const handler = () => setWidth(window.innerWidth);
    window.addEventListener("resize", handler);
    return () => window.removeEventListener("resize", handler);
  }, []);

  return {
    isMobile: width < BREAKPOINTS.mobile,
    isTablet: width >= BREAKPOINTS.mobile && width < BREAKPOINTS.tablet,
    isDesktop: width >= BREAKPOINTS.tablet,
    isMobileOrTablet: width < BREAKPOINTS.tablet,
    width,
  };
}
