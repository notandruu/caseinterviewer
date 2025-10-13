-- ============================================================================
-- CASE INTERVIEWER - COMPLETE FRESH START MIGRATION
-- Run this in Supabase SQL Editor to reset everything and start clean
-- ============================================================================
-- This migration includes:
-- - Cases table with Voice V2 structure
-- - User profiles for onboarding (Echo auth)
-- - Interviews table for Echo authenticated sessions
-- - Case attempts and events for tracking
-- - All RLS policies
-- - Air Panama seed case
-- ============================================================================

-- ============================================================================
-- STEP 1: Drop ALL existing tables
-- ============================================================================

DROP TABLE IF EXISTS public.case_events CASCADE;
DROP TABLE IF EXISTS public.case_attempts CASCADE;
DROP TABLE IF EXISTS public.interviews CASCADE;
DROP TABLE IF EXISTS public.user_profiles CASCADE;
DROP TABLE IF EXISTS public.cases CASCADE;

-- Drop existing functions
DROP FUNCTION IF EXISTS public.set_updated_at() CASCADE;
DROP FUNCTION IF EXISTS public.update_updated_at_column() CASCADE;
DROP FUNCTION IF EXISTS public.get_next_section(text) CASCADE;

-- ============================================================================
-- STEP 2: Create helper functions
-- ============================================================================

-- Updated at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Section progression helper
CREATE OR REPLACE FUNCTION public.get_next_section(p_current_section text)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_section_order text[] := ARRAY['introduction', 'framework', 'analysis', 'synthesis'];
  v_current_index int;
BEGIN
  SELECT array_position(v_section_order, p_current_section) INTO v_current_index;
  IF v_current_index IS NULL OR v_current_index >= array_length(v_section_order, 1) THEN
    RETURN NULL;
  END IF;
  RETURN v_section_order[v_current_index + 1];
END;
$$;

-- ============================================================================
-- STEP 3: Create cases table (Voice V2 structure)
-- ============================================================================

CREATE TABLE public.cases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Basic info
  title text NOT NULL,
  firm text,
  industry text,
  difficulty_level int CHECK (difficulty_level BETWEEN 1 AND 5) DEFAULT 3,
  version int NOT NULL DEFAULT 1,
  language text DEFAULT 'en',
  summary text,

  -- Framework and evaluation
  expected_framework text,
  expected_answer_summary text,
  key_insights jsonb DEFAULT '[]'::jsonb,

  -- Case data and truth
  data_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  ground_truth jsonb,
  constraints jsonb,

  -- Structured sections (CRITICAL FOR VOICE V2)
  sections jsonb NOT NULL DEFAULT '[]'::jsonb,

  -- Evaluation
  evaluation_rubric jsonb,

  -- Metadata
  created_by uuid,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  published boolean DEFAULT false,

  -- Disclosure rules
  disclosure_rules jsonb DEFAULT jsonb_build_object(
    'expected_answer_visibility', 'staff_only',
    'hints_policy', 'tiered',
    'ground_truth_exposure', 'never_to_ai'
  ),

  -- Full-text search
  search_vector tsvector GENERATED ALWAYS AS (
    setweight(to_tsvector('english', coalesce(title,'')), 'A') ||
    setweight(to_tsvector('english', coalesce(summary,'')), 'B') ||
    setweight(to_tsvector('english', coalesce(industry,'')), 'C')
  ) STORED
);

-- Indexes for cases
CREATE INDEX cases_search_idx ON public.cases USING gin(search_vector);
CREATE INDEX cases_published_idx ON public.cases(published) WHERE published = true;
CREATE INDEX cases_firm_idx ON public.cases(firm);
CREATE INDEX cases_difficulty_idx ON public.cases(difficulty_level);

