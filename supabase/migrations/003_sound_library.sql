-- ============================================
-- SWANBLADE SOUND LIBRARY
-- ============================================
-- Stores generated sounds and user libraries

CREATE TABLE IF NOT EXISTS public.sounds (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  -- Owner
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- Sound metadata
  name TEXT NOT NULL,
  description TEXT,
  prompt TEXT NOT NULL,

  -- Audio file
  file_url TEXT NOT NULL,
  file_size INTEGER,
  duration_ms INTEGER,
  format TEXT DEFAULT 'mp3',

  -- Generation metadata
  provider TEXT, -- elevenlabs, fal, replicate, suno
  model TEXT,
  generation_params JSONB,

  -- Provenance (O8)
  provenance_hash TEXT,
  provenance_data JSONB,

  -- Organization
  tags TEXT[],
  palette TEXT, -- Which sound palette was used
  is_favorite BOOLEAN DEFAULT false,

  -- Game audio specific
  game_state JSONB, -- For game state engine
  is_adaptive BOOLEAN DEFAULT false,
  stems JSONB, -- Stem breakdown if available

  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sounds_user ON public.sounds(user_id);
CREATE INDEX IF NOT EXISTS idx_sounds_tags ON public.sounds USING GIN(tags);
CREATE INDEX IF NOT EXISTS idx_sounds_palette ON public.sounds(palette);
CREATE INDEX IF NOT EXISTS idx_sounds_created ON public.sounds(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sounds_favorite ON public.sounds(user_id, is_favorite) WHERE is_favorite = true;

-- Enable RLS
ALTER TABLE public.sounds ENABLE ROW LEVEL SECURITY;

-- Users can CRUD their own sounds
CREATE POLICY "Users can manage own sounds"
  ON public.sounds
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access"
  ON public.sounds
  FOR ALL
  USING (auth.role() = 'service_role');

-- Updated at trigger
DROP TRIGGER IF EXISTS sounds_updated_at ON public.sounds;
CREATE TRIGGER sounds_updated_at
  BEFORE UPDATE ON public.sounds
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- SOUND PALETTES
-- ============================================
-- User-created sound palettes

CREATE TABLE IF NOT EXISTS public.palettes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  name TEXT NOT NULL,
  description TEXT,

  -- Palette settings
  settings JSONB NOT NULL DEFAULT '{}',
  -- Example: { bass: 0.7, treble: 0.5, warmth: 0.6, energy: 0.8, genre: "electronic" }

  -- From Twin OS
  derived_from_twin_os BOOLEAN DEFAULT false,
  cross_modal_coherence NUMERIC,

  -- Usage stats
  use_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_palettes_user ON public.palettes(user_id);

-- Enable RLS
ALTER TABLE public.palettes ENABLE ROW LEVEL SECURITY;

-- Users can manage own palettes
CREATE POLICY "Users can manage own palettes"
  ON public.palettes
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Service role full access
CREATE POLICY "Service role full access"
  ON public.palettes
  FOR ALL
  USING (auth.role() = 'service_role');

-- Updated at trigger
DROP TRIGGER IF EXISTS palettes_updated_at ON public.palettes;
CREATE TRIGGER palettes_updated_at
  BEFORE UPDATE ON public.palettes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- ============================================
-- USAGE TRACKING
-- ============================================
-- Track generation usage for billing/limits

CREATE TABLE IF NOT EXISTS public.usage (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,

  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,

  -- What was used
  action TEXT NOT NULL, -- 'generation', 'export', 'stem_split'
  provider TEXT,
  model TEXT,

  -- Metrics
  duration_ms INTEGER,
  credits_used NUMERIC DEFAULT 0,

  -- Period
  period_start DATE NOT NULL DEFAULT CURRENT_DATE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_user_period ON public.usage(user_id, period_start);
CREATE INDEX IF NOT EXISTS idx_usage_action ON public.usage(action);

-- Enable RLS
ALTER TABLE public.usage ENABLE ROW LEVEL SECURITY;

-- Users can read own usage
CREATE POLICY "Users can read own usage"
  ON public.usage
  FOR SELECT
  USING (auth.uid() = user_id);

-- Insert only via service role (from API)
CREATE POLICY "Service role full access"
  ON public.usage
  FOR ALL
  USING (auth.role() = 'service_role');

-- ============================================
-- MONTHLY USAGE VIEW
-- ============================================

CREATE OR REPLACE VIEW public.monthly_usage AS
SELECT
  user_id,
  DATE_TRUNC('month', period_start) AS month,
  action,
  COUNT(*) AS count,
  SUM(credits_used) AS total_credits,
  SUM(duration_ms) AS total_duration_ms
FROM public.usage
GROUP BY user_id, DATE_TRUNC('month', period_start), action;
