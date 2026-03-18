-- Add model_name and model_description to training_jobs
-- Lets users name their Sound Worlds instead of "Model abc123de"

ALTER TABLE public.training_jobs
  ADD COLUMN IF NOT EXISTS model_name TEXT,
  ADD COLUMN IF NOT EXISTS model_description TEXT;
