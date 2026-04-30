import nodemailer from "nodemailer";
import { loadBackendEnv } from "./env.js";
import { buildOtpEmail } from "./otp-template.js";
import { isEmailSuppressed } from "../services/bounce.service.js";
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
  if (await isEmailSuppressed(email)) {
    throw new ApiError(400, "This email address cannot receive messages. Please contact support.");
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
    throw new ApiError(502, parseSmtpError(err));
  }
}

export async function sendEmail({ to, subject, html, text, replyTo }) {
  const recipients = Array.isArray(to) ? to.filter(Boolean) : [to].filter(Boolean);
  const suppressed = await Promise.all(recipients.map(isEmailSuppressed));
  const allowed = recipients.filter((_, i) => !suppressed[i]);
  if (allowed.length === 0) {
    throw new ApiError(400, "All recipients are suppressed from receiving emails.");
  }
  const transporter = createTransporter();
  try {
    return await transporter.sendMail({
      from: process.env.EMAIL_FROM || "info@velvetwolf.in",
      to: allowed.join(", "),
      subject,
      html,
      text,
      ...(replyTo && { replyTo }),
    });
  } catch (err) {
    logError("SMTP sendEmail failed", { to: allowed, errorCode: err?.code, errorMessage: err?.message });
    throw new ApiError(502, parseSmtpError(err));
  }
}
