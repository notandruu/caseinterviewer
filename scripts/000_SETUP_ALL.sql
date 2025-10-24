-- ============================================
-- COMPLETE DATABASE SETUP SCRIPT
-- Run this ONCE in Supabase SQL Editor
-- ============================================

-- Step 1: Create all tables and RLS policies
-- Create profiles table for user data
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create cases table for interview scenarios
CREATE TABLE IF NOT EXISTS public.cases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  industry TEXT NOT NULL,
  difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
  case_type TEXT NOT NULL CHECK (case_type IN ('market-sizing', 'profitability', 'market-entry', 'pricing', 'growth-strategy', 'operations')),
  estimated_duration INTEGER NOT NULL,
  prompt TEXT NOT NULL,
  key_concepts TEXT[] NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create interviews table to track user sessions
CREATE TABLE IF NOT EXISTS public.interviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
  status TEXT NOT NULL CHECK (status IN ('in-progress', 'completed', 'abandoned')),
  transcript JSONB DEFAULT '[]'::JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create feedback table for AI-generated feedback
CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
  overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
  structure_score INTEGER CHECK (structure_score >= 0 AND structure_score <= 100),
  analysis_score INTEGER CHECK (analysis_score >= 0 AND analysis_score <= 100),
  communication_score INTEGER CHECK (communication_score >= 0 AND communication_score <= 100),
  strengths TEXT[] NOT NULL,
  areas_for_improvement TEXT[] NOT NULL,
  detailed_feedback TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create user_stats table for tracking progress
CREATE TABLE IF NOT EXISTS public.user_stats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_interviews INTEGER DEFAULT 0,
  completed_interviews INTEGER DEFAULT 0,
  average_score DECIMAL(5,2) DEFAULT 0,
  current_streak INTEGER DEFAULT 0,
  longest_streak INTEGER DEFAULT 0,
  last_interview_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for cases (public read)
DROP POLICY IF EXISTS "Anyone can view cases" ON public.cases;
CREATE POLICY "Anyone can view cases" ON public.cases
  FOR SELECT USING (true);

-- RLS Policies for interviews
DROP POLICY IF EXISTS "Users can view their own interviews" ON public.interviews;
CREATE POLICY "Users can view their own interviews" ON public.interviews
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own interviews" ON public.interviews;
CREATE POLICY "Users can insert their own interviews" ON public.interviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own interviews" ON public.interviews;
CREATE POLICY "Users can update their own interviews" ON public.interviews
  FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for feedback
DROP POLICY IF EXISTS "Users can view feedback for their interviews" ON public.feedback;
CREATE POLICY "Users can view feedback for their interviews" ON public.feedback
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE interviews.id = feedback.interview_id
      AND interviews.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Users can insert feedback for their interviews" ON public.feedback;
CREATE POLICY "Users can insert feedback for their interviews" ON public.feedback
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE interviews.id = feedback.interview_id
      AND interviews.user_id = auth.uid()
    )
  );

-- RLS Policies for user_stats
DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
CREATE POLICY "Users can view their own stats" ON public.user_stats
  FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;
CREATE POLICY "Users can insert their own stats" ON public.user_stats
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;
CREATE POLICY "Users can update their own stats" ON public.user_stats
  FOR UPDATE USING (auth.uid() = user_id);

