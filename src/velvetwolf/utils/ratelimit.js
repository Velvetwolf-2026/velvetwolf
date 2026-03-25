import { supabase } from './supabase';

/**
 * checkRateLimit — throws if limit exceeded
 * @param key       e.g. 'login:user@email.com'
 * @param maxAttempts  max allowed in window
 * @param windowSecs   rolling window in seconds
 */
export async function checkRateLimit(key, maxAttempts = 5, windowSecs = 900) {
  const { data } = await supabase
    .from('rate_limits')
    .select('*')
    .eq('key', key)
    .single();

  if (!data) return; // first attempt — allow

  // Check if blocked
  if (data.blocked_until && new Date(data.blocked_until) > new Date()) {
    const mins = Math.ceil((new Date(data.blocked_until) - new Date()) / 60000);
    throw new Error(`Too many attempts. Try again in ${mins} minutes.`);
  }

  // Check if window has reset
  const windowStart = new Date(Date.now() - windowSecs * 1000);
  if (new Date(data.first_at) < windowStart) return; // window expired, reset

  if (data.attempts >= maxAttempts) {
    // Block for 30 minutes
    await supabase.from('rate_limits').update({
      blocked_until: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    }).eq('key', key);
    throw new Error('Too many attempts. Blocked for 30 minutes.');
  }
}

export async function recordAttempt(key) {
  await supabase.rpc('increment_rate_limit', { p_key: key });
}

export async function clearRateLimit(key) {
  await supabase.from('rate_limits').delete().eq('key', key);
}