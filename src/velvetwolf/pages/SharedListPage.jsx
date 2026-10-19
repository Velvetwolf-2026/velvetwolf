// A saved list someone shared (Account > Saved > Share your list), for gifting. It shows their
// first name and the tees, nothing else, and stops working when they turn the link off.
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { useGallery } from "../gallery/galleryContext";
import { money, photoFor, productHref } from "../gallery/galleryProducts";
import { request } from "../account/api";
import "../gallery/gallery-help.css";
import "../account/account.css";

export function meta() {
  return [{ title: "A saved list · VelvetWolf" }, { name: "robots", content: "noindex, nofollow" }];
}

export default function SharedListPage() {
  const { token } = useParams();
  const { engine } = useGallery();
  const [list, setList] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => { if (engine) engine.setView("auth", "auth"); }, [engine]);
  useEffect(() => {
    let live = true;
    setList(null); setError("");
    request(`/wishlist/shared/${encodeURIComponent(token || "")}`)
      .then((d) => live && setList(d))
      .catch((e) => live && setError(e.status === 404 || e.unavailable ? "This list isn't shared any more." : e.message));
    return () => { live = false; };
  }, [token]);

  return (
    <main className="vwg view-den is-shared">
      <div className="den-band is-short" aria-hidden="true" />
      <section className="den-body">
        <div className="den-wrap">
          <header className="den-head den-shared-head">
            <p className="eyebrow">A saved list</p>
            <h1 className="den-title">{list?.owner ? `${list.owner}'s picks` : "Picks from VelvetWolf"}</h1>
          </header>
          {error ? (
            <div className="den-empty"><p>{error}</p><Link className="btn btn-primary" to="/shop">See the tees</Link></div>
          ) : !list ? (
            <p className="den-loading" role="status">Opening the list…</p>
          ) : !list.items.length ? (
            <div className="den-empty"><p>Nothing on this list right now.</p><Link className="btn btn-primary" to="/shop">See the tees</Link></div>
          ) : (
            <>
              <p className="muted den-shared-note">For gifting: pick the tee, then the size they wear. {list.owner ? `${list.owner} won't see what you order.` : ""}</p>
              <ul className="den-shared-grid">
                {list.items.map((p) => {
                  const src = photoFor(p);
                  return (
                    <li key={p.id}>
                      <Link to={productHref(p)}>
                        <span className="den-saved-photo">{src ? <img src={src} alt="" loading="lazy" decoding="async" /> : null}</span>
                        <span className="den-line-name">{p.name}</span>
                        <span className="muted">{money(p.price)}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
