import { ApiError, logError, logWarn } from "../utils/http.js";

/**
 * Verifies the Google reCAPTCHA v3 token against the Google API.
 * @param {string} token - The reCAPTCHA response token from the frontend client.
 * @returns {Promise<boolean>} Resolves to true if verification is successful, false otherwise.
 */
export async function verifyRecaptcha(token) {
  const secretKey = process.env.RECAPTCHA_SECRET_KEY || "6LdOkUEtAAAAAKUXpJXF2qwWTKmZudfM95Weet8o";

  // Bypass checks for local test automation scripts and testing suites
  if (
    process.env.NODE_ENV === "test" ||
    token === "mock-recaptcha-token"
  ) {
    return true;
  }

  // If token is missing, verify if the key exists in backend environment
  if (!token) {
    if (!process.env.RECAPTCHA_SECRET_KEY) {
      logWarn("reCAPTCHA token is missing but RECAPTCHA_SECRET_KEY is not defined in environment. Bypassing check.");
      return true;
    }
    return false;
  }

  try {
    const res = await fetch("https://www.google.com/recaptcha/api/siteverify", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        secret: secretKey,
        response: token
      }).toString()
    });

    const data = await res.json();
    if (!res.ok) {
      logError("reCAPTCHA validation endpoint returned non-ok status", { status: res.status });
      return false;
    }

    if (!data.success) {
      return false;
    }

    // For reCAPTCHA v3, verify score (default threshold: 0.5)
    if (data.score !== undefined && data.score < 0.5) {
      logWarn("reCAPTCHA verification rejected low score", { score: data.score, action: data.action });
      return false;
    }

    return true;
  } catch (err) {
    logError("reCAPTCHA validation failed with an exception", { error: err.message });
    return false;
  }
}
