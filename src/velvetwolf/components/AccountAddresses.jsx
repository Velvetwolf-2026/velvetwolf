import { useEffect, useState } from "react";
import { apiUrl } from "../utils/api";

const EMPTY = { label: "", name: "", phone: "", address: "", city: "", district: "", state: "", pincode: "", isDefault: false };

const labelStyle = { fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 2, color: "var(--silver)" };
const smallBtn = { background: "none", border: "none", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, padding: 0 };

async function request(path, options = {}) {
  const res = await fetch(apiUrl(path), {
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data;
}

function validate(form) {
  if (!form.name.trim()) return "Please enter the recipient's name.";
  if (!/^[6-9]\d{9}$/.test(form.phone)) return "Enter a valid 10-digit mobile number.";
  if (form.address.trim().length < 5) return "Please enter the full address.";
  if (!/^\d{6}$/.test(form.pincode)) return "Enter a valid 6-digit PIN code.";
  if (!form.city.trim() || !form.state.trim()) return "Please enter the city and state.";
  return "";
}

// Saved delivery addresses for the account page. Checkout reads the same list.
export default function AccountAddresses({ showToast }) {
  const [addresses, setAddresses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null | "new" | address id
  const [form, setForm] = useState(EMPTY);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [lookingUpPin, setLookingUpPin] = useState(false);

  const load = async () => {
    try {
      const data = await request("/profile/addresses");
      setAddresses(data.addresses || []);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startNew = () => {
    setForm({ ...EMPTY, isDefault: addresses.length === 0 });
    setEditing("new");
    setError("");
  };

  const startEdit = (a) => {
    setForm({ label: a.label || "", name: a.name, phone: a.phone, address: a.address, city: a.city, district: a.district || "", state: a.state, pincode: a.pincode, isDefault: a.is_default });
    setEditing(a.id);
    setError("");
  };

  // PIN code auto-fill (same India Post lookup as checkout).
  const onPincode = async (value) => {
    const pin = value.replace(/\D/g, "").slice(0, 6);
    setForm(f => ({ ...f, pincode: pin }));
    if (pin.length !== 6) return;
    setLookingUpPin(true);
    try {
      const res = await fetch(`https://api.postalpincode.in/pincode/${pin}`);
      const data = await res.json();
      const po = data?.[0]?.Status === "Success" ? data[0].PostOffice?.[0] : null;
      if (po) setForm(f => ({ ...f, city: f.city || po.Name || "", district: po.District || "", state: po.State || "" }));
    } catch {
      // Lookup is a convenience; the fields can be typed by hand.
    } finally {
      setLookingUpPin(false);
    }
  };

  const save = async (e) => {
    e.preventDefault();
    const problem = validate(form);
    if (problem) { setError(problem); return; }
    setSaving(true);
    try {
      const body = JSON.stringify({ ...form, label: form.label.trim(), name: form.name.trim(), address: form.address.trim() });
      if (editing === "new") await request("/profile/addresses", { method: "POST", body });
      else await request(`/profile/addresses/${editing}`, { method: "PUT", body });
      setEditing(null);
      showToast("Address saved.");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const remove = async (a) => {
    if (!window.confirm(`Remove the address "${a.label || a.address}"?`)) return;
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
      await request(`/profile/addresses/${a.id}`, {
        method: "PUT",
        body: JSON.stringify({ label: a.label || "", name: a.name, phone: a.phone, address: a.address, city: a.city, district: a.district || "", state: a.state, pincode: a.pincode, isDefault: true }),
      });
      await load();
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const field = (key, placeholder, props = {}) => (
    <input
      className="input-dark"
      placeholder={placeholder}
      value={form[key]}
      onChange={e => { setForm(f => ({ ...f, [key]: e.target.value })); setError(""); }}
      disabled={saving}
      {...props}
    />
  );

  return (
    <div style={{ maxWidth: 720 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24, gap: 16, flexWrap: "wrap" }}>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 36, letterSpacing: 2, margin: 0 }}>SAVED ADDRESSES</h2>
        {editing === null && addresses.length < 10 && (
          <button className="btn-gold" style={{ padding: "10px 20px", fontSize: 11 }} onClick={startNew}>+ ADD ADDRESS</button>
        )}
      </div>

      {editing !== null && (
        <form onSubmit={save} style={{ background: "var(--graphite)", border: "1px solid var(--smoke)", padding: 24, marginBottom: 24 }}>
          <div style={{ ...labelStyle, color: "var(--gold)", marginBottom: 16 }}>{editing === "new" ? "NEW ADDRESS" : "EDIT ADDRESS"}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
            {field("label", "Label (e.g. Home, Office)", { maxLength: 40 })}
            {field("name", "Full name *", { maxLength: 100 })}
            {field("phone", "Mobile number *", { maxLength: 10, inputMode: "numeric", onChange: e => { setForm(f => ({ ...f, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })); setError(""); } })}
            <div style={{ position: "relative" }}>
              {field("pincode", "PIN code *", { maxLength: 6, inputMode: "numeric", style: { width: "100%" }, onChange: e => { onPincode(e.target.value); setError(""); } })}
              {lookingUpPin && <span style={{ position: "absolute", right: 10, top: 12, fontSize: 12, color: "var(--gold)", fontFamily: "var(--font-mono)" }}>...</span>}
            </div>
            <div style={{ gridColumn: "1/-1" }}>{field("address", "House no., street, area *", { maxLength: 300, style: { width: "100%" } })}</div>
            {field("city", "City *", { maxLength: 100 })}
            {field("district", "District", { maxLength: 100 })}
            {field("state", "State *", { maxLength: 100 })}
          </div>
          <label style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 16, cursor: "pointer", ...labelStyle }}>
            <input type="checkbox" checked={form.isDefault} onChange={e => setForm(f => ({ ...f, isDefault: e.target.checked }))} style={{ accentColor: "var(--gold)" }} />
            USE AS MY DEFAULT ADDRESS
          </label>
          {error && <div style={{ color: "var(--wolf-red)", fontFamily: "var(--font-mono)", fontSize: 10, letterSpacing: 1, marginTop: 12 }}>✕ {error}</div>}
          <div style={{ display: "flex", gap: 12, marginTop: 20 }}>
            <button type="submit" className="btn-gold" style={{ padding: "10px 20px", fontSize: 11 }} disabled={saving}>{saving ? "SAVING..." : "SAVE ADDRESS"}</button>
            <button type="button" className="btn-ghost" style={{ padding: "10px 20px", fontSize: 11 }} onClick={() => setEditing(null)} disabled={saving}>CANCEL</button>
          </div>
        </form>
      )}

      {loading ? (
        <div style={{ ...labelStyle }}>LOADING...</div>
      ) : addresses.length === 0 && editing === null ? (
        <p style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--silver)" }}>
          No saved addresses yet. Add one here, or tick "Save this address" at checkout.
        </p>
      ) : (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 14 }}>
          {addresses.map(a => (
            <div key={a.id} style={{ border: `1px solid ${a.is_default ? "var(--gold)" : "var(--smoke)"}`, padding: 18, background: "var(--graphite)" }}>
              <div style={{ ...labelStyle, color: a.is_default ? "var(--gold)" : "var(--ash)", marginBottom: 8 }}>
                {(a.label || "ADDRESS").toUpperCase()}{a.is_default ? " · DEFAULT" : ""}
              </div>
              <div style={{ fontFamily: "var(--font-serif)", fontSize: 14, color: "var(--ivory)", lineHeight: 1.6 }}>
                {a.name}<br />
                {a.address}<br />
                {a.city}{a.district ? `, ${a.district}` : ""}, {a.state} {a.pincode}<br />
                <span style={{ color: "var(--silver)" }}>+91 {a.phone}</span>
              </div>
              <div style={{ display: "flex", gap: 16, marginTop: 14 }}>
                <button style={{ ...smallBtn, color: "var(--gold)" }} onClick={() => startEdit(a)}>EDIT</button>
                {!a.is_default && <button style={{ ...smallBtn, color: "var(--silver)" }} onClick={() => makeDefault(a)}>SET DEFAULT</button>}
                <button style={{ ...smallBtn, color: "var(--wolf-red)" }} onClick={() => remove(a)}>REMOVE</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
