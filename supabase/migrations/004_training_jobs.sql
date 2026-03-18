-- Training Jobs: tracks LoRA training sessions with encrypted audio upload
-- Audio is encrypted client-side (AES-256-GCM), uploaded, used for training, then deleted.

CREATE TABLE IF NOT EXISTS public.training_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Job status
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'encrypting', 'uploading', 'training', 'completed', 'failed', 'cancelled')),

  -- File info
  file_count INT NOT NULL DEFAULT 0,
  total_size_bytes BIGINT DEFAULT 0,

  -- Data protection
  consent_timestamp TIMESTAMPTZ NOT NULL,
  data_protection_enabled BOOLEAN NOT NULL DEFAULT true,

  -- Training output
  lora_model_url TEXT,
  training_config JSONB DEFAULT '{}',
  training_log TEXT,

  -- Audit: confirms audio was deleted after training
  audio_deleted_at TIMESTAMPTZ,

  -- Error info
  error_message TEXT,

  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_training_job_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER training_jobs_updated_at
  BEFORE UPDATE ON public.training_jobs
  FOR EACH ROW
  EXECUTE FUNCTION update_training_job_timestamp();

-- RLS: users can only see their own training jobs
ALTER TABLE public.training_jobs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own training jobs"
  ON public.training_jobs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own training jobs"
  ON public.training_jobs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own training jobs"
  ON public.training_jobs FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role has full access (for API routes)
CREATE POLICY "Service role full access to training jobs"
  ON public.training_jobs FOR ALL
  USING (auth.role() = 'service_role');

-- Index for user queries
CREATE INDEX idx_training_jobs_user ON public.training_jobs(user_id, created_at DESC);
CREATE INDEX idx_training_jobs_status ON public.training_jobs(status);
