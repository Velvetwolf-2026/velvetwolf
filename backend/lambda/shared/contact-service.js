import { sendEmail } from "./config/ses.js";
import { ApiError, logError, logInfo } from "./http.js";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CONTACT_TO = process.env.CONTACT_TO || "hello@velvetwolf.in";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendContactMessage({ name, email, subject, message }) {
  const cleanName = String(name || "").trim();
  const cleanEmail = String(email || "").trim().toLowerCase();
  const cleanSubject = String(subject || "").trim();
  const cleanMessage = String(message || "").trim();

  if (cleanName.length < 2) throw new ApiError(400, "Please enter your name.");
  if (!EMAIL_RE.test(cleanEmail)) throw new ApiError(400, "Please enter a valid email address.");
  if (!cleanSubject) throw new ApiError(400, "Please select a subject.");
  if (cleanMessage.length < 10) throw new ApiError(400, "Please enter a message with at least 10 characters.");

  const safeName = escapeHtml(cleanName);
  const safeEmail = escapeHtml(cleanEmail);
  const safeSubject = escapeHtml(cleanSubject);
  const safeMessage = escapeHtml(cleanMessage).replace(/\r?\n/g, "<br />");

  try {
    await sendEmail({
      to: CONTACT_TO,
      subject: `[VelvetWolf Contact] ${cleanSubject}`,
      replyTo: cleanEmail,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
          <h2>New contact form message</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <p><strong>Message:</strong><br />${safeMessage}</p>
        </div>
      `,
      text: [
        "New contact form message",
        `Name: ${cleanName}`,
        `Email: ${cleanEmail}`,
        `Subject: ${cleanSubject}`,
        "",
        cleanMessage,
      ].join("\n"),
    });

    logInfo("Contact email sent", { email: cleanEmail, subject: cleanSubject });
    return { ok: true, message: "Your message has been sent successfully." };
  } catch (error) {
    logError("Contact email failed", { email: cleanEmail, subject: cleanSubject, error });
    throw new ApiError(500, "We could not send your message right now. Please try again shortly.");
  }
}
