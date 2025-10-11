-- Update RLS policies to work with Echo Auth
-- Since Echo doesn't use Supabase Auth, we need to relax RLS policies
-- and rely on application-level authorization

-- Drop old policies that depend on auth.uid()
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;

DROP POLICY IF EXISTS "Users can view their own interviews" ON public.interviews;
DROP POLICY IF EXISTS "Users can insert their own interviews" ON public.interviews;
DROP POLICY IF EXISTS "Users can update their own interviews" ON public.interviews;

DROP POLICY IF EXISTS "Users can view feedback for their interviews" ON public.feedback;
DROP POLICY IF EXISTS "Users can insert feedback for their interviews" ON public.feedback;

DROP POLICY IF EXISTS "Users can view their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can insert their own stats" ON public.user_stats;
DROP POLICY IF EXISTS "Users can update their own stats" ON public.user_stats;

-- Create new permissive policies
-- We rely on application logic to ensure users only access their own data

-- Profiles: Allow all operations (app will validate)
CREATE POLICY "Allow all profile operations" ON public.profiles
  FOR ALL USING (true) WITH CHECK (true);

-- Interviews: Allow all operations (app will validate)
CREATE POLICY "Allow all interview operations" ON public.interviews
  FOR ALL USING (true) WITH CHECK (true);

-- Feedback: Allow all operations (app will validate)
CREATE POLICY "Allow all feedback operations" ON public.feedback
  FOR ALL USING (true) WITH CHECK (true);

-- User Stats: Allow all operations (app will validate)
CREATE POLICY "Allow all user_stats operations" ON public.user_stats
  FOR ALL USING (true) WITH CHECK (true);

-- Cases remain public read-only
-- Already handled by existing policy "Anyone can view cases"
