-- Remove Supabase Auth dependency since we're using Echo Auth
-- Echo user IDs won't exist in auth.users, so we need to remove foreign key constraints

-- Drop the foreign key constraint on profiles table
ALTER TABLE public.profiles
  DROP CONSTRAINT IF EXISTS profiles_id_fkey;

-- Drop the foreign key constraint on interviews table
ALTER TABLE public.interviews
  DROP CONSTRAINT IF EXISTS interviews_user_id_fkey;

-- Drop the foreign key constraint on user_stats table
ALTER TABLE public.user_stats
  DROP CONSTRAINT IF EXISTS user_stats_user_id_fkey;

-- Drop the trigger that creates profiles on auth.users insert
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Drop the function since we won't be using it
DROP FUNCTION IF EXISTS public.handle_new_user();

-- The profiles, interviews, and user_stats tables will now accept any UUID
-- without requiring it to exist in auth.users
-- Application code (Echo Auth) will manage user identity
