-- Store source file metadata so users can see what trained each LoRA.
-- Only metadata (name, size, duration) — NOT the actual audio.

ALTER TABLE public.training_jobs
  ADD COLUMN IF NOT EXISTS source_files JSONB DEFAULT '[]';

-- source_files format:
-- [
--   { "name": "kick_303.wav", "size": 1234567, "mime_type": "audio/wav" },
--   { "name": "pad_ambient.mp3", "size": 4567890, "mime_type": "audio/mpeg" }
-- ]