-- Create function to auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name)
  VALUES (
    new.id,
    new.email,
    COALESCE(new.raw_user_meta_data->>'full_name', NULL)
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_stats (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- Step 2: Seed sample cases
INSERT INTO public.cases (title, description, industry, difficulty, case_type, estimated_duration, prompt, key_concepts) VALUES
(
  'Coffee Chain Expansion',
  'A national coffee chain is considering expanding into a new city. Should they proceed?',
  'Retail',
  'beginner',
  'market-entry',
  30,
  'Our client is a successful coffee chain with 200 locations across the country. They are considering opening their first location in Portland, Oregon. The CEO wants to know if this is a good opportunity and what factors they should consider.',
  ARRAY['market analysis', 'competitive landscape', 'customer segmentation', 'financial projections']
),
(
  'Tech Startup Profitability',
  'A SaaS company is struggling with profitability despite strong revenue growth.',
  'Technology',
  'intermediate',
  'profitability',
  35,
  'Our client is a B2B SaaS company that provides project management software. They have grown revenue by 150% year-over-year but are still not profitable. The board is concerned and wants to understand what is driving the losses and how to become profitable.',
  ARRAY['cost structure', 'revenue analysis', 'unit economics', 'operational efficiency']
),
(
  'Airline Market Sizing',
  'Estimate the size of the business travel market for domestic flights in the US.',
  'Transportation',
  'beginner',
  'market-sizing',
  25,
  'Our client is a major airline considering launching a premium business travel service. Before investing, they want to understand the size of the domestic business travel market in the United States. Can you estimate the annual market size?',
  ARRAY['market sizing', 'segmentation', 'assumptions', 'sanity checks']
),
(
  'Pharmaceutical Pricing Strategy',
  'A pharmaceutical company needs to price a new breakthrough drug.',
  'Healthcare',
  'advanced',
  'pricing',
  40,
  'Our client has developed a breakthrough treatment for a rare disease that currently has no cure. They need to determine the optimal pricing strategy for this drug. What factors should they consider and what price would you recommend?',
  ARRAY['value-based pricing', 'competitive analysis', 'regulatory considerations', 'stakeholder analysis']
),
(
  'E-commerce Growth Strategy',
  'An online retailer wants to double revenue in the next two years.',
  'E-commerce',
  'intermediate',
  'growth-strategy',
  35,
  'Our client is a mid-sized e-commerce company selling home goods online. They currently generate $50M in annual revenue and want to double that to $100M within two years. What strategies would you recommend to achieve this growth target?',
  ARRAY['growth levers', 'customer acquisition', 'retention strategies', 'market expansion']
),
(
  'Manufacturing Operations Improvement',
  'A manufacturing plant is experiencing quality issues and delays.',
  'Manufacturing',
  'advanced',
  'operations',
  40,
  'Our client operates a manufacturing facility that produces automotive parts. Over the past six months, they have seen an increase in defect rates from 2% to 8% and delivery delays have doubled. The plant manager needs help identifying the root causes and implementing solutions.',
  ARRAY['process analysis', 'root cause analysis', 'quality control', 'supply chain management']
)
ON CONFLICT DO NOTHING;

-- Step 3: Create mock demo user
INSERT INTO profiles (id, email, full_name, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'demo@caseprep.ai',
  'Demo User',
  NOW(),
  NOW()
)
ON CONFLICT (id) DO UPDATE SET
  email = EXCLUDED.email,
  full_name = EXCLUDED.full_name,
  updated_at = NOW();

INSERT INTO user_stats (user_id, total_interviews, completed_interviews, average_score, current_streak, longest_streak, created_at, updated_at)
VALUES (
  '00000000-0000-0000-0000-000000000001',
  5,
  3,
  78.5,
  2,
  5,
  NOW(),
  NOW()
)
ON CONFLICT (user_id) DO UPDATE SET
  total_interviews = EXCLUDED.total_interviews,
  completed_interviews = EXCLUDED.completed_interviews,
  average_score = EXCLUDED.average_score,
  current_streak = EXCLUDED.current_streak,
  longest_streak = EXCLUDED.longest_streak,
  updated_at = NOW();

-- Step 4: Add mock user bypass policies
DROP POLICY IF EXISTS "Allow mock user access to profiles" ON public.profiles;
CREATE POLICY "Allow mock user access to profiles" ON public.profiles
  FOR ALL USING (id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "Allow mock user access to user_stats" ON public.user_stats;
CREATE POLICY "Allow mock user access to user_stats" ON public.user_stats
  FOR ALL USING (user_id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "Allow mock user access to interviews" ON public.interviews;
CREATE POLICY "Allow mock user access to interviews" ON public.interviews
  FOR ALL USING (user_id = '00000000-0000-0000-0000-000000000001');

DROP POLICY IF EXISTS "Allow mock user access to feedback" ON public.feedback;
CREATE POLICY "Allow mock user access to feedback" ON public.feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE interviews.id = feedback.interview_id
      AND interviews.user_id = '00000000-0000-0000-0000-000000000001'
    )
  );

-- ============================================
-- SETUP COMPLETE!
-- ============================================
-- Verify with: SELECT * FROM cases;
-- Should return 6 cases
