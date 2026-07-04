import { apiUrl } from './api';

export async function updateProfile(userId, updates) {
  // Validate phone format
  if (updates.phone && !/^[6-9]\d{9}$/.test(updates.phone)) {
    throw new Error('Enter a valid 10-digit Indian mobile number');
  }

  const token = localStorage.getItem('token');
  const res = await fetch(apiUrl('/profile/update'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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