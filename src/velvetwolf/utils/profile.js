import { supabase } from './supabase';

export async function updateProfile(userId, updates) {
  // Validate phone format
  if (updates.phone && !/^[6-9]\d{9}$/.test(updates.phone)) {
    throw new Error('Enter a valid 10-digit Indian mobile number');
  }

  const { data, error } = await supabase
    .from('profiles')
    .upsert({
      id:            userId,
      full_name:     updates.fullName,
      phone:         updates.phone,
      gender:        updates.gender,
      date_of_birth: updates.dob,
      updated_at:    new Date().toISOString(),
    }, { onConflict: 'id' })
    .select()
    .single();

  if (error) throw error;
  return data;
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