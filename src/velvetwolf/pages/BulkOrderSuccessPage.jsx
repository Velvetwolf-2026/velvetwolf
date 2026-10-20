// After a bulk quote request: what we received and what happens next.
import { useEffect, useState } from "react";
import { Link } from "react-router";
import { BUSINESS } from "../gallery/help/content";

export function meta() {
  return [
    { title: "Quote request sent · VelvetWolf" },
    { name: "description", content: "We have your bulk order request and will email you a quote within 24 hours." },
    { name: "robots", content: "noindex" },
  ];
}

const TYPES = { corporate: "Corporate branding", bulk: "Bulk order", event: "Event merchandise", startup: "Startup kit" };

export default function BulkOrderSuccessPage() {
  const [details, setDetails] = useState(null);

  useEffect(() => {
    try { setDetails(JSON.parse(sessionStorage.getItem("vw_last_bulk_order") || "null")); } catch { /* storage unavailable */ }
  }, []);

  return (
    <main className="vwg view-page">
      <div className="page-wrap">
        <header className="page-head">
          <p className="eyebrow">Bulk and corporate</p>
          <h1 className="page-title">{details ? "We have your request" : "Bulk and corporate orders"}</h1>
          <p className="page-sub">
            {details
              ? <>We'll email a quote to <b>{details.email}</b> within 24 hours, Monday to Saturday.</>
              : <>Your request may have been sent in another tab. If you haven't heard from us within 24 hours, write to <a href={`mailto:${BUSINESS.emails.bulk}`}>{BUSINESS.emails.bulk}</a>.</>}
          </p>
        </header>

        {details && (
          <section className="bulk-summary" aria-labelledby="bk-sum-h">
            <h2 className="co-h" id="bk-sum-h">What you sent</h2>
            <dl>
              <div><dt>Order type</dt><dd>{TYPES[details.type] || details.type}</dd></div>
              <div><dt>Organisation</dt><dd>{details.org}</dd></div>
              <div><dt>Contact</dt><dd>{details.contact}</dd></div>
              <div><dt>Pieces</dt><dd>{details.qty}</dd></div>
              {details.images > 0 && <div><dt>Images</dt><dd>{details.images}</dd></div>}
            </dl>
          </section>
        )}

        <p className="muted">Something to add? Reply to our email, or write to <a href={`mailto:${BUSINESS.emails.bulk}`}>{BUSINESS.emails.bulk}</a>.</p>
        <div className="acct-actions">
          <Link className="btn btn-primary" to="/shop">Browse the tees</Link>
          <Link className="btn" to="/">Back to the home page</Link>
        </div>
      </div>
    </main>
  );
}
