// ALL · MEN · WOMEN: one framed box split into three, the chosen side filled
// white with black text. Centred in the header on wide screens (GalleryHeader)
// and at the top of the shop elsewhere (ShopPage). Each side is a link to the
// shop with the choice in the address (/shop?gender=men), so a filtered view
// can be shared and the browser's Back button works.
import { useEffect, useState } from "react";
import { Link, useLocation } from "react-router";
import { GENDER_CHOICES, parseGender } from "./genderFilter";

const KEY = "vw_shop_gender";
const isShopPath = (p) => p === "/shop" || p.startsWith("/shop/");

export default function GenderToggle({ className = "" }) {
  const { pathname, search } = useLocation();
  const onShop = isShopPath(pathname);
  const params = new URLSearchParams(search);

  // on the shop the address says; elsewhere, the last choice made in this visit
  // (read after mount: the server can't see it, and both renders must match)
  const [remembered, setRemembered] = useState("all");
  useEffect(() => {
    try { setRemembered(parseGender(sessionStorage.getItem(KEY))); } catch { /* storage unavailable */ }
  }, [pathname]);
  const active = onShop ? parseGender(params.get("gender")) : remembered;

  useEffect(() => {
    if (!onShop) return;
    try { sessionStorage.setItem(KEY, active); } catch { /* storage unavailable */ }
  }, [onShop, active]);

  const hrefFor = (choice) => {
    const next = new URLSearchParams(onShop ? search : "");
    if (choice === "all") next.delete("gender");
    else next.set("gender", choice);
    const qs = next.toString();
    return `${onShop ? pathname : "/shop"}${qs ? `?${qs}` : ""}`;
  };

  return (
    <nav className={`vwg-gender ${className}`.trim()} aria-label="Shop by">
      {GENDER_CHOICES.map(([id, label]) => (
        <Link
          key={id}
          to={hrefFor(id)}
          aria-current={id === active ? (onShop ? "page" : "true") : undefined}
          preventScrollReset={onShop}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
