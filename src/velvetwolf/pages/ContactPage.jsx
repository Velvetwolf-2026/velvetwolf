// ─────────────────────────────────────────────
// VelvetWolf — Contact Us Page
// Route: /contact
// ─────────────────────────────────────────────
import { useState } from "react";
import { S, PageHeader } from "../styles/shared";
import { THEME } from "../utils/constants";
const { gold, goldLight, surface, border, muted, text } = THEME;

const CONTACTS = [
  { icon:"✉",  label:"GENERAL ENQUIRIES",  val:"hello@velvetwolf.in"    },
  { icon:"📦", label:"ORDER SUPPORT",       val:"orders@velvetwolf.in"   },
  { icon:"↩",  label:"RETURNS & EXCHANGE",  val:"returns@velvetwolf.in"  },
  { icon:"🏢", label:"BULK & CORPORATE",    val:"bulk@velvetwolf.in"     },
  { icon:"📱", label:"WHATSAPP SUPPORT",    val:"+91 98765 43210"        },
];

const SUBJECTS = ["Order Issue","Return / Exchange","Custom Design Enquiry","Bulk / Corporate Order","Product Question","Shipping Delay","Payment Problem","Partnership / Collab","Other"];

export default function ContactPage() {
  const [form, setForm] = useState({ name:"", email:"", subject:"", message:"" });
  const [sent, setSent] = useState(false);

  const update = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const inputStyle = {
    width:"100%", background:"#0a0a0a", border:`1px solid ${border}`,
    color:text, padding:"12px 14px", fontFamily:"'Space Mono',monospace",
    fontSize:12, outline:"none", boxSizing:"border-box", transition:"border-color 0.2s",
  };

  return (
    <div style={S.page}>
      <div style={{ ...S.wrap, maxWidth:1040 }}>
        <PageHeader eyebrow="REACH OUT" title="CONTACT US" sub="We respond within 4 hours · Mon–Sat, 10AM–7PM IST" />

        <div style={{ display:"grid", gridTemplateColumns:"1fr 1.6fr", gap:40, alignItems:"start" }}>

          {/* Left — contact info */}
          <div>
            <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, letterSpacing:4, color:gold, marginBottom:24 }}>GET IN TOUCH</div>

            {CONTACTS.map((c, i) => (
              <div key={i} style={{ display:"flex", gap:14, marginBottom:20, paddingBottom:20, borderBottom:`1px solid ${border}` }}>
                <span style={{ fontSize:18, flexShrink:0, marginTop:2 }}>{c.icon}</span>
                <div>
                  <div style={{ fontFamily:"'Roboto', sans-serif", fontSize:10, letterSpacing:3, color:muted, marginBottom:3 }}>{c.label}</div>
                  <div style={{ fontSize:15, color:gold }}>{c.val}</div>
                </div>
              </div>
            ))}

            <div style={{ marginTop:8 }}>
              <div style={{ fontFamily:"'Roboto', sans-serif", fontSize:10, letterSpacing:3, color:muted, marginBottom:10 }}>FOLLOW US</div>
              <div style={{ display:"flex", gap:8 }}>
                {["INSTAGRAM","TWITTER","PINTEREST"].map(s => (
                  <div key={s} style={{ fontFamily:"'Roboto', sans-serif", fontSize:10, letterSpacing:2, padding:"5px 10px", border:`1px solid ${border}`, color:muted, cursor:"pointer", transition:"all 0.2s" }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor=gold; e.currentTarget.style.color=gold; }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor=border; e.currentTarget.style.color=muted; }}
                  >{s}</div>
                ))}
              </div>
            </div>

            <div style={{ marginTop:28, background:surface, border:`1px solid ${border}`, padding:"18px 16px" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:10, letterSpacing:3, color:gold, marginBottom:8 }}>RESPONSE TIMES</div>
              {[["Email","Within 4 hours"],["WhatsApp","Within 2 hours"],["Instagram DM","Within 6 hours"],["Phone","Mon–Sat, 11AM–5PM"]].map((r,i) => (
                <div key={i} style={{ display:"flex", justifyContent:"space-between", fontSize:14, color:muted, marginBottom:6 }}>
                  <span>{r[0]}</span><span style={{color:"#81c784"}}>{r[1]}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form */}
          <div style={{ background:surface, border:`1px solid ${border}`, padding:"32px" }}>
            {sent ? (
              <div style={{ textAlign:"center", padding:"48px 20px" }}>
                <div style={{ fontSize:48, marginBottom:16 }}>✓</div>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:28, letterSpacing:4, color:gold, marginBottom:8 }}>MESSAGE SENT!</div>
                <p style={{ ...S.p, marginBottom:20 }}>We'll get back to you within 4 hours.</p>
                <button onClick={() => setSent(false)} style={{ all:"unset", border:`1px solid ${gold}55`, color:gold, fontFamily:"'Space Mono',monospace", fontSize:9, letterSpacing:3, padding:"10px 24px", cursor:"pointer" }}>SEND ANOTHER</button>
              </div>
            ) : (
              <>
                <div style={{ fontFamily:"'Bebas Neue',cursive", fontSize:22, letterSpacing:4, color:gold, marginBottom:24 }}>SEND A MESSAGE</div>
                <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:14, marginBottom:14 }}>
                  {[
                    { label:"YOUR NAME",      key:"name",  placeholder:"Full name"       },
                    { label:"EMAIL ADDRESS",  key:"email", placeholder:"your@email.com"  },
                  ].map(f => (
                    <div key={f.key}>
                      <label style={{ fontFamily:"'Roboto', sans-serif", fontSize:10, letterSpacing:3, color:muted, display:"block", marginBottom:8 }}>{f.label}</label>
                      <input value={form[f.key]} onChange={e => update(f.key, e.target.value)} placeholder={f.placeholder}
                        style={inputStyle}
                        onFocus={e => e.target.style.borderColor=gold}
                        onBlur={e  => e.target.style.borderColor=border}
                      />
                    </div>
                  ))}
                </div>

                <div style={{ marginBottom:14 }}>
                  <label style={{ fontFamily:"'Roboto', sans-serif", fontSize:10, letterSpacing:3, color:muted, display:"block", marginBottom:8 }}>SUBJECT</label>
                  <select value={form.subject} onChange={e => update("subject", e.target.value)}
                    style={{ ...inputStyle, cursor:"pointer", appearance:"none" }}
                    onFocus={e => e.target.style.borderColor=gold}
                    onBlur={e  => e.target.style.borderColor=border}
                  >
                    <option value="">Select a topic...</option>
                    {SUBJECTS.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>

                <div style={{ marginBottom:20 }}>
                  <label style={{ fontFamily:"'Roboto', sans-serif", fontSize:10, letterSpacing:3, color:muted, display:"block", marginBottom:8 }}>MESSAGE</label>
                  <textarea value={form.message} onChange={e => update("message", e.target.value)}
                    placeholder="Tell us how we can help you..." rows={6}
                    style={{ ...inputStyle, resize:"vertical", lineHeight:1.7 }}
                    onFocus={e => e.target.style.borderColor=gold}
                    onBlur={e  => e.target.style.borderColor=border}
                  />
                </div>

                <div style={{ display:"flex", alignItems:"center", gap:16 }}>
                  <button
                    onClick={() => { if (form.name && form.email && form.message) setSent(true); }}
                    style={{ background:gold, color:"#0a0a0a", border:"none", padding:"13px 32px", fontFamily:"'Bebas Neue',cursive", fontSize:16, letterSpacing:4, cursor:"pointer" }}
                    onMouseEnter={e => e.currentTarget.style.background=goldLight}
                    onMouseLeave={e => e.currentTarget.style.background=gold}
                  >SEND MESSAGE →</button>
                  <span style={{ fontFamily:"'Roboto', sans-serif", fontSize:12, letterSpacing:1, color:muted }}>Reply within 4 hours</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Office info */}
        <div style={{ marginTop:48, display:"grid", gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))", gap:12 }}>
          {[
            { label:"HEAD OFFICE",  lines:["VelvetWolf HQ","Chennai, Tamil Nadu, India","PIN: 600001"] },
            { label:"BUSINESS HOURS",lines:["Monday – Saturday","10:00 AM – 7:00 PM IST","Sunday: Closed"] },
            { label:"GSTIN",        lines:["33AAAAA0000A1Z5","For B2B invoice requests","bulk@velvetwolf.in"] },
          ].map((b,i) => (
            <div key={i} style={{ background:surface, border:`1px solid ${border}`, padding:"18px 16px" }}>
              <div style={{ fontFamily:"'Space Mono',monospace", fontSize:12, letterSpacing:3, color:gold, marginBottom:10 }}>{b.label}</div>
              {b.lines.map((l,j) => <p key={j} style={{ ...S.p, marginBottom:3, fontSize:14 }}>{l}</p>)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
