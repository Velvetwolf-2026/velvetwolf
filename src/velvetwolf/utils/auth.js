import { supabase } from './supabase';
import { checkRateLimit, recordAttempt } from './ratelimit';
import { apiUrl } from './api';

function createControlledError(error, fallbackMessage) {
  return new Error(error?.message || fallbackMessage);
}

// SIGNUP WITH OTP
// Call in Signup.jsx -> handleSubmitDetails()
export async function signUpWithOtp(email, password, fullName) {
  try {
    await checkRateLimit(`signup:${email}`, 5, 3600);

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: `${window.location.origin}/`,
      },
    });

    if (error) {
      await recordAttempt(`signup:${email}`);
      throw createControlledError(error, 'Failed to create account');
    }

    return data;
  } catch (err) {
    console.error('SIGNUP ERROR:', err);
    throw createControlledError(err, 'Failed to create account');
  }
}

// VERIFY OTP (email confirmation)
// Call in Signup.jsx -> handleVerifyOtp()
export async function verifyOtp(email, token) {
  try {
    await checkRateLimit(`otp:${email}`, 10, 600);

    const { data, error } = await supabase.auth.verifyOtp({
      email,
      token,
      type: 'signup',
    });

    if (error) {
      await recordAttempt(`otp:${email}`);
      throw createControlledError(error, 'Verification failed');
    }

    return data.user;
  } catch (err) {
    console.error('VERIFY OTP ERROR:', err);
    throw createControlledError(err, 'Verification failed');
  }
}

// SIGN IN WITH PASSWORD
// Call in Login.jsx -> handleLogin()
export async function signIn(email, password) {
  try {
    await checkRateLimit(`login:${email}`, 5, 900);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      await recordAttempt(`login:${email}`);
      throw createControlledError(error, 'Invalid login credentials');
    }

    const profile = await getProfile(data.user.id) || {};

    return {
      user: {
        ...data.user,
        ...profile,
        role: profile?.role || 'customer',
        isAdmin: (profile?.role || 'customer') === 'admin',
      },
    };
  } catch (err) {
    console.error('SIGNIN ERROR:', err);
    throw createControlledError(err, 'Login failed');
  }
}

// GOOGLE OAUTH
// Call in Login.jsx -> handleGoogle()
export async function signInWithGoogle() {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/` },
    });

    if (error) {
      throw createControlledError(error, 'Google sign-in failed');
    }

    return data;
  } catch (err) {
    console.error('GOOGLE SIGNIN ERROR:', err);
    throw createControlledError(err, 'Google sign-in failed');
  }
}

// FORGOT PASSWORD - SEND OTP
// Call in ForgetPassword.jsx -> handleRequestOtp()
export async function sendPasswordResetOtp(email) {
  try {
    await checkRateLimit(`reset:${email}`, 3, 3600);

    const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/`,
    });

    if (error) {
      await recordAttempt(`reset:${email}`);
      throw createControlledError(error, 'Failed to send reset code');
    }

    return data;
  } catch (err) {
    console.error('RESET OTP ERROR:', err);
    throw createControlledError(err, 'Failed to send reset code');
  }
}

// VERIFY RESET OTP + SET NEW PASSWORD
// Call in ForgetPassword.jsx -> handleReset() after OTP verify
export async function resetPassword(newPassword) {
  try {
    const { data, error } = await supabase.auth.updateUser({ password: newPassword });

    if (error) {
      throw createControlledError(error, 'Password reset failed');
    }

    return data;
  } catch (err) {
    console.error('RESET PASSWORD ERROR:', err);
    throw createControlledError(err, 'Password reset failed');
  }
}

// SIGN OUT
export async function signOut() {
  try {
    const { error } = await supabase.auth.signOut();

    if (error) {
      throw createControlledError(error, 'Sign out failed');
    }
  } catch (err) {
    console.error('SIGNOUT ERROR:', err);
    throw createControlledError(err, 'Sign out failed');
  }
}

// GET PROFILE
export async function getProfile(userId) {
  try {
    const res = await fetch(`${apiUrl('/profile')}?id=${encodeURIComponent(userId)}`);
    const payload = await res.json();

    if (!res.ok) {
      throw createControlledError(payload, 'Failed to load profile');
    }

    return payload.profile || null;
  } catch (err) {
    console.error('GET PROFILE ERROR:', err);
    throw createControlledError(err, 'Failed to load profile');
  }
}
