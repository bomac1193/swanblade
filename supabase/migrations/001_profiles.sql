-- ============================================
-- SWANBLADE PROFILES TABLE
-- ============================================
-- Run this in Supabase SQL Editor or via CLI

-- Create profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,

  -- Basic info
  name TEXT,
  avatar_url TEXT,

  -- Membership
  membership_tier TEXT DEFAULT 'pending' CHECK (membership_tier IN ('pending', 'professional', 'studio', 'enterprise')),
  membership_status TEXT DEFAULT 'pending' CHECK (membership_status IN ('pending', 'active', 'cancelled', 'past_due')),

  -- Stripe
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT,

  -- Invite system
  invite_code TEXT UNIQUE,
  invited_by UUID REFERENCES public.profiles(id),
  invites_remaining INTEGER DEFAULT 0,

  -- Application
  application_status TEXT DEFAULT 'none' CHECK (application_status IN ('none', 'pending', 'approved', 'rejected')),
  application_data JSONB,
  applied_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_profiles_stripe_customer ON public.profiles(stripe_customer_id);
CREATE INDEX IF NOT EXISTS idx_profiles_invite_code ON public.profiles(invite_code);
CREATE INDEX IF NOT EXISTS idx_profiles_membership ON public.profiles(membership_tier, membership_status);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles
  FOR SELECT
  USING (auth.uid() = id);

-- Users can update their own profile (limited fields)
CREATE POLICY "Users can update own profile"
  ON public.profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Service role can do anything (for webhooks)
CREATE POLICY "Service role full access"
  ON public.profiles
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, avatar_url)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.raw_user_meta_data->>'avatar_url'
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to create profile on signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS profiles_updated_at ON public.profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- INVITE CODES
-- ============================================

-- Function to generate invite code
CREATE OR REPLACE FUNCTION public.generate_invite_code()
RETURNS TEXT AS $$
DECLARE
  code TEXT;
  exists_check BOOLEAN;
BEGIN
  LOOP
    -- Generate code: SB-XXXX-XXXX
    code := 'SB-' ||
            upper(substr(md5(random()::text), 1, 4)) || '-' ||
            upper(substr(md5(random()::text), 1, 4));

    -- Check if exists
    SELECT EXISTS(SELECT 1 FROM public.profiles WHERE invite_code = code) INTO exists_check;

    EXIT WHEN NOT exists_check;
  END LOOP;

  RETURN code;
END;
$$ LANGUAGE plpgsql;

-- Function to assign invite code when membership is activated
CREATE OR REPLACE FUNCTION public.assign_invite_code()
RETURNS TRIGGER AS $$
BEGIN
  -- When membership becomes active and no invite code exists
  IF NEW.membership_status = 'active' AND NEW.invite_code IS NULL THEN
    NEW.invite_code := public.generate_invite_code();

    -- Professional gets 2 invites, Studio gets 5, Enterprise gets unlimited (100)
    NEW.invites_remaining := CASE NEW.membership_tier
      WHEN 'professional' THEN 2
      WHEN 'studio' THEN 5
      WHEN 'enterprise' THEN 100
      ELSE 0
    END;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to assign invite code
DROP TRIGGER IF EXISTS assign_invite_code_trigger ON public.profiles;
CREATE TRIGGER assign_invite_code_trigger
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_invite_code();
