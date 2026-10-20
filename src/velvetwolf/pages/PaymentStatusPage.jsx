// Payment status (prototype ui/payment.js): where Cashfree sends people back to
// (/payment-status?order_id=…). It never assumes the payment worked: it asks the server
// (POST /checkout/verify) and only then shows paid, waiting for the bank, or failed. The gold
// stars in the hall follow along: a halo round the tee when paid, circling while the bank
// decides, sinking when it fails. The tees in the order stand on the stage as photo cards: one
// alone, several fanned out like a hand that turns (pointing at a tee in the list brings it forward).
import { useContext, useEffect, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router";
import { AppContext } from "./AppContext";
import { apiUrl } from "../utils/api";
import { trackPurchase } from "../utils/analytics";
import { useGallery } from "../gallery/galleryContext";
import { money, cartThumb } from "../gallery/galleryProducts";
import { BUSINESS } from "../gallery/help/content";
import "../gallery/gallery-help.css";

export function meta() {
  return [{ title: "Payment · VelvetWolf" }, { name: "description", content: "Whether your VelvetWolf payment went through, checked with Cashfree." }, { name: "robots", content: "noindex" }];
}

const POLL_S = 5;
const MAX_POLLS = 24; // about two minutes of "waiting for the bank"
const STARS = { verify: "orbit", paid: "gather", pending: "orbit", failed: "fall", missing: "idle" };
const short = (id) => String(id || "").slice(0, 8).toUpperCase();

function Icon({ state }) {
  if (state === "verify") return <svg className="pay-icon is-verify" viewBox="0 0 64 64" aria-hidden="true"><circle className="ring-bg" cx="32" cy="32" r="26" /><circle className="ring-arc" cx="32" cy="32" r="26" pathLength="100" /></svg>;
  if (state === "paid") return <svg className="pay-icon is-paid" viewBox="0 0 64 64" aria-hidden="true"><circle className="ring-bg" cx="32" cy="32" r="26" /><circle className="ring-full" cx="32" cy="32" r="26" pathLength="100" /><path className="ring-check" d="M21 32.5l7.5 7.5L44 24.5" pathLength="100" /></svg>;
  if (state === "pending") return <svg className="pay-icon is-pending" viewBox="0 0 64 64" aria-hidden="true"><circle className="ring-bg" cx="32" cy="32" r="26" /><circle className="ring-wait" cx="32" cy="32" r="26" pathLength="100" /><circle className="ring-dot" cx="32" cy="6" r="2.6" /></svg>;
  return <svg className="pay-icon is-failed" viewBox="0 0 64 64" aria-hidden="true"><circle className="ring-bg" cx="32" cy="32" r="26" /><circle className="ring-broken" cx="32" cy="32" r="26" pathLength="100" /><path className="ring-x" d="M25 25l14 14M39 25L25 39" pathLength="100" /></svg>;
}

// what was in the cart when the customer left for Cashfree (saved by the checkout page)
function readSnapshot() {
  try {
    return {
      cart: JSON.parse(sessionStorage.getItem("vw_last_checkout_cart") || "[]"),
      total: Number(sessionStorage.getItem("vw_last_checkout_total") || 0),
      email: sessionStorage.getItem("vw_last_checkout_email") || "",
      name: sessionStorage.getItem("vw_last_checkout_name") || "",
    };
  } catch {
    return { cart: [], total: 0, email: "", name: "" };
  }
}

export default function PaymentStatusPage() {
  const { clearCart, user } = useContext(AppContext);
  const { engine } = useGallery();
  const [params] = useSearchParams();
  const orderId = params.get("order_id");
  const [state, setState] = useState("verify");
  const [left, setLeft] = useState(POLL_S);
  const [copied, setCopied] = useState("");
  const snap = useRef(null);
  // the checkout snapshot for this order, read once per order (before any effect uses it)
  const snapFor = useRef(undefined);
  if (snapFor.current !== orderId) { snapFor.current = orderId; snap.current = readSnapshot(); }
  const polls = useRef(0);
  const titleRef = useRef(null);
  const done = useRef(false);

  // the ordered tees on the product stage, the stars following the state
  useEffect(() => {
    if (!engine) return undefined;
    engine.setView("payment", "payment");
    const first = snap.current.cart.find((i) => !i.isCustom) || snap.current.cart[0];
    engine.dressPayment(first?.color || "noir", "VELVETWOLF");
    engine.showOrder?.(snap.current.cart.map((i) => ({ src: cartThumb(i), name: i.name })));
    return () => engine.setStars("idle");
  }, [engine, orderId]);
  useEffect(() => { engine?.setStars(STARS[state]); }, [engine, state]);

  // focus the new heading whenever the state changes, for screen readers
  useEffect(() => { setTimeout(() => titleRef.current?.focus({ preventScroll: true }), 40); }, [state]);

  const settlePaid = () => {
    if (done.current) return;
    done.current = true;
    const { cart, total } = snap.current;
    if (cart.length) trackPurchase(orderId, cart, total, "online");
    try {
      sessionStorage.removeItem("vw_last_checkout_cart");
      sessionStorage.removeItem("vw_last_checkout_total");
      // a new cart gets a new checkout key; this one is spent
      sessionStorage.removeItem("vw_checkout_key");
      sessionStorage.removeItem("vw_checkout_pending");
    } catch { /* storage unavailable */ }
    clearCart();
  };

  const check = async () => {
    try {
      const res = await fetch(apiUrl("/checkout/verify"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "verify failed");
      // `state` from the current backend; `status` alone from an older one
      const next = data.state || (data.status === "SUCCESS" ? "paid" : "failed");
      if (next === "paid") settlePaid();
      return next;
    } catch {
      return "pending"; // couldn't reach the server: keep checking rather than guess
    }
  };

  // first check: always show "Confirming" first, and never "paid" before the server says so
  useEffect(() => {
    // a different order: start again from "Confirming", never from the last order's result
    setState(orderId ? "verify" : "missing");
    done.current = false;
    polls.current = 0;
    if (!orderId) return undefined;
    let cancelled = false;
    const minWait = matchMedia("(prefers-reduced-motion: reduce)").matches ? 300 : 1400;
    Promise.all([check(), new Promise((r) => setTimeout(r, minWait))]).then(([next]) => {
      if (!cancelled) setState(next);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId]);

  // waiting for the bank: check again every few seconds, with a visible countdown
  useEffect(() => {
    if (state !== "pending") return undefined;
    setLeft(POLL_S);
    const t = setInterval(() => {
      setLeft((n) => {
        if (n > 1) return n - 1;
        polls.current += 1;
        check().then((next) => {
          if (next !== "pending") setState(next);
          else if (polls.current >= MAX_POLLS) setState("failed");
        });
        return POLL_S;
      });
    }, 1000);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  const checkNow = async () => {
    const next = await check();
    if (next !== "pending") setState(next);
    else setLeft(POLL_S);
  };

  const copy = async () => {
    try { await navigator.clipboard.writeText(orderId); setCopied("Copied"); } catch { setCopied("Select and copy"); }
  };

  const { cart, total, email, name } = snap.current;
  const first = (name || user?.full_name || user?.name || "").trim().split(/\s+/)[0];
  const trackHref = `/track-order?order=${encodeURIComponent(orderId || "")}${email ? `&email=${encodeURIComponent(email)}` : ""}`;

  return (
    <main className="vwg vwg-view-auth view-pay">
      <section className="vwg-auth-card pay-card" aria-live="polite" aria-label="Payment status">
        <Icon state={state} />
        {state === "verify" && (
          <>
            <p className="eyebrow">Order #{short(orderId)}</p>
            <h1 className="pay-title" tabIndex={-1} ref={titleRef}>Confirming your payment</h1>
            <p className="pay-sub">We're checking with {BUSINESS.processor}. This takes a few seconds; please keep this page open.</p>
          </>
        )}

        {state === "missing" && (
          <>
            <p className="eyebrow">Payment</p>
            <h1 className="pay-title" tabIndex={-1} ref={titleRef}>We can't find that payment</h1>
            <p className="pay-sub">The link may be incomplete. If you paid, your confirmation email has the order number; you can also <Link to="/track-order">track it here</Link>.</p>
            <div className="acct-actions"><Link className="btn btn-primary" to="/shop">Back to the shop</Link><Link className="btn" to="/contact">Contact us</Link></div>
          </>
        )}

        {state === "paid" && (
          <>
            <p className="eyebrow">Payment received{total ? ` · ${money(total)}` : ""}</p>
            <h1 className="pay-title" tabIndex={-1} ref={titleRef}>Thank you{first && !/^\d+$/.test(first) ? `, ${first}` : ""}. Your order is confirmed.</h1>
            <div className="pay-ref"><span>Order number</span><b>#{short(orderId)}</b><button className="text-btn" type="button" onClick={copy}>{copied || "Copy full number"}</button></div>
            {cart.length > 0 && (
              <section className="pay-bought" aria-labelledby="pay-bought-h">
                <h2 className="eyebrow" id="pay-bought-h">{cart.length === 1 && cart[0].qty === 1 ? "Your tee" : "Your tees"}</h2>
                <ul className="pay-tees">
                  {cart.map((i, idx) => {
                    const src = cartThumb(i);
                    return (
                      <li key={`${i.id}-${i.size}-${i.color}-${idx}`} style={{ "--i": idx }}
                        onMouseEnter={() => engine?.focusOrder?.(idx)} onMouseLeave={() => engine?.focusOrder?.(null)}>
                        <span className={`pay-tee-photo${i.isCustom ? " is-art" : ""}`}>
                          {src ? <img src={src} alt="" loading="lazy" decoding="async" /> : null}
                          {i.qty > 1 && <span className="pay-tee-qty" aria-label={`Quantity ${i.qty}`}>{i.qty}</span>}
                        </span>
                        <span className="pay-tee-info">
                          <span className="pay-tee-name">{i.name}</span>
                          <span className="pay-tee-meta">{[i.color, i.size && `Size ${i.size}`].filter(Boolean).join(" · ")}{i.qty > 1 ? ` · ${i.qty} pieces` : ""}</span>
                        </span>
                        <span className="pay-tee-price">{money(Number(i.price) * Number(i.qty || 1))}</span>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}
            <p className="pay-sub">A receipt is on its way{email ? <> to <b>{email}</b></> : ""}. We'll send the tracking link when it ships, usually within 2 to 3 business days.</p>
            <div className="acct-actions">
              <Link className="btn btn-primary" to={trackHref}>Track this order</Link>
              <Link className="btn" to="/shop">Keep browsing</Link>
            </div>
            {!user && <p className="muted"><Link to="/signup">Create an account</Link> to keep your addresses for next time.</p>}
          </>
        )}

        {state === "pending" && (
          <>
            <p className="eyebrow">Order #{short(orderId)}{total ? ` · ${money(total)}` : ""}</p>
            <h1 className="pay-title" tabIndex={-1} ref={titleRef}>Waiting for your bank</h1>
            <p className="pay-sub">Your bank hasn't confirmed the payment yet. This usually takes a minute or two. <b>Please don't pay again.</b></p>
            <p className="pay-check" role="status" aria-live="polite"><span className="pay-check-ring" aria-hidden="true"></span><span>Checking again in {left} second{left === 1 ? "" : "s"}</span></p>
            <p className="muted">If the bank declines it, any amount taken from your account comes back automatically, usually within 5 days. Your cart is saved until then.</p>
            <div className="acct-actions"><button className="btn" type="button" onClick={checkNow}>Check now</button><Link className="btn" to="/contact">Contact us</Link></div>
          </>
        )}

        {state === "failed" && (
          <>
            <p className="eyebrow">Payment{total ? ` of ${money(total)}` : ""} · reference #{short(orderId)}</p>
            <h1 className="pay-title" tabIndex={-1} ref={titleRef}>The payment didn't go through</h1>
            <p className="pay-sub">No order was placed and your cart is saved. If money left your account, it isn't lost: your bank reverses failed payments automatically, usually within 5 days, as RBI rules require.</p>
            <div className="acct-actions"><Link className="btn btn-primary" to="/checkout">Try again</Link><Link className="btn" to="/checkout">Use another method</Link></div>
            <p className="muted">Debited but no order after 5 days? Send your bank reference to <a href={`mailto:${BUSINESS.emails.orders}`}>{BUSINESS.emails.orders}</a> and we'll chase it.</p>
          </>
        )}
      </section>
    </main>
  );
}
