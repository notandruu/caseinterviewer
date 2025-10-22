-- ============================================================================
-- Compact CaseCard/LineCard Structure
-- ============================================================================
-- This migration creates a turn-based case interview system where:
-- - CaseCard: Compact JSON passed each turn (case metadata, variables, section)
-- - LineCard: Current interviewer line with expectations and next preview
-- ============================================================================

BEGIN;

-- Drop existing structure if migrating from old schema
DROP TABLE IF EXISTS public.case_events CASCADE;
DROP TABLE IF EXISTS public.case_attempts CASCADE;
DROP TABLE IF EXISTS public.cases CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;

-- ============================================================================
-- User Profiles
-- ============================================================================
CREATE TABLE public.user_profiles (
  user_id UUID PRIMARY KEY,
  name TEXT,
  email TEXT,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for user_profiles
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile"
  ON public.user_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON public.user_profiles FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON public.user_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================================================
-- Cases Table (Compact Structure)
-- ============================================================================
CREATE TABLE public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Metadata
  title TEXT NOT NULL,
  case_type TEXT NOT NULL, -- e.g., "Market Sizing", "Market Entry", "Profitability"
  objective TEXT NOT NULL, -- e.g., "Go/No-Go by Q4; breakeven by 2028"
  firm TEXT,
  industry TEXT,
  difficulty_level INTEGER CHECK (difficulty_level BETWEEN 1 AND 5),

  -- Case variables (passed in CaseCard)
  vars JSONB DEFAULT '{}'::jsonb,
  -- Example: {"market_growth_pct": 0.07, "avg_field_area_sqft": 80000, "price_per_sqft_usd": 6.0}

  -- Sections and lines (turn-based flow)
  sections JSONB NOT NULL,
  -- Example: [
  --   {"key": "opening", "name": "Opening", "lines": ["l_1", "l_2"]},
  --   {"key": "market_sizing", "name": "Market Sizing", "lines": ["l_3", "l_4", "l_5"]}
  -- ]

  -- Line definitions (LineCards)
  lines JSONB NOT NULL,
  -- Example: {
  --   "l_1": {
  --     "speaker": "interviewer",
  --     "text": "Could you estimate the TAM for artificial turf?",
  --     "expects_response": true,
  --     "response_type": "estimate",
  --     "evaluation_focus": ["structure", "units"],
  --     "next_preview": ["Assume market growth is {{market_growth_pct}}."]
  --   }
  -- }

  -- Exhibits (charts, slides, data)
  exhibits JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"id": "ex_1", "label": "Cover Slide", "storage_path": "cases/turf/slide1.png", "caption": "..."},
  --   {"id": "ex_2", "label": "Market Data", "storage_path": "cases/turf/slide2.png", "caption": "..."}
  -- ]

  -- Ground truth (NEVER exposed to AI)
  ground_truth JSONB,
  -- Example: {"calculations": {"tam_usd": 480000000}, "framework_components": ["Market", "Competition"]}

  -- Settings
  published BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for cases
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published cases are readable by all"
  ON public.cases FOR SELECT
  USING (published = TRUE);

CREATE POLICY "All cases are readable by authenticated users"
  ON public.cases FOR SELECT
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- Case Attempts
-- ============================================================================
CREATE TABLE public.case_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,

  -- Progress tracking
  current_section TEXT NOT NULL DEFAULT 'opening',
  current_line_id TEXT,

  -- Turn history (minimal transcript)
  turns JSONB DEFAULT '[]'::jsonb,
  -- Example: [
  --   {"speaker": "interviewer", "line_id": "l_1", "timestamp": "2025-01-01T12:00:00Z"},
  --   {"speaker": "candidate", "summary": "Structured approach, mentioned TAM", "tags": ["good_structure"], "timestamp": "2025-01-01T12:00:30Z"}
  -- ]

  -- Hints used
  hints_used JSONB DEFAULT '[]'::jsonb,
  -- Example: [{"section": "market_sizing", "tier": 1, "timestamp": "..."}]

  -- Scores by section
  scores JSONB DEFAULT '{}'::jsonb,
  -- Example: {"market_sizing": {"quantitative": 8, "structure": 7, "passed": true}}

  -- State
  state TEXT DEFAULT 'in_progress' CHECK (state IN ('in_progress', 'completed', 'abandoned')),
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for case_attempts
ALTER TABLE public.case_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own attempts"
  ON public.case_attempts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own attempts"
  ON public.case_attempts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own attempts"
  ON public.case_attempts FOR UPDATE
  USING (auth.uid() = user_id);

-- ============================================================================
-- Indexes
-- ============================================================================
CREATE INDEX idx_case_attempts_user_id ON public.case_attempts(user_id);
CREATE INDEX idx_case_attempts_case_id ON public.case_attempts(case_id);
CREATE INDEX idx_case_attempts_state ON public.case_attempts(state);

-- ============================================================================
-- Functions
-- ============================================================================

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cases_updated_at
  BEFORE UPDATE ON public.cases
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_case_attempts_updated_at
  BEFORE UPDATE ON public.case_attempts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

CREATE TRIGGER update_user_profiles_updated_at
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

COMMIT;
