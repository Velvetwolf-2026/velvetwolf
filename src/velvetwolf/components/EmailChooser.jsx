// Email links on computers. A phone always has a mail app, so mailto: works
// there; many laptops don't (people use Gmail or Outlook in the browser), and
// mailto: then does nothing. On a computer, clicking an email address opens
// this small menu instead: the mail app, Gmail, Outlook, or copy the address.
import { useEffect, useRef, useState } from "react";

const isComputer = () => typeof window !== "undefined" && window.matchMedia?.("(hover: hover) and (pointer: fine)").matches;

export default function EmailChooser() {
  const [open, setOpen] = useState(null); // { address, mailto, x, y, link }
  const [copied, setCopied] = useState(false);
  const boxRef = useRef(null);

  useEffect(() => {
    const onClick = (e) => {
      const a = e.target?.closest?.('a[href^="mailto:"]');
      if (!a || e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || !isComputer()) return;
      const mailto = a.getAttribute("href");
      const address = decodeURIComponent(mailto.slice(7).split("?")[0]);
      if (!address) return;
      e.preventDefault();
      const r = a.getBoundingClientRect();
      setCopied(false);
      setOpen({ address, mailto, link: a, x: Math.min(r.left, window.innerWidth - 280), y: r.bottom + 8 > window.innerHeight - 230 ? Math.max(8, r.top - 230) : r.bottom + 8 });
    };
    document.addEventListener("click", onClick);
    return () => document.removeEventListener("click", onClick);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    boxRef.current?.querySelector("a, button")?.focus();
    const close = () => setOpen(null);
    const onKey = (e) => { if (e.key === "Escape") { open.link?.focus(); close(); } };
    const onDown = (e) => { if (!boxRef.current?.contains(e.target)) close(); };
    addEventListener("keydown", onKey);
    addEventListener("mousedown", onDown);
    addEventListener("scroll", close, { passive: true, capture: true });
    return () => {
      removeEventListener("keydown", onKey);
      removeEventListener("mousedown", onDown);
      removeEventListener("scroll", close, { capture: true });
    };
  }, [open]);

  if (!open) return null;
  const to = encodeURIComponent(open.address);
  const copy = async () => {
    try { await navigator.clipboard.writeText(open.address); setCopied(true); } catch { setCopied(false); }
  };

  return (
    <div className="vw-mailpick" role="dialog" aria-label={`Write to ${open.address}`} ref={boxRef} style={{ left: Math.max(8, open.x), top: open.y }}>
      <p className="vw-mailpick-to">Write to <b>{open.address}</b></p>
      <a href={`https://mail.google.com/mail/?view=cm&fs=1&to=${to}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(null)}>Gmail</a>
      <a href={`https://outlook.live.com/mail/0/deeplink/compose?to=${to}`} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(null)}>Outlook</a>
      <a href={open.mailto} onClick={() => setOpen(null)}>Your email app</a>
      <button type="button" onClick={copy}>{copied ? "Copied" : "Copy address"}</button>
    </div>
  );
}
