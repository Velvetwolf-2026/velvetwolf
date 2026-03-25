import express from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { sendOTP } from "../config/ses.js";
import passport from "../config/passport.js";
import { supabaseAdmin } from "../config/supabase.js";

const router = express.Router();

const OTP_EXPIRES_MIN = 10;
const MAX_OTP_ATTEMPTS = 5;
const RESEND_MAX = 3;
const RESEND_WINDOW_SECS = 3600; // 1 hour

// Rate limit helper
async function checkRateLimit(key, max = RESEND_MAX, windowSecs = RESEND_WINDOW_SECS) {
  const { data: rl, error } = await supabaseAdmin
    .from('rate_limits')
    .select('*')
    .eq('key', key)
    .single();

  if (error && error.code !== 'PGRST116') return; // not found = OK

  if (rl && rl.blocked_until && new Date(rl.blocked_until) > new Date()) {
    const mins = Math.ceil((new Date(rl.blocked_until) - Date.now()) / 60000);
    throw new Error(`Too many requests. Try again in ${mins} min.`);
  }

  const windowStart = new Date(Date.now() - windowSecs * 1000);
  if (rl && new Date(rl.window_start) < windowStart) return; // reset

  if (rl && rl.attempts >= max) {
    await supabaseAdmin
      .from('rate_limits')
      .update({ blocked_until: new Date(Date.now() + 30 * 60 * 1000).toISOString() })
      .eq('key', key);
    throw new Error(`Rate limited. Try again later.`);
  }
}

async function recordRateAttempt(key) {
  await supabaseAdmin.rpc('increment_rate_limit', { p_key: key });
}

