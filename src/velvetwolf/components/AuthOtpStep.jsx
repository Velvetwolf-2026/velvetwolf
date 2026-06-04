export function AuthOtpStep({
  title,
  email,
  error,
  otp,
  loading,
  resendTimer,
  onSubmit,
  onOtpChange,
  onOtpKeyDown,
  onOtpPaste,
  onResend,
  onBack,
  submitLabel,
  loadingLabel,
  idPrefix,
}) {
  return (
    <>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ fontSize: 40, marginBottom: 12 }}>✉</div>
        <h2 style={{ fontFamily: "var(--font-display)", fontSize: 30, letterSpacing: 4, color: "var(--ivory)", marginBottom: 8 }}>{title}</h2>
        <p style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)", lineHeight: 1.7 }}>
          6-digit code sent to
          <br />
          <span style={{ color: "var(--ivory)" }}>{email}</span>
        </p>
      </div>

      {error && <div style={{ background: "rgba(192,57,43,0.12)", border: "1px solid rgba(192,57,43,0.3)", color: "#e07070", padding: "10px 14px", fontFamily: "var(--font-mono)", fontSize: 10, marginBottom: 16, textAlign: "center", letterSpacing: 0.5 }}>✕ {error}</div>}

      <form onSubmit={onSubmit}>
        <div className="vw-otp-row" style={{ display: "flex", gap: 8, justifyContent: "center", marginBottom: 24 }} onPaste={onOtpPaste}>
          {otp.map((digit, i) => (
            <input
              key={i}
              id={`${idPrefix}-${i}`}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={e => onOtpChange(i, e.target.value)}
              onKeyDown={e => onOtpKeyDown(i, e)}
              className="vw-otp-input"
              style={{ width: 46, height: 54, textAlign: "center", background: "var(--graphite)", border: `1px solid ${digit ? "var(--gold)" : "var(--smoke)"}`, color: "var(--ivory)", fontFamily: "var(--font-display)", fontSize: 26, outline: "none", transition: "border-color 0.2s" }}
              onFocus={e => { e.target.style.borderColor = "var(--gold)"; }}
              onBlur={e => { e.target.style.borderColor = digit ? "var(--gold)" : "var(--smoke)"; }}
            />
          ))}
        </div>
        <button type="submit" className="btn-gold" disabled={loading || otp.join("").length < 6} style={{ width: "100%", padding: "14px", fontSize: 14, letterSpacing: 4, opacity: otp.join("").length < 6 ? 0.45 : loading ? 0.7 : 1, cursor: otp.join("").length < 6 ? "not-allowed" : "pointer" }}>
          {loading ? loadingLabel : submitLabel}
        </button>
      </form>

      <div style={{ textAlign: "center", marginTop: 18, fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--silver)" }}>
        Didn't receive it?{" "}
        <button type="button" onClick={onResend} disabled={resendTimer > 0} style={{ all: "unset", cursor: resendTimer > 0 ? "default" : "pointer", color: resendTimer > 0 ? "var(--silver)" : "var(--gold)" }}>
          {resendTimer > 0 ? `RESEND IN ${resendTimer}s` : "RESEND CODE"}
        </button>
      </div>

      {onBack && (
        <div style={{ textAlign: "center", marginTop: 14 }}>
          <button type="button" onClick={onBack} style={{ all: "unset", cursor: "pointer", fontFamily: "var(--font-mono)", fontSize: 9, letterSpacing: 2, color: "var(--silver)" }}>
            ← BACK
          </button>
        </div>
      )}
    </>
  );
}
