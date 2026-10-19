// Bulk and corporate orders, in the gallery page style: the tiers on one side,
// the quote form on the other (stacked on phones). The form posts to
// /bulk/send; the backend checks the same fields (bulkOrderSchema).
import { useContext, useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { AppContext } from "./AppContext";
import { apiUrl } from "../utils/api";
import { BUSINESS } from "../gallery/help/content";
import { isValidEmail, isValidName, cleanName, EMAIL_ERROR, NAME_ERROR } from "../utils/validate";

export function meta() {
  const title = "Bulk and corporate orders · VelvetWolf";
  const description = "VelvetWolf tees for teams, events and companies, with your logo printed or embroidered. Ask for a quote; we reply within 24 hours.";
  return [
    { title },
    { name: "description", content: description },
    { property: "og:title", content: title },
    { property: "og:description", content: description },
  ];
}

const TIERS = [
  ["10 to 49 pieces", "5% off", "Team orders"],
  ["50 to 99 pieces", "12% off", "Department orders"],
  ["100 to 499 pieces", "20% off", "Corporate branding"],
  ["500 pieces or more", "30% off", "Enterprise orders, with custom options"],
];
const EXTRAS = ["Your logo printed or embroidered", "Pantone colour matching", "Individual names printed", "One person looking after your order", "Net-30 payment terms available"];
const TYPES = [["corporate", "Corporate branding"], ["bulk", "Bulk order"], ["event", "Event merchandise"], ["startup", "Startup kit"]];
const MIN_QTY = 5;
const MAX_IMAGES = 6;
const MAX_MB = 5;

const blank = { type: "corporate", org: "", contact: "", email: "", qty: "", message: "" };

function Field({ id, label, error, hint, children }) {
  return (
    <div className="form-row">
      <label htmlFor={id}>{label}</label>
      {children}
      {hint && <p className="field-hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field-error" id={`${id}-err`}>{error}</p>}
    </div>
  );
}

export default function BulkOrderPage() {
  const { showToast, user } = useContext(AppContext);
  const navigate = useNavigate();
  const [form, setForm] = useState(blank);
  const [images, setImages] = useState([]);
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState("");
  const [sending, setSending] = useState(false);
  const bannerRef = useRef(null);

  // signed in: fill in who's asking (not a mobile-only placeholder email)
  useEffect(() => {
    if (!user) return;
    setForm((f) => ({
      ...f,
      contact: f.contact || user.full_name || (/^mobile( |$)/i.test(user.name || "") ? "" : user.name) || "",
      email: f.email || (String(user.email || "").endsWith("@mobile.velvetwolf.in") ? "" : user.email || ""),
    }));
  }, [user]);

  const set = (k) => (e) => {
    setForm((f) => ({ ...f, [k]: e.target.value }));
    setErrors((x) => ({ ...x, [k]: "" }));
    setBanner("");
  };

  const addImages = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    for (const file of files) {
      if (!file.type.startsWith("image/")) { showToast(`${file.name} isn't an image. Use PNG, JPG or WebP.`, "error"); continue; }
      if (file.size > MAX_MB * 1024 * 1024) { showToast(`${file.name} is over ${MAX_MB} MB. Try a smaller file.`, "error"); continue; }
      const reader = new FileReader();
      reader.onload = () => setImages((prev) => (prev.length >= MAX_IMAGES ? prev : [...prev, { name: file.name, src: reader.result }]));
      reader.onerror = () => showToast(`${file.name} couldn't be read. Try another file.`, "error");
      reader.readAsDataURL(file);
    }
  };

  const validate = () => {
    const e = {};
    if (form.org.trim().length < 2) e.org = "Enter your organisation's name.";
    if (!form.contact.trim()) e.contact = "Enter the name of the person we should talk to.";
    else if (!isValidName(form.contact)) e.contact = NAME_ERROR;
    if (!isValidEmail(form.email)) e.email = EMAIL_ERROR;
    const qty = Number(form.qty);
    if (!form.qty) e.qty = "Enter how many pieces you need.";
    else if (!Number.isInteger(qty) || qty < MIN_QTY) e.qty = `The minimum is ${MIN_QTY} pieces.`;
    if (form.message.trim().length < 10) e.message = "Tell us a little more: the design, colours and when you need them (10 characters or more).";
    return e;
  };

  const submit = async (ev) => {
    ev.preventDefault();
    if (sending) return;
    const e = validate();
    setErrors(e);
    const ids = Object.keys(e);
    if (ids.length) {
      setBanner(`Check ${ids.length === 1 ? "the field" : `the ${ids.length} fields`} marked below.`);
      setTimeout(() => document.getElementById(`bk-${ids[0]}`)?.focus(), 30);
      return;
    }
    setSending(true);
    setBanner("");
    const payload = { ...form, contact: cleanName(form.contact), email: form.email.trim().toLowerCase(), qty: Number(form.qty), images: images.map((i) => i.src) };
    try {
      const res = await fetch(apiUrl("/bulk/send"), {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "We couldn't send your request just now.");
      try { sessionStorage.setItem("vw_last_bulk_order", JSON.stringify({ ...payload, images: images.length })); } catch { /* storage unavailable */ }
      showToast("Quote request sent. We'll email you within 24 hours.");
      setForm(blank);
      setImages([]);
      navigate("/bulk/success");
    } catch (err) {
      setBanner(`${err.message || "That didn't send."} Try again, or write to ${BUSINESS.emails.bulk}.`);
      setTimeout(() => bannerRef.current?.focus(), 30);
    } finally {
      setSending(false);
    }
  };

  const describe = (id, extra = "") => [extra, errors[id] ? `bk-${id}-err` : ""].filter(Boolean).join(" ") || undefined;

  return (
    <main className="vwg view-page">
      <div className="page-wrap page-wide">
        <header className="page-head">
          <p className="eyebrow">For teams and organisations</p>
          <h1 className="page-title">Bulk and corporate orders</h1>
          <p className="page-sub">Tees for your team, event or company, with your logo. Tell us what you need and we'll email you a quote within 24 hours.</p>
        </header>

        <div className="bulk-grid">
          <section className="bulk-tiers" aria-labelledby="bk-tiers-h">
            <h2 className="co-h" id="bk-tiers-h">Pricing</h2>
            <ul className="bulk-tier-list">
              {TIERS.map(([qty, off, label]) => (
                <li key={qty}><span><b>{qty}</b><small>{label}</small></span><em>{off}</em></li>
              ))}
            </ul>
            <ul className="bulk-extras">
              {EXTRAS.map((t) => <li key={t}>{t}</li>)}
            </ul>
            <p className="muted">Questions first? Write to <a href={`mailto:${BUSINESS.emails.bulk}`}>{BUSINESS.emails.bulk}</a> or call <a href={BUSINESS.phone.href}>{BUSINESS.phone.label}</a>.</p>
          </section>

          <form className="bulk-form" onSubmit={submit} noValidate aria-labelledby="bk-form-h">
            <h2 className="co-h" id="bk-form-h">Ask for a quote</h2>
            {banner && <p className="form-banner" role="alert" tabIndex={-1} ref={bannerRef}>{banner}</p>}
            <Field id="bk-type" label="Order type">
              <select id="bk-type" value={form.type} onChange={set("type")}>
                {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </Field>
            <Field id="bk-org" label="Organisation" error={errors.org}>
              <input id="bk-org" type="text" autoComplete="organization" maxLength={120} value={form.org} onChange={set("org")} aria-invalid={errors.org ? "true" : undefined} aria-describedby={describe("org")} />
            </Field>
            <div className="form-pair">
              <Field id="bk-qty" label="Pieces" error={errors.qty}>
                <input id="bk-qty" type="number" inputMode="numeric" min={MIN_QTY} step="1" value={form.qty} onChange={set("qty")} aria-invalid={errors.qty ? "true" : undefined} aria-describedby={describe("qty")} />
              </Field>
              <Field id="bk-contact" label="Your name" error={errors.contact}>
                <input id="bk-contact" type="text" autoComplete="name" maxLength={80} value={form.contact} onChange={set("contact")} aria-invalid={errors.contact ? "true" : undefined} aria-describedby={describe("contact")} />
              </Field>
            </div>
            <Field id="bk-email" label="Email" error={errors.email} hint="We send the quote here.">
              <input id="bk-email" type="email" inputMode="email" autoComplete="email" spellCheck="false" autoCapitalize="off" maxLength={254} value={form.email} onChange={set("email")} aria-invalid={errors.email ? "true" : undefined} aria-describedby={describe("email", "bk-email-hint")} />
            </Field>
            <Field id="bk-message" label="What you need" error={errors.message}>
              <textarea id="bk-message" rows={5} maxLength={5000} value={form.message} onChange={set("message")} placeholder="Design, colours, sizes and when you need them" aria-invalid={errors.message ? "true" : undefined} aria-describedby={describe("message")} />
            </Field>
            <div className="form-row">
              <span className="bulk-label" id="bk-files-label">Logo or sketches <span className="opt">optional</span></span>
              <label className="bulk-drop">
                <input className="bulk-file" type="file" accept="image/png,image/jpeg,image/webp" multiple onChange={addImages} aria-labelledby="bk-files-label" />
                <b>Add images</b><span>PNG, JPG or WebP, up to {MAX_MB} MB each, {MAX_IMAGES} at most</span>
              </label>
              {images.length > 0 && (
                <ul className="bulk-thumbs">
                  {images.map((img, i) => (
                    <li key={`${img.name}-${i}`}>
                      <img src={img.src} alt={img.name} />
                      <button type="button" aria-label={`Remove ${img.name}`} onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}>×</button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <button className="btn btn-primary btn-block" type="submit" disabled={sending}>{sending ? "Sending…" : "Send my request"}</button>
          </form>
        </div>
      </div>
    </main>
  );
}
