-- Temporarily disable RLS to insert mock user data
-- This allows the demo user to work without Supabase Auth

-- Insert mock user profile directly (bypassing auth.users constraint)
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

-- Insert mock user stats
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

-- Add RLS policy to allow mock user access
CREATE POLICY IF NOT EXISTS "Allow mock user access to profiles" ON public.profiles
  FOR ALL USING (id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY IF NOT EXISTS "Allow mock user access to user_stats" ON public.user_stats
  FOR ALL USING (user_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY IF NOT EXISTS "Allow mock user access to interviews" ON public.interviews
  FOR ALL USING (user_id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY IF NOT EXISTS "Allow mock user access to feedback" ON public.feedback
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.interviews
      WHERE interviews.id = feedback.interview_id
      AND interviews.user_id = '00000000-0000-0000-0000-000000000001'
    )
  );
