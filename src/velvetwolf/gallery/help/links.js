// Help-page navigation and in-copy links (kept out of HelpLayout.jsx so fast refresh works there).
import { useEffect } from "react";
import { useNavigate } from "react-router";

export const HELP_NAV = [
  ["/contact", "Contact"], ["/faq", "FAQ"], ["/track-order", "Track order"], ["/size-guide", "Size guide"],
  ["/shipping-policy", "Shipping"], ["/returns", "Returns"], ["/privacy-policy", "Privacy"], ["/terms", "Terms"],
];

// Plain <a href="/…"> links inside the copy navigate in-app instead of reloading the page.
export function useInAppLinks(ref) {
  const navigate = useNavigate();
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const onClick = (e) => {
      const a = e.target.closest?.("a[href^='/']");
      if (!a || e.metaKey || e.ctrlKey || e.shiftKey || a.target === "_blank") return;
      e.preventDefault();
      navigate(a.getAttribute("href"));
    };
    el.addEventListener("click", onClick);
    return () => el.removeEventListener("click", onClick);
  }, [ref, navigate]);
}
