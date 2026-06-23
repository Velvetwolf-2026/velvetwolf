import { sendEmail } from "../config/smtp.js";
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

export async function sendBulkOrderMessage({ type, org, contact, email, qty, message, images }) {
  const safeType = escapeHtml(type);
  const safeOrg = escapeHtml(org);
  const safeContact = escapeHtml(contact);
  const safeEmail = escapeHtml(email);
  const safeQty = Number(qty);
  const safeMessage = escapeHtml(message).replace(/\r?\n/g, "<br />");

  try {
    const attachments = (images || [])
      .map((img, index) => {
        const match = img.match(/^data:(image\/\w+);base64,(.+)$/);
        if (match) {
          const contentType = match[1];
          const base64Data = match[2];
          const ext = contentType.split("/")[1];
          return {
            filename: `design-${index + 1}.${ext}`,
            content: Buffer.from(base64Data, "base64"),
            contentType,
          };
        }
        return null;
      })
      .filter(Boolean);

    await sendEmail({
      to: email,
      cc: "info@velvetwolf.in",
      subject: `[VelvetWolf] Bulk & Corporate Quote Request - ${safeOrg}`,
      html: `
        <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.6; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #ddd;">
          <h2 style="border-bottom: 2px solid #c9a84c; padding-bottom: 10px; color: #c9a84c;">Bulk Order Quote Request</h2>
          <p>Thank you for contacting VelvetWolf. We have received your request and will get back to you within 24 hours.</p>
          <hr style="border: 0; border-top: 1px solid #eee; margin: 20px 0;" />
          <p><strong>Order Type:</strong> ${safeType.toUpperCase()}</p>
          <p><strong>Organization Name:</strong> ${safeOrg}</p>
          <p><strong>Contact Person:</strong> ${safeContact}</p>
          <p><strong>Email Address:</strong> ${safeEmail}</p>
          <p><strong>Quantity Required:</strong> ${safeQty}</p>
          <p><strong>Product Requirements:</strong></p>
          <div style="background: #f9f9f9; padding: 15px; border-left: 4px solid #c9a84c; margin: 10px 0;">
            ${safeMessage}
          </div>
          ${attachments.length > 0 ? `<p><strong>Attached Designs:</strong> ${attachments.length} image(s) attached.</p>` : ""}
        </div>
      `,
      text: [
        "Bulk Order Quote Request",
        `Order Type: ${type}`,
        `Organization Name: ${org}`,
        `Contact Person: ${contact}`,
        `Email Address: ${email}`,
        `Quantity: ${qty}`,
        "",
        "Product Requirements:",
        message,
      ].join("\n"),
      attachments,
    });

    logInfo("Bulk order email sent", { email, org });
    return { ok: true, message: "Your quote request has been sent successfully." };
  } catch (error) {
    logError("Bulk order email failed", { email, org, error });
    throw new ApiError(500, "We could not send your quote request right now. Please try again shortly.");
  }
}