-- Trigger for cases
CREATE TRIGGER update_cases_modtime
BEFORE UPDATE ON public.cases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comments
COMMENT ON TABLE public.cases IS 'Voice V2 case interview definitions with structured sections';
COMMENT ON COLUMN public.cases.sections IS 'Array of {name, goal, prompt, time_limit_sec, hints[], rubric}';

-- ============================================================================
-- STEP 4: Create user_profiles table (for onboarding with Echo auth)
-- ============================================================================

CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL UNIQUE,
  name text,
  referral_source text,
  target_firm text,
  experience_level text,
  primary_goal text,
  onboarding_completed boolean DEFAULT false,
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for user_profiles
CREATE INDEX idx_user_profiles_user_id ON public.user_profiles(user_id);

-- Trigger for user_profiles
CREATE TRIGGER update_user_profiles_updated_at
BEFORE UPDATE ON public.user_profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comment
COMMENT ON TABLE public.user_profiles IS 'User profiles and onboarding data for Echo authenticated users';

-- ============================================================================
-- STEP 5: Create interviews table (for Echo authenticated sessions)
-- ============================================================================

CREATE TABLE public.interviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id text NOT NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,
  status text DEFAULT 'in-progress' CHECK (status IN ('in-progress', 'completed', 'abandoned')),
  transcript jsonb DEFAULT '[]'::jsonb,
  duration integer,
  score numeric,
  feedback text,
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for interviews
CREATE INDEX idx_interviews_user_id ON public.interviews(user_id);
CREATE INDEX idx_interviews_case_id ON public.interviews(case_id);
CREATE INDEX idx_interviews_status ON public.interviews(status);
CREATE INDEX idx_interviews_user_case ON public.interviews(user_id, case_id);

-- Trigger for interviews
CREATE TRIGGER update_interviews_updated_at
BEFORE UPDATE ON public.interviews
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comment
COMMENT ON TABLE public.interviews IS 'Interview sessions for Echo authenticated users';

-- ============================================================================
-- STEP 6: Create case_attempts table (alternative tracking system)
-- ============================================================================

CREATE TABLE public.case_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  case_id uuid REFERENCES public.cases(id) ON DELETE CASCADE,

  -- Timing
  started_at timestamptz DEFAULT now(),
  completed_at timestamptz,

  -- Progress
  current_section text DEFAULT 'introduction',

  -- Scoring
  total_score numeric,
  rubric_scores jsonb DEFAULT '{}'::jsonb,

  -- History
  transcript jsonb DEFAULT '[]'::jsonb,
  hints_used jsonb DEFAULT '[]'::jsonb,

  -- State
  state text DEFAULT 'in_progress' CHECK (state IN ('in_progress', 'completed', 'abandoned')),

  -- Metadata
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for case_attempts
CREATE INDEX case_attempts_user_idx ON public.case_attempts(user_id);
CREATE INDEX case_attempts_case_idx ON public.case_attempts(case_id);
CREATE INDEX case_attempts_state_idx ON public.case_attempts(state);
CREATE INDEX case_attempts_user_case_idx ON public.case_attempts(user_id, case_id);

-- Trigger for case_attempts
CREATE TRIGGER update_case_attempts_modtime
BEFORE UPDATE ON public.case_attempts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Comment
COMMENT ON TABLE public.case_attempts IS 'User progress through voice interviews (UUID-based users)';

-- ============================================================================
-- STEP 7: Create case_events table (audit log)
-- ============================================================================

CREATE TABLE public.case_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  attempt_id uuid REFERENCES public.case_attempts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

-- Indexes for case_events
CREATE INDEX case_events_attempt_idx ON public.case_events(attempt_id);
CREATE INDEX case_events_type_idx ON public.case_events(event_type);
CREATE INDEX case_events_created_idx ON public.case_events(created_at DESC);

-- Comment
COMMENT ON TABLE public.case_events IS 'Audit log for voice interview actions';

-- ============================================================================
-- STEP 8: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_attempts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_events ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 9: Create RLS Policies
-- ============================================================================

