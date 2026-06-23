import nodemailer from "nodemailer";
import { loadBackendEnv } from "./env.js";
import { buildOtpEmail } from "./otp-template.js";
import { ApiError, logError } from "../utils/http.js";

loadBackendEnv();

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtpout.secureserver.net",
    port: parseInt(process.env.SMTP_PORT || "465", 10),
    secure: (process.env.SMTP_PORT || "465") !== "587",
    auth: {
      user: process.env.SMTP_USER || process.env.EMAIL_FROM,
      pass: process.env.SMTP_PASS,
    },
  });
}

function parseSmtpError(err) {
  const code = err?.code || "";
  const responseCode = err?.responseCode;

  if (responseCode === 535 || code === "EAUTH") {
    return "Email sending is temporarily unavailable. Please try again later.";
  }
  if (responseCode === 550 || responseCode === 553) {
    return "Invalid email address. Please check and try again.";
  }
  if (code === "ECONNREFUSED" || code === "ETIMEDOUT" || code === "ENOTFOUND") {
    return "Email sending is temporarily unavailable. Please try again later.";
  }
  return err?.message || "Failed to send email. Please try again later.";
}

export async function sendOTP(email, otp, kind = "login", verifyUrl = null) {
  if (email.endsWith("@mobile.velvetwolf.in")) {
    console.log(`[MOCK SMS OTP] To mobile user: ${email}, OTP: ${otp}`);
    return { messageId: "mock-message-id" };
  }
  const emailContent = buildOtpEmail({ otp, kind, verifyUrl });
  const transporter = createTransporter();
  try {
    return await transporter.sendMail({
      from: process.env.EMAIL_FROM || "info@velvetwolf.in",
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text,
    });
  } catch (err) {
    logError("SMTP sendOTP failed", { email, kind, errorCode: err?.code, errorMessage: err?.message });
    
    const isLocal = (process.env.FRONTEND_URL || "").includes("localhost") || 
                    (process.env.BACKEND_PUBLIC_URL || "").includes("localhost") || 
                    process.env.PORT === "5000";

    if (isLocal) {
      console.log("\n=========================================");
      console.log(`[DEVELOPMENT FALLBACK] Failed to send email via SMTP.`);
      console.log(`To: ${email}`);
      console.log(`OTP Code: ${otp}`);
      console.log(`Verify Link: ${verifyUrl}`);
      console.log("=========================================\n");
      return { messageId: "dev-fallback-mock-message-id" };
    }

    throw new ApiError(502, parseSmtpError(err));
  }
}

export async function sendEmail({ to, cc, subject, html, text, replyTo, attachments }) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  const allowed = recipients;
  if (allowed.length === 0) {
    throw new ApiError(400, "No recipients provided.");
  }
  const transporter = createTransporter();
  try {
    return await transporter.sendMail({
      from: process.env.EMAIL_FROM || "info@velvetwolf.in",
      to: allowed.join(", "),
      ...(cc && { cc }),
      subject,
      html,
      text,
      ...(replyTo && { replyTo }),
      ...(attachments && { attachments }),
    });
  } catch (err) {
    logError("SMTP sendEmail failed", { to: allowed, errorCode: err?.code, errorMessage: err?.message });
    
    const isLocal = (process.env.FRONTEND_URL || "").includes("localhost") || 
                    (process.env.BACKEND_PUBLIC_URL || "").includes("localhost") || 
                    process.env.PORT === "5000" ||
                    process.env.NODE_ENV === "development";

    if (isLocal) {
      console.log("\n=========================================");
      console.log(`[DEVELOPMENT FALLBACK] Failed to send email via SMTP.`);
      console.log(`To: ${allowed.join(", ")}`);
      if (cc) console.log(`CC: ${cc}`);
      console.log(`Subject: ${subject}`);
      console.log(`Attachments: ${(attachments || []).length} files`);
      console.log("=========================================\n");
      return { messageId: "dev-fallback-mock-message-id" };
    }

    throw new ApiError(502, parseSmtpError(err));
  }
}
