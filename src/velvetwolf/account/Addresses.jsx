// Saved delivery addresses (checkout reads the same list). Loading has a time limit and an
// error with a retry, so it can't sit on "Loading" for ever.
import { useContext, useEffect, useState } from "react";
import { AppContext } from "../pages/AppContext";
import { request } from "./api";

const EMPTY = { label: "", name: "", phone: "", address: "", city: "", district: "", state: "", pincode: "", isDefault: false };
const MAX = 10;

function problem(f) {
  if (!f.name.trim()) return ["name", "Enter the recipient's name."];
  if (!/^[6-9]\d{9}$/.test(f.phone)) return ["phone", "Enter a 10-digit Indian mobile number."];
  if (!/^\d{6}$/.test(f.pincode)) return ["pincode", "Enter the 6-digit PIN code."];
  if (f.address.trim().length < 5) return ["address", "Enter the house number, street and area."];
  if (!f.city.trim()) return ["city", "Enter the city."];
  if (!f.state.trim()) return ["state", "Enter the state."];
  return null;
}

const toBody = (f) => ({ ...f, label: f.label.trim(), name: f.name.trim(), address: f.address.trim(), city: f.city.trim(), district: f.district.trim(), state: f.state.trim() });
const fromRow = (a) => ({ label: a.label || "", name: a.name, phone: a.phone, address: a.address, city: a.city, district: a.district || "", state: a.state, pincode: a.pincode, isDefault: a.is_default });

export default function Addresses() {
  const { showToast } = useContext(AppContext);
  const [list, setList] = useState(null);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | id
  const [form, setForm] = useState(EMPTY);
  const [fieldError, setFieldError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [pinBusy, setPinBusy] = useState(false);

  const load = async () => {
    setError("");
    try {
      const d = await request("/profile/addresses");
      setList(d.addresses || []);
    } catch (err) {
      setError(err.message);
    }
  };
  useEffect(() => { load(); }, []);

  const start = (id, a) => { setEditing(id); setForm(a ? fromRow(a) : { ...EMPTY, isDefault: !list?.length }); setFieldError(null); };
  const field = (k) => ({
    id: `ad-${k}`, value: form[k], disabled: saving,
    "aria-invalid": fieldError?.[0] === k ? "true" : undefined,
    "aria-describedby": fieldError?.[0] === k ? "ad-err" : undefined,
    onChange: (e) => { setForm((f) => ({ ...f, [k]: e.target.value })); setFieldError(null); },
  });

  const onPin = async (raw) => {
    const pin = raw.replace(/\D/g, "").slice(0, 6);
    setForm((f) => ({ ...f, pincode: pin }));
    setFieldError(null);
    if (pin.length !== 6) return;
    setPinBusy(true);
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 6000);
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`, { signal: ctrl.signal }).finally(() => clearTimeout(t));
      const data = await res.json();
      const po = data?.[0]?.Status === "Success" ? data[0].PostOffice?.[0] : null;
      if (po) setForm((f) => ({ ...f, city: f.city || po.Block || po.Name || "", district: po.District || f.district, state: po.State || f.state }));
    } catch {
      // the lookup only saves typing; the fields can be filled by hand
    } finally {
      setPinBusy(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    const p = problem(form);
    if (p) { setFieldError(p); document.getElementById(`ad-${p[0]}`)?.focus(); return; }
    setSaving(true);
    try {
      if (editing === "new") await request("/profile/addresses", { method: "POST", body: toBody(form) });
      else await request(`/profile/addresses/${editing}`, { method: "PUT", body: toBody(form) });
      setEditing(null);
      showToast("Address saved.");
      await load();
    } catch (err) {
      setFieldError(["form", err.message]);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Remove ${a.label || "this address"}? ${a.address}`)) return;
    try {
      await request(`/profile/addresses/${a.id}`, { method: "DELETE" });
      showToast("Address removed.");
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };
  const makeDefault = async (a) => {
    try {
      await request(`/profile/addresses/${a.id}`, { method: "PUT", body: { ...fromRow(a), isDefault: true } });
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  return (
    <section className="den-set" aria-labelledby="set-addr-h">
      <div className="den-set-head">
        <h3 className="info-h" id="set-addr-h">Addresses</h3>
        {editing === null && list && list.length < MAX && <button className="btn btn-small" type="button" onClick={() => start("new")}>Add address</button>}
      </div>

      {editing !== null && (
        <form className="den-addr-form" onSubmit={save} noValidate>
          <div className="den-grid-2">
            <div className="form-row"><label htmlFor="ad-label">Label <span className="opt">optional, e.g. Home</span></label><input maxLength={40} {...field("label")} /></div>
            <div className="form-row"><label htmlFor="ad-name">Full name</label><input maxLength={100} autoComplete="name" {...field("name")} /></div>
            <div className="form-row"><label htmlFor="ad-phone">Mobile</label><input inputMode="numeric" autoComplete="tel-national" maxLength={10} {...field("phone")} onChange={(e) => { setForm((f) => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })); setFieldError(null); }} /></div>
            <div className="form-row"><label htmlFor="ad-pincode">PIN code {pinBusy && <span className="opt">looking it up…</span>}</label><input inputMode="numeric" autoComplete="postal-code" maxLength={6} {...field("pincode")} onChange={(e) => onPin(e.target.value)} /></div>
            <div className="form-row den-span-2"><label htmlFor="ad-address">House no., street, area</label><input maxLength={300} autoComplete="street-address" {...field("address")} /></div>
            <div className="form-row"><label htmlFor="ad-city">City</label><input maxLength={100} {...field("city")} /></div>
            <div className="form-row"><label htmlFor="ad-district">District <span className="opt">optional</span></label><input maxLength={100} {...field("district")} /></div>
            <div className="form-row"><label htmlFor="ad-state">State</label><input maxLength={100} {...field("state")} /></div>
          </div>
          <label className="den-check"><input type="checkbox" checked={form.isDefault} onChange={(e) => setForm((f) => ({ ...f, isDefault: e.target.checked }))} /> Use as my default address</label>
          {fieldError && <p className="field-error" id="ad-err" role="alert">{fieldError[1]}</p>}
          <div className="acct-actions">
            <button className="btn btn-small btn-primary" type="submit" disabled={saving}>{saving ? "Saving…" : "Save address"}</button>
            <button className="btn btn-small" type="button" disabled={saving} onClick={() => setEditing(null)}>Cancel</button>
          </div>
        </form>
      )}

      {error ? (
        <div className="den-inline-error" role="alert"><p>{error}</p><button className="btn btn-small" type="button" onClick={load}>Try again</button></div>
      ) : list === null ? (
        <p className="den-loading" role="status">Getting your addresses…</p>
      ) : !list.length && editing === null ? (
        <p className="muted">No saved addresses yet. Add one here, or tick "Save this address" at checkout.</p>
      ) : (
        <ul className="den-addrs">
          {list.map((a) => (
            <li key={a.id} className={a.is_default ? "is-default" : ""}>
              <p className="eyebrow">{a.label || "Address"}{a.is_default ? " · Default" : ""}</p>
              <p>{a.name}<br />{a.address}<br />{a.city}{a.district ? `, ${a.district}` : ""}, {a.state} {a.pincode}<br /><span className="muted">+91 {a.phone}</span></p>
              <div className="acct-actions">
                <button className="text-btn" type="button" onClick={() => start(a.id, a)}>Edit</button>
                {!a.is_default && <button className="text-btn" type="button" onClick={() => makeDefault(a)}>Make default</button>}
                <button className="text-btn" type="button" onClick={() => remove(a)}>Remove</button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
