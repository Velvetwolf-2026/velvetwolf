import { supabase } from './supabase';
import { apiUrl } from './api';

export async function updateProfile(userId, updates) {
  // Validate phone format
  if (updates.phone && !/^[6-9]\d{9}$/.test(updates.phone)) {
    throw new Error('Enter a valid 10-digit Indian mobile number');
  }

  const res = await fetch(apiUrl('/profile/update'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      id: userId,
      fullName: updates.fullName,
      phone: updates.phone,
      gender: updates.gender,
      dob: updates.dob
    })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to update profile');
  }

  return data.profile;
}


export async function getAddresses(userId) {
  const { data, error } = await supabase
    .from('addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false });
  if (error) throw error;
  return data;
}

export async function saveAddress(userId, address) {
  // Validate pincode
  if (!/^\d{6}$/.test(address.pincode)) throw new Error('Invalid pincode');

  if (address.is_default) {
    // Unset other defaults first
    await supabase.from('addresses').update({ is_default: false }).eq('user_id', userId);
  }

  const { data, error } = address.id
    ? await supabase.from('addresses').update({ ...address }).eq('id', address.id).select().single()
    : await supabase.from('addresses').insert({ ...address, user_id: userId }).select().single();

  if (error) throw error;
  return data;
}

export async function sendEmailUpdateOtp(newEmail) {
  const token = localStorage.getItem('token');
  const res = await fetch(apiUrl('/profile/email/send-otp'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ newEmail })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to send verification code.');
  }
  return data;
}

export async function verifyEmailUpdateOtp(newEmail, otp) {
  const token = localStorage.getItem('token');
  const res = await fetch(apiUrl('/profile/email/verify-otp'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ newEmail, otp })
  });

  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.error || 'Failed to verify verification code.');
  }
  return data;
}