import { sendEmail } from "../config/ses.js";
import { ApiError, logError, logInfo } from "../utils/http.js";

const CONTACT_TO = process.env.CONTACT_TO || "hello@velvetwolf.in";

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export async function sendContactMessage({ name, email, subject, message }) {
  // Inputs are pre-validated by Zod in the controller; escaping here for HTML safety in the email body
  const safeName = escapeHtml(name);
  const safeEmail = escapeHtml(email);
  const safeSubject = escapeHtml(subject);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br />");

  try {
    await sendEmail({
      to: CONTACT_TO,
      subject: `[VelvetWolf Contact] ${subject}`,
      replyTo: email,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6;">
          <h2>New contact form message</h2>
          <p><strong>Name:</strong> ${safeName}</p>
          <p><strong>Email:</strong> ${safeEmail}</p>
          <p><strong>Subject:</strong> ${safeSubject}</p>
          <p><strong>Message:</strong><br />${safeMessage}</p>
        </div>
      `,
      text: ["New contact form message", `Name: ${name}`, `Email: ${email}`, `Subject: ${subject}`, "", message].join("\n"),
    });

    logInfo("Contact email sent", { email, subject });
    return { ok: true, message: "Your message has been sent successfully." };
  } catch (error) {
    logError("Contact email failed", { email, subject, error });
    throw new ApiError(500, "We could not send your message right now. Please try again shortly.");
  }
}