-- Cases: Everyone can read published cases
CREATE POLICY "Anyone can read published cases"
ON public.cases FOR SELECT
USING (published = true);

-- Cases: Authenticated users can create cases
CREATE POLICY "Authenticated users can create cases"
ON public.cases FOR INSERT
WITH CHECK (auth.uid() = created_by);

-- Cases: Creators can update their own cases
CREATE POLICY "Creators can update own cases"
ON public.cases FOR UPDATE
USING (auth.uid() = created_by);

-- User Profiles: Permissive policies for Echo auth
CREATE POLICY "Users can view profiles"
ON public.user_profiles FOR SELECT
USING (true);

CREATE POLICY "Users can insert profiles"
ON public.user_profiles FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update profiles"
ON public.user_profiles FOR UPDATE
USING (true);

-- Interviews: Permissive policies for Echo auth
CREATE POLICY "Users can view interviews"
ON public.interviews FOR SELECT
USING (true);

CREATE POLICY "Users can insert interviews"
ON public.interviews FOR INSERT
WITH CHECK (true);

CREATE POLICY "Users can update interviews"
ON public.interviews FOR UPDATE
USING (true);

-- Case Attempts: Users can manage their own attempts
CREATE POLICY "Users manage own attempts"
ON public.case_attempts FOR ALL
USING (auth.uid() = user_id);

-- Case Attempts: Case creators can read attempts on their cases
CREATE POLICY "Case creators read attempts"
ON public.case_attempts FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.cases
    WHERE cases.id = case_attempts.case_id
    AND cases.created_by = auth.uid()
  )
);

-- Case Events: Users can read events for their attempts
CREATE POLICY "Users read own events"
ON public.case_events FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.case_attempts
    WHERE case_attempts.id = case_events.attempt_id
    AND case_attempts.user_id = auth.uid()
  )
);

-- Case Events: Users can insert events for their attempts
CREATE POLICY "Users insert own events"
ON public.case_events FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.case_attempts
    WHERE case_attempts.id = case_events.attempt_id
    AND case_attempts.user_id = auth.uid()
  )
);

-- ============================================================================
-- STEP 10: Seed Air Panama Case
-- ============================================================================

