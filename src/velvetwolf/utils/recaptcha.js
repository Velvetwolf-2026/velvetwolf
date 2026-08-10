let scriptLoaded = false;

/**
 * Dynamically loads the Google reCAPTCHA v3 script with the site key.
 * @returns {Promise<any>} Resolves to window.grecaptcha when loaded and ready.
 */
export function loadRecaptcha() {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITEKEY || "6LdOkUEtAAAAABgDZltQ-VxyP_G7d_ZJi6vTxtg8";
  
  return new Promise((resolve, reject) => {
    if (window.grecaptcha && window.grecaptcha.execute) {
      resolve(window.grecaptcha);
      return;
    }
    
    if (scriptLoaded) {
      // Already loading or loaded, poll for readiness with a 10s timeout
      const startTime = Date.now();
      const check = setInterval(() => {
        if (window.grecaptcha && window.grecaptcha.execute) {
          clearInterval(check);
          resolve(window.grecaptcha);
        } else if (Date.now() - startTime > 10000) {
          clearInterval(check);
          reject(new Error("reCAPTCHA script load timed out."));
        }
      }, 100);
      return;
    }
    
    scriptLoaded = true;
    const script = document.createElement("script");
    script.id = "recaptcha-v3-script";
    script.src = `https://www.google.com/recaptcha/api.js?render=${siteKey}`;
    script.async = true;
    script.defer = true;
    script.onload = () => {
      window.grecaptcha.ready(() => {
        resolve(window.grecaptcha);
      });
    };
    script.onerror = (err) => {
      scriptLoaded = false;
      reject(err);
    };
    document.head.appendChild(script);
  });
}

/**
 * Executes reCAPTCHA v3 for a specific action.
 * @param {string} action - The action name (e.g. 'login', 'signup').
 * @returns {Promise<string>} The verification token.
 */
export async function executeRecaptcha(action) {
  const siteKey = import.meta.env.VITE_RECAPTCHA_SITEKEY || "6LdOkUEtAAAAABgDZltQ-VxyP_G7d_ZJi6vTxtg8";
  const grecaptcha = await loadRecaptcha();
  return new Promise((resolve, reject) => {
    grecaptcha.ready(async () => {
      try {
        const token = await grecaptcha.execute(siteKey, { action });
        resolve(token);
      } catch (err) {
        reject(err);
      }
    });
  });
}
