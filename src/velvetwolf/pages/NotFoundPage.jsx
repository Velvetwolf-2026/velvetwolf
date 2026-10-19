// Any address the site doesn't have. It answers with a real 404 (so search
// engines drop dead links) and points people somewhere useful instead of
// silently sending them to the home page.
import { Link, data, useLocation } from "react-router";

export function loader() {
  return data(null, { status: 404 });
}

export function meta() {
  return [
    { title: "Page not found · VelvetWolf" },
    { name: "description", content: "This page doesn't exist on VelvetWolf. Find the shop, the Studio and help from here." },
    { name: "robots", content: "noindex" },
  ];
}

const WAYS = [
  ["/shop", "Shop all tees", "Every tee, in five colours."],
  ["/custom", "Studio", "Put your own words or artwork on a tee."],
  ["/track-order", "Track an order", "Your order number and email are enough."],
  ["/contact", "Contact us", "Real people in Chennai, Monday to Saturday."],
];

export default function NotFoundPage() {
  const { pathname } = useLocation();
  return (
    <main className="vwg view-page">
      <div className="page-wrap nf-wrap">
        <header className="page-head">
          <p className="eyebrow">Error 404</p>
          <h1 className="page-title">This page isn't here</h1>
          <p className="page-sub">
            Nothing lives at <code className="nf-path">{pathname}</code>. It may have moved, or the link has a typo.
          </p>
        </header>
        <ul className="nf-ways">
          {WAYS.map(([to, label, text]) => (
            <li key={to}>
              <Link to={to}><b>{label}</b><span>{text}</span></Link>
            </li>
          ))}
        </ul>
        <div className="acct-actions"><Link className="btn btn-primary" to="/">Back to the home page</Link></div>
      </div>
    </main>
  );
}