// ✅ SIGNUP → SEND OTP
router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;

  try {
    await checkRateLimit(`signup:${email}`);

    // Check if user exists
    const { data: existing } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (existing) {
      return res.status(404).json({ error: "Account with this email already exists. Please login or use a different email." });
    }

    const hashed = await bcrypt.hash(password, 10);
    const otp = Math.floor(100000 + Math.random() * 900000);
    const expires = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000);

    // Insert new user
    const { error: userErr } = await supabaseAdmin
      .from('users')
      .insert({ name: name.trim(), email: email.toLowerCase().trim(), password_hash: hashed, type: "Signup" });

    if (userErr) throw userErr;

    // Insert new OTP
    const { error: otpErr } = await supabaseAdmin
      .from('otps')
      .insert({ email: email.toLowerCase().trim(), otp, expires_at: expires.toISOString(),type: "Signup-OTP" });

    if (otpErr) throw otpErr;

    await sendOTP(email, otp);
    await recordRateAttempt(`signup:${email}`);

    res.json({ message: "OTP sent" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ LOGIN - Validate credentials, then send OTP
router.post("/login", async (req, res) => {
  const { email, password } = req.body;
  
  try {
    await checkRateLimit(`login:${email}`, 5, 900); // 5 attempts/15min

    // Check if user exists first
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id, email, name, password_hash, last_login')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (userErr && userErr.code !== 'PGRST116') {
      throw userErr;
    }

    if (!user) {
      await recordRateAttempt(`login:${email}`);
      return res.status(401).json({ error: "User not registered. Please complete registration." });
    }

    // if (!user.email_confirmed_at) {
    //   return res.status(403).json({ error: "Email not confirmed. Please check your inbox." });
    // }

    const isValidPass = await bcrypt.compare(password, user.password_hash);
    if (!isValidPass) {
      await recordRateAttempt(`login:${email}`);
      return res.status(401).json({ error: "Incorrect email or password" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expires = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000);

    await supabaseAdmin.from('otps').delete().eq('email', email.toLowerCase().trim());

    const { error: otpErr } = await supabaseAdmin
      .from('otps')
      .insert({ email: email.toLowerCase().trim(), otp, expires_at: expires.toISOString(),type: "Login-OTP" });

    if (otpErr) throw otpErr;

    await sendOTP(email, otp);

    res.json({
      success: true,
      requiresOtp: true,
      message: "OTP sent",
      user: {
        id: user.id,
        email: user.email,
        name: user.name
      }
    });
  } catch (err) {
    console.error('[LOGIN ERROR]', err.message);
    res.status(500).json({ error: "Login server error. Please try again." });
  }
});

// ✅ RESEND OTP (NEW) - Validate user exists
router.post("/resend-otp", async (req, res) => {
  const { email } = req.body;

  try {
    await checkRateLimit(`resend:${email}`);

    // Check user exists
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (userErr || !user) {
      return res.status(404).json({ error: "User not registered. Please complete registration first." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expires = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000);

    // Upsert OTP (delete old)
    await supabaseAdmin.from('otps').delete().eq('email', email.toLowerCase().trim());
    const { error } = await supabaseAdmin
      .from('otps')
      .insert({ email: email.toLowerCase().trim(), otp, expires_at: expires.toISOString(),type: "Resend-OTP" });

    if (error) throw error;

    await sendOTP(email, otp);
    await recordRateAttempt(`resend:${email}`);

    res.json({ message: "New OTP sent" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ FORGOT PASSWORD - Check user exists before OTP
router.post("/forgot-password", async (req, res) => {
  const { email } = req.body;

  try {
    await checkRateLimit(`forgot:${email}`);

    // Check user exists
    const { data: user, error: userErr } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (userErr || !user) {
      return res.status(404).json({ error: "User not registered. Please complete the registration." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000);
    const expires = new Date(Date.now() + OTP_EXPIRES_MIN * 60 * 1000);

    // Upsert OTP (delete old)
    await supabaseAdmin.from('otps').delete().eq('email', email.toLowerCase().trim());
    const { error } = await supabaseAdmin
      .from('otps')
      .insert({ email: email.toLowerCase().trim(), otp, expires_at: expires.toISOString(),type: "Forget password-OTP" });

    if (error) throw error;

    await sendOTP(email, otp);
    await recordRateAttempt(`forgot:${email}`);

    res.json({ message: "Reset OTP sent" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ✅ VERIFY OTP
router.post("/verify-otp", async (req, res) => {
  const { email, otp, type } = req.body;
  const otpNum = parseInt(otp);

  try {
    const { data: otpRecord, error } = await supabaseAdmin
      .from('otps')
      .select('*')
      .eq('email', email.toLowerCase().trim())
      .gte('expires_at', new Date().toISOString())
      .single();

    if (error || !otpRecord || otpRecord.attempts >= MAX_OTP_ATTEMPTS) {
      return res.status(400).json({ error: "Invalid or expired OTP" });
    }

    if (otpRecord.otp === otpNum) {
      // Success: delete OTP
      await supabaseAdmin.from('otps').delete().eq('email', email.toLowerCase().trim());

      const { data: user } = await supabaseAdmin
        .from('users')
        .select('id, email, name')
        .eq('email', email.toLowerCase().trim())
        .single();

      if (type === "Login" && user?.id) {
        await supabaseAdmin
          .from('users')
          .update({ last_login: new Date().toISOString() })
          .eq('id', user.id);
      }

      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, {
        expiresIn: "7d"
      });

      return res.json({
        success: true,
        token,
        user: {
          id: user.id,
          email: user.email,
          name: user.name
        }
      });
    } else {
      // Fail: inc attempts
      await supabaseAdmin
        .from('otps')
        .update({ attempts: otpRecord.attempts + 1 })
        .eq('id', otpRecord.id);

      res.status(400).json({ error: "Invalid OTP" });
    }
  } catch (err) {
    res.status(400).json({ error: "Verification failed" });
  }
});

// ✅ GOOGLE LOGIN
router.get("/google",
  passport.authenticate("google", { scope: ["profile", "email"] })
);

router.get("/google/callback",
  passport.authenticate("google", { session: false }),
  (req, res) => {
    const token = jwt.sign(req.user, process.env.JWT_SECRET);

    res.redirect(`${process.env.FRONTEND_URL}?token=${token}`);
  }
  
);

export default router;
