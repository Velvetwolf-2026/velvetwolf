// Contact (gallery help page). In the hall: a desk lamp, lit with ripples on the floor while
// support is open (Mon to Sat, 10 to 7 IST) and an ember when closed, so the scene tells the truth;
// a sent message rises from it as a point of light. The form posts to /contact/send.
import { useContext, useEffect, useRef, useState } from "react";
import HelpLayout from "../gallery/help/HelpLayout";
import { useGallery } from "../gallery/galleryContext";
import { BUSINESS, CONTACT_TOPICS } from "../gallery/help/content";
import { nowIST } from "../gallery/help/motifs";
import { AppContext } from "./AppContext";
import { apiUrl } from "../utils/api";

export function meta() {
  return [{ title: "Contact · VelvetWolf" }, { name: "description", content: "Real people in Chennai, Monday to Saturday. Write to us, or reach us on WhatsApp, email or Instagram." }];
}

const E = BUSINESS.emails;

function openStatus(at = nowIST()) {
  const h = BUSINESS.hours;
  const hour = at.getHours() + at.getMinutes() / 60;
  const open = h.days.includes(at.getDay()) && hour >= h.open && hour < h.close;
  if (open) return { open, text: `Open now, until ${h.close - 12} PM IST` };
  const d = new Date(at);
  for (let i = 0; i < 8; i++) {
    if (h.days.includes(d.getDay()) && (i > 0 || hour < h.open)) {
      const when = i === 0 ? "today" : i === 1 ? "tomorrow" : d.toLocaleDateString("en-IN", { weekday: "long" });
      return { open, text: `Closed now. Back ${when} at ${h.open} AM IST` };
    }
    d.setDate(d.getDate() + 1);
  }
  return { open, text: "Closed now" };
}

const WAYS = [
  { href: BUSINESS.whatsapp.href, b: "WhatsApp", span: BUSINESS.whatsapp.label, small: "Fastest. Usually within 2 hours, in working hours.", ext: true },
  { href: `mailto:${E.info}`, b: "General", span: E.info, small: "Usually within 4 working hours." },
  { href: `mailto:${E.orders}`, b: "Orders", span: E.orders, small: "Changes within 1 hour of ordering, delivery questions." },
  { href: `mailto:${E.returns}`, b: "Returns", span: E.returns, small: "Returns and size exchanges, within 7 days." },
  { href: `mailto:${E.bulk}`, b: "Bulk and corporate", span: E.bulk, small: "10 pieces or more. Quotes within 24 hours." },
  { href: BUSINESS.instagram.href, b: "Instagram", span: BUSINESS.instagram.label, small: "DMs answered within about 6 hours.", ext: true },
];

function Field({ id, label, error, children, optional }) {
  return (
    <div className="form-row">
      <label htmlFor={id}>{label}{optional && <span className="opt">optional</span>}</label>
      {children}
      {error && <p className="field-error" id={`${id}-err`}>{error}</p>}
    </div>
  );
}

