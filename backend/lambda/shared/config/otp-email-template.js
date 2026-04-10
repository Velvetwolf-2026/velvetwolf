const OTP_EMAIL_VARIANTS = {
  login: {
    subject: "VelvetWolf Login OTP",
    tagline: "Secure Login Verification",
    titleWhite: "LOGIN",
    titleGold: "OTP",
    introText: "Hi there,",
    messageText: "We received a request to sign in to your VelvetWolf account. Use the OTP below to complete your login securely.",
    otpLabel: "Your One-Time Password",
    expiryText: "This OTP is valid for 10 minutes. If you did not try to log in, please ignore this email.",
    actionText: "Verify Login",
    footerText: "VelvetWolf Team",
  },
  signup: {
    subject: "VelvetWolf Signup OTP",
    tagline: "Welcome To The Pack",
    titleWhite: "SIGNUP",
    titleGold: "OTP",
    introText: "Welcome to VelvetWolf.",
    messageText: "Your account creation is almost complete. Use the OTP below to verify your email address and activate your account.",
    otpLabel: "Verification Code",
    expiryText: "Enter this code to complete your registration. This code will expire in 10 minutes.",
    actionText: "Activate Account",
    footerText: "Thank you for joining VelvetWolf.",
  },
  forgot: {
    subject: "VelvetWolf Password Reset OTP",
    tagline: "Password Reset Protection",
    titleWhite: "RESET",
    titleGold: "PASSWORD",
    introText: "We received a request to reset your VelvetWolf account password.",
    messageText: "Use the OTP below to continue with your password reset process.",
    otpLabel: "Reset OTP",
    expiryText: "For your security, this OTP will expire in 10 minutes. If you did not request a password reset, you can safely ignore this email.",
    actionText: "Reset Password",
    footerText: "Need help? Contact VelvetWolf support.",
  },
};

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function normalizeOtpKind(kind) {
  const value = String(kind || "").toLowerCase().trim();

  if (["signup", "sign-up", "register", "registration"].includes(value)) {
    return "signup";
  }

  if (["forgot", "forget", "forgot-password", "forget-password", "recovery", "reset"].includes(value)) {
    return "forgot";
  }

  return "login";
}

export function buildOtpEmail({ otp, kind, verifyUrl = null }) {
  const normalizedKind = normalizeOtpKind(kind);
  const content = OTP_EMAIL_VARIANTS[normalizedKind];
  const safeOtp = escapeHtml(otp);

  return {
    subject: content.subject,
    html: `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(content.subject)}</title>
</head>
<body style="margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#050505;background-image:radial-gradient(circle at top left, rgba(215,184,90,0.08), transparent 25%), linear-gradient(135deg, #050505 0%, #0b0b14 55%, #050505 100%);color:#ffffff;">
  <div style="width:100%;padding:30px 16px;">
    <div style="max-width:640px;margin:0 auto;background:#0a0a0f;border:1px solid rgba(215,184,90,0.18);box-shadow:0 0 30px rgba(0,0,0,0.35);">
      <div style="padding:28px 32px 18px;border-bottom:1px solid rgba(215,184,90,0.12);">
        <h1 style="margin:0;font-size:28px;font-weight:800;letter-spacing:6px;color:#f4f4f4;text-transform:uppercase;">VELVETWOLF</h1>
        <div style="margin-top:6px;font-size:11px;letter-spacing:4px;color:#d7b85a;text-transform:uppercase;">Luxury Streetwear</div>
        <div style="margin-top:18px;font-size:12px;letter-spacing:5px;color:#d7b85a;text-transform:uppercase;">${escapeHtml(content.tagline)}</div>
      </div>
      <div style="padding:40px 32px 36px;">
        <h2 style="margin:0 0 14px;font-size:34px;line-height:1.1;font-weight:800;text-transform:uppercase;color:#ffffff;">
          <span>${escapeHtml(content.titleWhite)}</span>
          <span style="color:#d7b85a;"> ${escapeHtml(content.titleGold)}</span>
        </h2>
        <p style="font-size:15px;line-height:1.8;color:#cfcfcf;margin:0 0 18px;">${escapeHtml(content.introText)}</p>
        <p style="font-size:15px;line-height:1.8;color:#cfcfcf;margin:0 0 18px;">${escapeHtml(content.messageText)}</p>
        <div style="margin:30px 0;padding:20px;text-align:center;border:1px solid rgba(215,184,90,0.28);background:linear-gradient(90deg, rgba(215,184,90,0.07), rgba(255,255,255,0.01));">
          <div style="font-size:12px;letter-spacing:4px;text-transform:uppercase;color:#d7b85a;margin-bottom:12px;">${escapeHtml(content.otpLabel)}</div>
          <div style="font-size:38px;font-weight:800;letter-spacing:10px;color:#ffffff;">${safeOtp}</div>
        </div>
        <div style="margin-top:24px;padding:16px 18px;border-left:3px solid #d7b85a;background-color:rgba(255,255,255,0.02);color:#bbbbbb;font-size:14px;line-height:1.7;">
          ${escapeHtml(content.expiryText)}
        </div>
        <div style="margin-top:28px;">
          ${verifyUrl
            ? `<a href="${verifyUrl}" style="display:inline-block;padding:14px 28px;background:linear-gradient(90deg, #d7b85a, #f0d37a);color:#0a0a0a;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">${escapeHtml(content.actionText)}</a>`
            : `<span style="display:inline-block;padding:14px 28px;background:linear-gradient(90deg, #d7b85a, #f0d37a);color:#0a0a0a;text-decoration:none;font-size:13px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">${escapeHtml(content.actionText)}</span>`
          }
        </div>
      </div>
      <div style="padding:22px 32px 30px;border-top:1px solid rgba(215,184,90,0.12);font-size:12px;line-height:1.8;color:#888888;">
        ${escapeHtml(content.footerText)}<br />
        This is an automated email. Please do not reply.<br />
        &copy; 2026 VELVETWOLF. All rights reserved.
      </div>
    </div>
  </div>
</body>
</html>`,
    text: [
      "VELVETWOLF",
      content.tagline,
      "",
      content.introText,
      content.messageText,
      "",
      `${content.otpLabel}: ${otp}`,
      content.expiryText,
      "",
      content.footerText,
      "This is an automated email. Please do not reply.",
    ].join("\n"),
  };
}
