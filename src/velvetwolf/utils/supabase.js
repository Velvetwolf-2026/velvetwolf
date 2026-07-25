import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || "";
const SUPABASE_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY || "";

export const supabase = (SUPABASE_URL && SUPABASE_ANON)
  ? createClient(SUPABASE_URL, SUPABASE_ANON, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Gets the public URL for a logo or image stored in the "logos" folder of the Supabase bucket.
 * @param {string} localPath - The local path of the image (e.g. '/vw-logo.png' or '/LOGOS/CAR BRAND LOGOS/Benz.png').
 * @returns {string} The public Supabase URL for the image.
 */
export function getSupabaseLogoUrl(localPath) {
  if (!localPath) return "";
  if (!supabase) return localPath;
  // Extract filename directly by stripping any folder path
  const filename = localPath.split('/').filter(Boolean).pop();
  
  // Target the "Logo/" folder inside the "product-images" bucket directly
  const finalPath = `Logo/${filename}`;
  
  const { data } = supabase.storage.from("product-images").getPublicUrl(finalPath);
  return data?.publicUrl || localPath;
}