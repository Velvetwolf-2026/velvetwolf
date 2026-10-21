// Site footer from the VelvetWolf Gallery (2027). Used on every public page.
import { Link } from "react-router";
import { BUSINESS } from "./help/content";

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

const SOCIAL = [
  ["Instagram", BUSINESS.instagram],
  ["WhatsApp", BUSINESS.whatsapp],
  ["Facebook", BUSINESS.facebook],
].filter(([, link]) => link?.href);

// toolView: full-screen tools (Studio, size guide) pin their panel to the screen on desktop, so the
// footer is left out there (as in the prototype); on phones the panel scrolls and the footer follows.
export default function GalleryFooter({ toolView = false }) {
  return (
    <footer className={`vwg-foot${toolView ? " is-tool" : ""}`}>
      <div>
        <p className="foot-brand">Statements in silence.</p>
        <p>No countdown timers and no invented stock alerts. When a size sells out, the page says so. Drop dates are posted once they are confirmed.</p>
        <nav className="foot-social" aria-label="VelvetWolf elsewhere">
          {SOCIAL.map(([name, link]) => (
            <a key={name} href={link.href} target="_blank" rel="noopener noreferrer" aria-label={`${name}: ${link.label} (opens in a new tab)`}>
              <SocialIcon name={name} /><span>{name}</span>
            </a>
          ))}
        </nav>
      </div>
      <nav aria-label="Footer">
        <h2 className="eyebrow">Explore</h2>
        <ul>
          <li><Link to="/shop">Shop all tees</Link></li>
          <li><Link to="/#drop">Drop 01: Quiet Hours</Link></li>
          <li><Link to="/#colors">Colourways</Link></li>
          <li><Link to="/custom">Studio</Link></li>
          <li><Link to="/custom?upload=1">Upload your artwork</Link></li>
          <li><Link to="/quiz">Find your Wolf Type</Link></li>
          <li><Link to="/bulk">Bulk and corporate orders</Link></li>
        </ul>
      </nav>
      <div>
        <h2 className="eyebrow">Talk to us</h2>
        <ul>
          <li><a href={`mailto:${BUSINESS.emails.info}`}>{BUSINESS.emails.info}</a></li>
          <li><a href={BUSINESS.whatsapp.href} target="_blank" rel="noopener noreferrer" aria-label={`Message VelvetWolf on WhatsApp, ${BUSINESS.whatsapp.label} (opens in a new tab)`}>Message us on WhatsApp</a></li>
          <li>{BUSINESS.hours.label.replace(" Closed on Sunday.", "")}</li>
        </ul>
        <h2 className="eyebrow foot-h2">The cloth</h2>
        <ul>
          <li>Combed cotton, 220&ndash;240 GSM</li>
          <li>Oversized fit, S to XXL</li>
          <li>Made in Tirupur, Tamil Nadu</li>
        </ul>
      </div>
      <div className="foot-small">
        <span>&copy; {new Date().getFullYear()} VelvetWolf &middot; velvetwolf.in</span>
        <nav className="foot-support" aria-label="Help and policies">
          {SUPPORT_LINKS.map(([to, label]) => <Link key={to} to={to}>{label}</Link>)}
        </nav>
      </div>
    </footer>
  );
}

// simple line marks in the footer's colour (no brand artwork)
function SocialIcon({ name }) {
  const common = { width: 18, height: 18, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round", strokeLinejoin: "round", "aria-hidden": true, focusable: "false" };
  if (name === "Instagram") return <svg {...common}><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.2" cy="6.8" r="0.6" fill="currentColor" /></svg>;
  if (name === "WhatsApp") return <svg {...common}><path d="M20.5 11.6a8.5 8.5 0 0 1-12.6 7.4L3.5 20.5l1.5-4.3A8.5 8.5 0 1 1 20.5 11.6z" /><path d="M9 8.6c.2 2.8 3.2 5.9 6.3 6.3l1.1-1.4-1.9-.9-.8.8c-1.1-.5-2.1-1.5-2.6-2.6l.8-.8-.9-1.9z" /></svg>;
  if (name === "Facebook") return <svg {...common}><path d="M14.5 8H17V4.5h-2.5A3.5 3.5 0 0 0 11 8v2.5H8.5V14H11v6.5h3.5V14H17l.5-3.5h-3V8z" /></svg>;
  return <svg {...common}><path d="M4.5 4.5l15 15M19.5 4.5l-15 15" /></svg>;
}
