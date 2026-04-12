-- Migration: Add is_verified column to public.users
-- Purpose: Track whether a user has successfully completed signup (OTP verified).
--          Prevents "user already exists" errors for users who started but never
--          finished the signup flow.
--
-- Run this in your Supabase SQL editor before deploying the backend changes.

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT FALSE;

-- Mark all existing users (pre-migration) as verified so they are not affected.
UPDATE public.users
  SET is_verified = TRUE
  WHERE is_verified = FALSE;
