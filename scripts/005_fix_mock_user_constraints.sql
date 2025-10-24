-- Fix foreign key constraints to allow mock user without auth.users entry
-- This enables demo mode to work without real Supabase authentication

-- Drop existing foreign key constraints that reference auth.users
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_id_fkey;
ALTER TABLE public.interviews DROP CONSTRAINT IF EXISTS interviews_user_id_fkey;
ALTER TABLE public.user_stats DROP CONSTRAINT IF EXISTS user_stats_user_id_fkey;

-- Recreate profiles table primary key without auth.users reference
-- Keep the id as UUID PRIMARY KEY but don't require auth.users
ALTER TABLE public.profiles ALTER COLUMN id SET DEFAULT gen_random_uuid();

-- Add check constraints to ensure valid UUIDs
ALTER TABLE public.profiles ADD CONSTRAINT valid_user_id CHECK (id IS NOT NULL);
ALTER TABLE public.interviews ADD CONSTRAINT valid_user_id CHECK (user_id IS NOT NULL);
ALTER TABLE public.user_stats ADD CONSTRAINT valid_user_id_stats CHECK (user_id IS NOT NULL);

-- Ensure RLS policies exist for mock user (idempotent)
DO $$ 
BEGIN
  -- Drop existing policies if they exist to recreate them
  DROP POLICY IF EXISTS "Allow mock user access to profiles" ON public.profiles;
  DROP POLICY IF EXISTS "Allow mock user access to user_stats" ON public.user_stats;
  DROP POLICY IF EXISTS "Allow mock user access to interviews" ON public.interviews;
  DROP POLICY IF EXISTS "Allow mock user access to feedback" ON public.feedback;

  -- Create policies for mock user
  CREATE POLICY "Allow mock user access to profiles" ON public.profiles
    FOR ALL USING (id = '00000000-0000-0000-0000-000000000001');

  CREATE POLICY "Allow mock user access to user_stats" ON public.user_stats
    FOR ALL USING (user_id = '00000000-0000-0000-0000-000000000001');

  CREATE POLICY "Allow mock user access to interviews" ON public.interviews
    FOR ALL USING (user_id = '00000000-0000-0000-0000-000000000001');

  CREATE POLICY "Allow mock user access to feedback" ON public.feedback
    FOR ALL USING (
      EXISTS (
        SELECT 1 FROM public.interviews
        WHERE interviews.id = feedback.interview_id
        AND interviews.user_id = '00000000-0000-0000-0000-000000000001'
      )
    );
END $$;

-- Insert or update mock user profile
INSERT INTO public.profiles (id, email, full_name, created_at, updated_at)
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

-- Insert or update mock user stats
INSERT INTO public.user_stats (user_id, total_interviews, completed_interviews, average_score, current_streak, longest_streak, created_at, updated_at)
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
