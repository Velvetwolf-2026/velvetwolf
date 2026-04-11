import { supabaseAdmin } from "./config/supabase.js";
import { logError, logInfo, logWarn } from "./http.js";

// Only permanent bounces and complaints get suppressed.
// Transient bounces (mailbox full, etc.) are logged but not suppressed.
const PERMANENT_BOUNCE_SUBTYPES = new Set([
  "General",
  "NoEmail",
  "Suppressed",
  "OnAccountSuppressionList",
]);

async function suppressEmail(email, reason, bounceType = null) {
  const normalized = String(email || "").toLowerCase().trim();
  if (!normalized) return;

  const { error } = await supabaseAdmin
    .from("suppressed_emails")
    .upsert(
      { email: normalized, reason, bounce_type: bounceType, updated_at: new Date().toISOString() },
      { onConflict: "email" }
    );

  if (error) {
    logError("Failed to suppress email", { email: normalized, reason, error });
  } else {
    logInfo("Email suppressed", { email: normalized, reason, bounceType });
  }
}

async function handleBounce(bounce) {
  const bounceType = bounce?.bounceType || "Undetermined";
  const subType = bounce?.bounceSubType || "";

  if (bounceType !== "Permanent" && !PERMANENT_BOUNCE_SUBTYPES.has(subType)) {
    logInfo("Transient bounce — not suppressing", { bounceType, subType });
    return;
  }

  const recipients = bounce?.bouncedRecipients || [];
  for (const r of recipients) {
    await suppressEmail(r.emailAddress, "bounce", bounceType);
  }
}

async function handleComplaint(complaint) {
  // Every complaint suppresses — no exceptions.
  const recipients = complaint?.complainedRecipients || [];
  for (const r of recipients) {
    await suppressEmail(r.emailAddress, "complaint", null);
  }
}

// Checks whether an email address is on the suppression list.
export async function isEmailSuppressed(email) {
  const normalized = String(email || "").toLowerCase().trim();
  if (!normalized) return false;

  const { data, error } = await supabaseAdmin
    .from("suppressed_emails")
    .select("email")
    .eq("email", normalized)
    .maybeSingle();

  if (error) {
    logError("Suppression list lookup failed", { email: normalized, error });
    return false; // fail open — don't block sends on DB errors
  }

  return Boolean(data);
}

// Entry point called by the /ses/notification route.
// Handles both SNS SubscriptionConfirmation and Notification messages.
export async function handleSnsNotification(rawBody) {
  let envelope;
  try {
    envelope = JSON.parse(rawBody);
  } catch {
    logWarn("SNS notification: invalid JSON body");
    return { ok: false, reason: "invalid_json" };
  }

  // SNS subscription confirmation — fetch the URL to confirm the subscription.
  if (envelope.Type === "SubscriptionConfirmation") {
    const subscribeUrl = envelope.SubscribeURL;
    if (!subscribeUrl) {
      logWarn("SNS SubscriptionConfirmation missing SubscribeURL");
      return { ok: false, reason: "missing_subscribe_url" };
    }

    logInfo("Confirming SNS subscription", { subscribeUrl });
    try {
      await fetch(subscribeUrl);
      logInfo("SNS subscription confirmed");
    } catch (err) {
      logError("SNS subscription confirmation fetch failed", { error: err });
    }
    return { ok: true };
  }

  if (envelope.Type !== "Notification") {
    logInfo("Ignoring non-Notification SNS message", { type: envelope.Type });
    return { ok: true };
  }

  let sesEvent;
  try {
    sesEvent = JSON.parse(envelope.Message);
  } catch {
    logWarn("SNS Notification: could not parse SES Message JSON");
    return { ok: false, reason: "invalid_ses_message" };
  }

  const notificationType = sesEvent.notificationType;
  logInfo("Processing SES notification", { notificationType });

  if (notificationType === "Bounce") {
    await handleBounce(sesEvent.bounce);
    return { ok: true };
  }

  if (notificationType === "Complaint") {
    await handleComplaint(sesEvent.complaint);
    return { ok: true };
  }

  logInfo("Unhandled SES notification type", { notificationType });
  return { ok: true };
}
