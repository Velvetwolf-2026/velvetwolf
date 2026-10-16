// Site footer from the VelvetWolf Gallery (2027). Used on every public page.
import { Link } from "react-router";

// Policy and support pages stay linked from every page: the payment gateway
// requires them to be reachable on the site.
const SUPPORT_LINKS = [
  ["/contact", "Contact"],
  ["/faq", "FAQ"],
  ["/track-order", "Track order"],
  ["/size-guide", "Size guide"],
  ["/shipping-policy", "Shipping"],
  ["/returns", "Returns"],
  ["/privacy-policy", "Privacy"],
  ["/terms", "Terms"],
];

// toolView: full-screen tools (Studio, size guide) pin their panel to the screen on desktop, so the
// footer is left out there (as in the prototype); on phones the panel scrolls and the footer follows.
export default function GalleryFooter({ toolView = false }) {
  return (
    <footer className={`vwg-foot${toolView ? " is-tool" : ""}`}>
      <div>
        <p className="foot-brand">Statements in silence.</p>
        <p>No countdown timers and no invented stock alerts. When a size sells out, the page says so. Drop dates are posted once they are confirmed.</p>
      </div>
      <nav aria-label="Footer">
        <h2 className="eyebrow">Explore</h2>
        <ul>
          <li><Link to="/shop">Shop all tees</Link></li>
          <li><Link to="/#drop">Drop 01: Quiet Hours</Link></li>
          <li><Link to="/#colors">Colorways</Link></li>
          <li><Link to="/custom">Studio</Link></li>
          <li><Link to="/custom">Upload your artwork</Link></li>
        </ul>
      </nav>
      <div>
        <h2 className="eyebrow">The cloth</h2>
        <ul>
          <li>Combed cotton, 220&ndash;240 GSM</li>
          <li>Oversized fit, S to XXL</li>
          <li>Made in Tirupur, Tamil Nadu</li>
        </ul>
      </div>
      <div className="foot-small">
        <span>Velvetwolf &middot; velvetwolf.in</span>
        <nav className="foot-support" aria-label="Help and policies">
          {SUPPORT_LINKS.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
        </nav>
      </div>
    </footer>
  );
}
