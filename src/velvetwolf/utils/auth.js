import { supabase } from './supabase';
import { checkRateLimit, recordAttempt } from './ratelimit';

const ADMIN_EMAIL = 'velvetwolfofficial@gmail.com';

// ── SIGNUP WITH OTP ──────────────────────────────────────
// Call in Signup.jsx → handleSubmitDetails()
export async function signUpWithOtp(email, password, fullName) {
  await checkRateLimit(`signup:${email}`, 5, 3600); // 5 attempts/hr

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { full_name: fullName },
      emailRedirectTo: `${window.location.origin}/`,
    },
  });
  if (error) throw error;
  return data; // user is unconfirmed until OTP verified
}

// ── VERIFY OTP (email confirmation) ─────────────────────
// Call in Signup.jsx → handleVerifyOtp()
export async function verifyOtp(email, token) {
  await checkRateLimit(`otp:${email}`, 10, 600); // 10 attempts/10 min

  const { data, error } = await supabase.auth.verifyOtp({
    email,
    token,
    type: 'signup',
  });
  if (error) throw error;
  return data.user;
}

// ── SIGN IN WITH PASSWORD ────────────────────────────────
// Call in Login.jsx → handleLogin()
export async function signIn(email, password) {
  await checkRateLimit(`login:${email}`, 5, 900); // 5 attempts/15 min

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) { await recordAttempt(`login:${email}`); throw error; }

  const profile = await getProfile(data.user.id);
  return { ...data.user, ...profile, isAdmin: profile.is_admin };
}

// ── GOOGLE OAUTH ─────────────────────────────────────────
// Call in Login.jsx → handleGoogle()
export async function signInWithGoogle() {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: `${window.location.origin}/` },
  });
  if (error) throw error;
  // Supabase redirects to Google → back to your site → session auto-set
}

// ── FORGOT PASSWORD — SEND OTP ───────────────────────────
// Call in ForgetPassword.jsx → handleRequestOtp()
export async function sendPasswordResetOtp(email) {
  await checkRateLimit(`reset:${email}`, 3, 3600); // 3 attempts/hr
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/`,
  });
  if (error) throw error;
}

// ── VERIFY RESET OTP + SET NEW PASSWORD ──────────────────
// Call in ForgetPassword.jsx → handleReset() after OTP verify
export async function resetPassword(newPassword) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

// ── SIGN OUT ─────────────────────────────────────────────
export async function signOut() {
  await supabase.auth.signOut();
}

// ── GET PROFILE ──────────────────────────────────────────
export async function getProfile(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();
  if (error) throw error;
  return data;
}