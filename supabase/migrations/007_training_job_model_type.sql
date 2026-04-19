-- Add model_type column to training_jobs
-- Values: 'lora' (Stable Audio LoRA fine-tuning) or 'rave' (RAVE catalog training)

ALTER TABLE public.training_jobs
  ADD COLUMN IF NOT EXISTS model_type TEXT DEFAULT 'lora'
    CHECK (model_type IN ('lora', 'rave'));
