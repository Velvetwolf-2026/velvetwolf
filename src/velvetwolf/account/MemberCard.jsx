// The member card: dark metal under glass, with the name, member number, when they joined and
// their Wolf Type. It tilts towards the mouse, or with the phone (Android straight away; iPhone
// asks first, so there's a button). Still with reduced motion.
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router";
import { wolfType } from "./wolfTypes";

const MAX_TILT = 9; // degrees
const pad = (n) => String(n).padStart(4, "0");
const reduced = () => typeof matchMedia !== "undefined" && matchMedia("(prefers-reduced-motion: reduce)").matches;
// x, y in -1..1: the card leans that way and the sheen follows
function applyTilt(el, x, y) {
  if (!el) return;
  el.style.setProperty("--rx", `${(-y * MAX_TILT).toFixed(2)}deg`);
  el.style.setProperty("--ry", `${(x * MAX_TILT).toFixed(2)}deg`);
  el.style.setProperty("--sx", `${(50 + x * 40).toFixed(1)}%`);
  el.style.setProperty("--sy", `${(50 + y * 40).toFixed(1)}%`);
}
const since = (iso) => {
  const d = iso ? new Date(iso) : null;
  return d && !Number.isNaN(d.getTime()) ? d.toLocaleDateString("en-GB", { month: "short", year: "numeric" }) : "";
};

export default function MemberCard({ name, membership, personality }) {
  const cardRef = useRef(null);
  const [gyro, setGyro] = useState("off"); // off | ask (iPhone) | on
  const type = wolfType(personality);

  const tilt = (x, y) => applyTilt(cardRef.current, x, y);

  const onMove = (e) => {
    if (e.pointerType !== "mouse" || reduced()) return;
    const r = e.currentTarget.getBoundingClientRect();
    tilt(((e.clientX - r.left) / r.width) * 2 - 1, ((e.clientY - r.top) / r.height) * 2 - 1);
  };

  // the phone's tilt: beta front/back, gamma left/right
  useEffect(() => {
    if (reduced() || typeof window === "undefined" || !("DeviceOrientationEvent" in window)) return undefined;
    if (!matchMedia("(pointer: coarse)").matches) return undefined;
    if (typeof DeviceOrientationEvent.requestPermission === "function") {
      if (gyro === "off") setGyro("ask");
      if (gyro !== "on") return undefined;
    }
    const onTilt = (e) => {
      if (e.beta == null || e.gamma == null) return;
      applyTilt(cardRef.current, Math.max(-1, Math.min(1, e.gamma / 30)), Math.max(-1, Math.min(1, (e.beta - 45) / 30)));
    };
    addEventListener("deviceorientation", onTilt);
    return () => removeEventListener("deviceorientation", onTilt);
  }, [gyro]);

  const askGyro = async () => {
    try {
      const r = await DeviceOrientationEvent.requestPermission();
      setGyro(r === "granted" ? "on" : "off");
    } catch {
      setGyro("off");
    }
  };

  const no = membership?.memberNo ? `No. ${pad(membership.memberNo)}` : "";
  const joined = since(membership?.memberSince);

  return (
    <div className="den-card-wrap" onPointerMove={onMove} onPointerLeave={() => tilt(0, 0)}>
      <article className="den-card" ref={cardRef} aria-label="Your member card">
        <span className="den-card-sheen" aria-hidden="true" />
        <div className="den-card-top">
          <span className="den-card-brand">VELVETWOLF</span>
          {no && <span className="den-card-no">{no}</span>}
        </div>
        <p className="den-card-name">{name}</p>
        <dl className="den-card-meta">
          {joined && <div><dt>Member since</dt><dd>{joined}</dd></div>}
          <div>
            <dt>Wolf Type</dt>
            <dd>{type ? type.name : <Link to="/account?tab=fit">Find yours</Link>}</dd>
          </div>
        </dl>
      </article>
      {gyro === "ask" && <button className="text-btn den-card-gyro" type="button" onClick={askGyro}>Tilt it with your phone</button>}
    </div>
  );
}
