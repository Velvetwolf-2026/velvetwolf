import { useEffect, useRef } from "react";
import { useLocation } from "react-router";

// Baked in at build time (Vite); passed to the Docker build in deploy.yml.
export const PIXEL_ID = import.meta.env.VITE_META_PIXEL_ID || "";

export default function MetaPixel() {
  const location = useLocation();
  const first = useRef(true);

  // SPA route changes: the first PageView is fired by the init script
  useEffect(() => {
    if (!PIXEL_ID) return;
    if (first.current) {
      first.current = false;
      return;
    }
    if (typeof window !== "undefined" && window.fbq) {
      window.fbq("track", "PageView");
    }
  }, [location.pathname]);

  if (!PIXEL_ID) {
    return null;
  }

  return (
    <>
      <script
        id="meta-pixel-init"
        dangerouslySetInnerHTML={{
          __html: `
            !function(f,b,e,v,n,t,s)
            {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
            n.callMethod.apply(n,arguments):n.queue.push(arguments)};
            if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
            n.queue=[];t=b.createElement(e);t.async=!0;
            t.src=v;s=b.getElementsByTagName(e)[0];
            s.parentNode.insertBefore(t,s)}(window, document,'script',
            'https://connect.facebook.net/en_US/fbevents.js');
            fbq('init', '${PIXEL_ID}');
            fbq('track', 'PageView');
          `,
        }}
      />
      <noscript>
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${PIXEL_ID}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  );
}
