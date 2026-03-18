-- ============================================
-- SWANBLADE APPLICATIONS TABLE
-- ============================================
-- Stores membership applications for review

CREATE TABLE IF NOT EXISTS public.applications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Applicant info (may not have account yet)
  email TEXT NOT NULL,
  name TEXT NOT NULL,

  -- Application fields
  role TEXT NOT NULL,
  project TEXT NOT NULL,
  website TEXT,
  invite_code_used TEXT,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'waitlist')),

  -- Review
  reviewed_by UUID REFERENCES public.profiles(id),
  reviewed_at TIMESTAMPTZ,
  review_notes TEXT,

  -- If approved, link to profile
  profile_id UUID REFERENCES public.profiles(id),

  -- Priority (invite codes get higher priority)
  priority INTEGER DEFAULT 0,

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_applications_status ON public.applications(status);
CREATE INDEX IF NOT EXISTS idx_applications_email ON public.applications(email);
CREATE INDEX IF NOT EXISTS idx_applications_priority ON public.applications(priority DESC, created_at ASC);

-- Enable RLS
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

-- Users can read their own applications
CREATE POLICY "Users can read own applications"
  ON public.applications
  FOR SELECT
  USING (
    email = (SELECT email FROM auth.users WHERE id = auth.uid())
    OR profile_id = auth.uid()
  );

-- Anyone can insert (public application form)
CREATE POLICY "Anyone can apply"
  ON public.applications
  FOR INSERT
  WITH CHECK (true);

-- Service role full access (for admin/webhooks)
CREATE POLICY "Service role full access"
  ON public.applications
  FOR ALL
  USING (auth.role() = 'service_role');

-- Function to set priority based on invite code
CREATE OR REPLACE FUNCTION public.set_application_priority()
RETURNS TRIGGER AS $$
BEGIN
  -- If valid invite code used, boost priority
  IF NEW.invite_code_used IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.profiles
      WHERE invite_code = NEW.invite_code_used
      AND invites_remaining > 0
    ) THEN
      NEW.priority := 100;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for priority
DROP TRIGGER IF EXISTS set_application_priority_trigger ON public.applications;
CREATE TRIGGER set_application_priority_trigger
  BEFORE INSERT ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.set_application_priority();

-- Updated at trigger
DROP TRIGGER IF EXISTS applications_updated_at ON public.applications;
CREATE TRIGGER applications_updated_at
  BEFORE UPDATE ON public.applications
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();