export default function ContactPage() {
  const { user } = useContext(AppContext);
  const motifRef = useRef(null);
  const sentRef = useRef(null);
  const [status, setStatus] = useState(() => openStatus());
  const [form, setForm] = useState({ name: "", email: "", topic: "", order: "", msg: "" });
  const [errors, setErrors] = useState({});
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(null);
  const [failure, setFailure] = useState("");

  // prefill from the account (not a mobile-only placeholder email)
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      name: f.name || user.full_name || user.name || "",
      email: f.email || (user.email && !user.email.endsWith("@mobile.velvetwolf.in") ? user.email : ""),
    }));
  }, [user]);

  // keep the open/closed line (and the signal) honest while the page is open
  useEffect(() => {
    const tick = setInterval(() => setStatus(openStatus()), 60000);
    return () => clearInterval(tick);
  }, []);
  // the lamp is lit (with ripples) during open hours and an ember when closed
  const { engine } = useGallery();
  useEffect(() => { engine?.help.contact.set({ open: status.open }); }, [engine, status.open]);

  const topic = CONTACT_TOPICS.find((t) => t.id === form.topic);
  const set = (k) => (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setErrors((x) => ({ ...x, [k]: "" })); };

  const submit = async (e) => {
    e.preventDefault();
    const errs = {};
    if (form.name.trim().length < 2) errs.name = "Enter your name.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) errs.email = "Enter an email address like name@example.com.";
    if (!form.topic) errs.topic = "Choose a topic so it reaches the right person.";
    if (form.msg.trim().length < 10) errs.msg = "Tell us a little more (10 characters or more).";
    setErrors(errs);
    const first = Object.keys(errs)[0];
    if (first) { document.getElementById(`ct-${first}`)?.focus(); return; }

    setSending(true);
    setFailure("");
    try {
      const subject = `${topic.label}${topic.needsOrder && form.order.trim() ? ` · Order ${form.order.trim()}` : ""}`.slice(0, 200);
      const res = await fetch(apiUrl("/contact/send"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: form.name.trim(), email: form.email.trim().toLowerCase(), subject, message: form.msg.trim() }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "We couldn't send that just now. Try again, or email us.");
      setSent({ first: form.name.trim().split(/\s+/)[0], email: form.email.trim() });
      engine?.help.contact.send(); // a point of light rises from the lamp
      setTimeout(() => sentRef.current?.focus(), 30);
    } catch (err) {
      setFailure(err.message);
    } finally {
      setSending(false);
    }
  };

  return (
    <HelpLayout page="contact" eyebrow="Help" title="Contact" motifRef={motifRef}
      lede="Real people in Chennai, Monday to Saturday. Write here, or pick the channel that suits you.">
      <div className="info-grid">
        <section className="info-card" aria-labelledby="ct-form-h">
          <h2 className="info-h" id="ct-form-h">Write to us</h2>
          {sent ? (
            <div className="ct-sent" tabIndex={-1} ref={sentRef}>
              <svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="20" /><path d="M15 24.5l6 6 12-13" /></svg>
              <h3>Thanks, {sent.first}. It's with us.</h3>
              <p className="muted">We reply to {sent.email}, usually within 4 working hours ({BUSINESS.hours.label.replace(". Closed on Sunday.", "")}).</p>
            </div>
          ) : (
            <form className="ct-form" onSubmit={submit} noValidate>
              <Field id="ct-name" label="Name" error={errors.name}>
                <input id="ct-name" type="text" autoComplete="name" value={form.name} onChange={set("name")} aria-invalid={errors.name ? "true" : undefined} />
              </Field>
              <Field id="ct-email" label="Email" error={errors.email}>
                <input id="ct-email" type="email" autoComplete="email" inputMode="email" spellCheck="false" autoCapitalize="off" value={form.email} onChange={set("email")} aria-invalid={errors.email ? "true" : undefined} />
              </Field>
              <Field id="ct-topic" label="Topic" error={errors.topic}>
                <select id="ct-topic" value={form.topic} onChange={set("topic")} aria-invalid={errors.topic ? "true" : undefined}>
                  <option value="">Choose a topic</option>
                  {CONTACT_TOPICS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
                </select>
              </Field>
              {topic?.needsOrder && (
                <Field id="ct-order" label="Order number" optional>
                  <input id="ct-order" type="text" spellCheck="false" value={form.order} onChange={set("order")} placeholder="From your confirmation email" />
                </Field>
              )}
              <Field id="ct-msg" label="Message" error={errors.msg}>
                <textarea id="ct-msg" rows={5} value={form.msg} onChange={set("msg")} maxLength={5000} aria-invalid={errors.msg ? "true" : undefined} />
              </Field>
              {failure && <p className="form-msg" role="alert">{failure}</p>}
              <button className="btn btn-primary btn-block" type="submit" disabled={sending}>{sending ? "Sending…" : "Send message"}</button>
              <p className="fine">We reply by email, usually within 4 working hours.</p>
            </form>
          )}
        </section>

        <div className="info-stack">
          <section className="info-card" aria-labelledby="ct-ways-h">
            <h2 className="info-h" id="ct-ways-h">Other ways to reach us</h2>
            <p className={`ct-status${status.open ? " is-open" : ""}`}><i aria-hidden="true"></i>{status.text}</p>
            <ul className="ct-list">
              {WAYS.map((w) => (
                <li key={w.b}>
                  <a className="ct-way" href={w.href} {...(w.ext ? { target: "_blank", rel: "noopener noreferrer" } : {})}>
                    <b>{w.b}</b><span>{w.span}</span><small>{w.small}</small>
                  </a>
                </li>
              ))}
            </ul>
            <p className="fine">{BUSINESS.hours.label}</p>
          </section>
          <section className="info-card" aria-labelledby="ct-legal-h">
            <h2 className="info-h" id="ct-legal-h">Office and grievances</h2>
            <address className="addr-block">
              {BUSINESS.legalName || BUSINESS.name}<br />
              {BUSINESS.address ? <>{BUSINESS.address}<br /></> : null}
              {BUSINESS.city}
              {BUSINESS.gstin ? <><br />GSTIN: {BUSINESS.gstin}</> : null}
            </address>
            <p className="muted">
              Grievance Officer{BUSINESS.grievanceName ? `: ${BUSINESS.grievanceName}` : ""}, <a href={`mailto:${E.info}`}>{E.info}</a>. We acknowledge complaints within 48 hours and resolve them within one month.
            </p>
          </section>
        </div>
      </div>
    </HelpLayout>
  );
}