INSERT INTO public.cases (
  title,
  firm,
  industry,
  difficulty_level,
  summary,
  expected_framework,
  expected_answer_summary,
  key_insights,
  data_json,
  ground_truth,
  sections,
  evaluation_rubric,
  published
) VALUES (
  'Air Panama Revenue Growth',
  'McKinsey',
  'Aviation',
  3,
  'Help Air Panama, the second-largest airline in Latin America, grow revenue amid increased competition from low-cost carriers.',
  'Profitability → Revenue → Volume/Pricing → Network Optimization',
  'Recommend shifting capacity from underutilized Mango route (60% capacity, $500 tickets) to high-yield NYC route (80% capacity, $700 tickets). This improves revenue by $52K per flight ($112K NYC vs $60K Mango). Net daily improvement: +$44K after canceling 2 Mango flights.',
  jsonb_build_array(
    'Utilization gap drives profit variance: NYC at 80% vs Mango at 60%',
    'High fixed costs favor fuller aircraft on premium routes',
    'Price elasticity differs by market: North America less elastic than Latin America',
    'Network optimization must consider fleet constraints and slot availability'
  ),
  jsonb_build_object(
    'aircraft', jsonb_build_object(
      'capacity', 200,
      'operating_cost_per_flight', 40000,
      'fleet_size', 25,
      'utilization_target', 0.75
    ),
    'routes', jsonb_build_object(
      'mango', jsonb_build_object(
        'current_flights_per_day', 2,
        'utilization', 0.6,
        'ticket_price', 500,
        'market_size_pax_per_day', 500,
        'distance_miles', 800
      ),
      'nyc', jsonb_build_object(
        'current_flights_per_day', 0,
        'proposed_flights_per_day', 3,
        'utilization', 0.8,
        'ticket_price', 700,
        'market_size_pax_per_day', 1000,
        'distance_miles', 2500
      )
    ),
    'competitors', jsonb_build_object(
      'low_cost_carriers', jsonb_build_array(
        jsonb_build_object('name', 'LatAmAir', 'market_share', 0.25, 'avg_ticket_price', 350),
        jsonb_build_object('name', 'SouthJet', 'market_share', 0.15, 'avg_ticket_price', 400)
      )
    ),
    'financials', jsonb_build_object(
      'annual_revenue', 500000000,
      'yoy_growth', -0.08,
      'operating_margin', 0.12
    )
  ),
  jsonb_build_object(
    'calculations', jsonb_build_object(
      'mango_revenue_per_flight', 60000,
      'mango_daily_revenue', 120000,
      'nyc_revenue_per_flight', 112000,
      'nyc_daily_revenue', 336000,
      'revenue_delta_per_flight', 52000,
      'net_daily_improvement', 44000
    ),
    'framework_components', jsonb_build_array(
      'Revenue',
      'Costs',
      'Volume',
      'Price',
      'Utilization',
      'Market segmentation'
    )
  ),
  jsonb_build_array(
    jsonb_build_object(
      'name', 'introduction',
      'goal', 'Understand the case context and ask clarifying questions',
      'prompt', 'Your client is Air Panama, the second-largest airline in Latin America. They''ve been losing market share to low-cost carriers over the past 3 years. Revenue has declined 8% year-over-year, and the CEO has asked for help developing a revenue growth strategy. What would you like to know about the situation?',
      'time_limit_sec', 300,
      'hints', jsonb_build_array(
        jsonb_build_object('tier', 1, 'text', 'Consider asking about the competitive landscape, customer segments, and current route network.'),
        jsonb_build_object('tier', 2, 'text', 'It may help to understand which specific routes or markets are underperforming.')
      ),
      'rubric', jsonb_build_object(
        'criteria', jsonb_build_array(
          jsonb_build_object('dimension', 'question_quality', 'weight', 0.4, 'description', 'Asked relevant, structured questions'),
          jsonb_build_object('dimension', 'listening', 'weight', 0.3, 'description', 'Absorbed information and built on it'),
          jsonb_build_object('dimension', 'structure', 'weight', 0.3, 'description', 'Organized inquiry logically')
        ),
        'passing_score', 60
      )
    ),
    jsonb_build_object(
      'name', 'framework',
      'goal', 'Develop a structured approach to analyzing the revenue growth opportunity',
      'prompt', 'Now that you understand the situation, please walk me through your framework for identifying revenue growth opportunities for Air Panama. How would you structure this problem?',
      'time_limit_sec', 420,
      'hints', jsonb_build_array(
        jsonb_build_object('tier', 1, 'text', 'Think about the fundamental drivers of revenue in an airline business.'),
        jsonb_build_object('tier', 2, 'text', 'Revenue equals volume times price. Consider breaking down both dimensions.'),
        jsonb_build_object('tier', 3, 'text', 'For airlines specifically, think about routes, aircraft utilization, pricing tiers, and customer segments.')
      ),
      'rubric', jsonb_build_object(
        'criteria', jsonb_build_array(
          jsonb_build_object('dimension', 'structure', 'weight', 0.35, 'description', 'Logical, MECE framework'),
          jsonb_build_object('dimension', 'customization', 'weight', 0.25, 'description', 'Tailored to airline industry'),
          jsonb_build_object('dimension', 'completeness', 'weight', 0.25, 'description', 'Covered key revenue drivers'),
          jsonb_build_object('dimension', 'communication', 'weight', 0.15, 'description', 'Clear and concise delivery')
        ),
        'passing_score', 65
      )
    ),
    jsonb_build_object(
      'name', 'analysis',
      'goal', 'Analyze route reallocation opportunity using quantitative data',
      'prompt', 'Good framework. Now let''s dive into a specific opportunity. The client is considering adding 3 daily flights from Panama City to New York, but they would need to cancel 2 daily flights to Mango, Colombia to free up the aircraft. Here''s the data: Mango flights currently run at 60% capacity with $500 tickets. The NYC route would run at 80% capacity with $700 tickets. Each aircraft holds 200 passengers. What would you recommend?',
      'time_limit_sec', 600,
      'hints', jsonb_build_array(
        jsonb_build_object('tier', 1, 'text', 'Start by calculating revenue per flight for each route.'),
        jsonb_build_object('tier', 2, 'text', 'Revenue per flight = Capacity × Utilization × Ticket Price'),
        jsonb_build_object('tier', 3, 'text', 'For Mango: 200 seats × 0.6 utilization × $500 ticket. For NYC: 200 seats × 0.8 utilization × $700 ticket.'),
        jsonb_build_object('tier', 4, 'text', 'Don''t forget to consider costs, market saturation, and strategic implications beyond just revenue.')
      ),
      'rubric', jsonb_build_object(
        'criteria', jsonb_build_array(
          jsonb_build_object('dimension', 'quantitative', 'weight', 0.40, 'description', 'Accurate calculations'),
          jsonb_build_object('dimension', 'structure', 'weight', 0.20, 'description', 'Systematic approach to analysis'),
          jsonb_build_object('dimension', 'insight', 'weight', 0.25, 'description', 'Identified key drivers and implications'),
          jsonb_build_object('dimension', 'sanity_checks', 'weight', 0.15, 'description', 'Validated results and considered edge cases')
        ),
        'passing_score', 70
      )
    ),
    jsonb_build_object(
      'name', 'synthesis',
      'goal', 'Synthesize findings into clear recommendation with supporting rationale',
      'prompt', 'Excellent analysis. Now please summarize your final recommendation to the CEO. What should Air Panama do, and why?',
      'time_limit_sec', 360,
      'hints', jsonb_build_array(
        jsonb_build_object('tier', 1, 'text', 'Structure your recommendation: what to do, why it makes sense, and what risks or next steps to consider.'),
        jsonb_build_object('tier', 2, 'text', 'Lead with your recommendation, then support with 2-3 key reasons backed by your analysis.')
      ),
      'rubric', jsonb_build_object(
        'criteria', jsonb_build_array(
          jsonb_build_object('dimension', 'clarity', 'weight', 0.30, 'description', 'Clear, concise recommendation'),
          jsonb_build_object('dimension', 'rationale', 'weight', 0.35, 'description', 'Well-supported with analysis'),
          jsonb_build_object('dimension', 'business_judgment', 'weight', 0.20, 'description', 'Considered broader implications'),
          jsonb_build_object('dimension', 'communication', 'weight', 0.15, 'description', 'Executive-ready delivery')
        ),
        'passing_score', 70
      )
    )
  ),
  jsonb_build_object(
    'dimensions', jsonb_build_array(
      jsonb_build_object('name', 'Problem Solving', 'weight', 0.30),
      jsonb_build_object('name', 'Quantitative Skills', 'weight', 0.25),
      jsonb_build_object('name', 'Structured Thinking', 'weight', 0.25),
      jsonb_build_object('name', 'Communication', 'weight', 0.20)
    ),
    'passing_threshold', 70
  ),
  true
);

-- ============================================================================
-- STEP 11: Verification
-- ============================================================================

-- Check tables were created
DO $$
BEGIN
  RAISE NOTICE 'Migration complete! Verify with these queries:';
  RAISE NOTICE '1. SELECT tablename FROM pg_tables WHERE schemaname = ''public'';';
  RAISE NOTICE '2. SELECT id, title, firm, industry, difficulty_level FROM cases;';
  RAISE NOTICE '3. SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = ''public'';';
END $$;

-- ============================================================================
-- End of Fresh Start Migration
-- ============================================================================
