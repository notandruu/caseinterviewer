# Database Migration - Fresh Start

This migration will completely reset your Supabase database and set up everything from scratch.

## What This Migration Does

1. **Drops all existing tables** (clean slate)
2. **Creates all required tables:**
   - `cases` - Case interview definitions with Voice V2 structure
   - `user_profiles` - User onboarding data (Echo auth compatible)
   - `interviews` - Interview sessions (Echo auth compatible)
   - `case_attempts` - Alternative tracking system
   - `case_events` - Audit log
3. **Sets up Row Level Security (RLS)** policies
4. **Seeds Air Panama case** - Your first case ready to go

## How to Run

### Option 1: Supabase Dashboard (Recommended)

1. Go to your Supabase project: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy and paste the entire contents of `00_fresh_start.sql`
5. Click **Run** (or press Cmd/Ctrl + Enter)
6. Wait for success message

### Option 2: Supabase CLI

```bash
cd /Users/dennisliu/Downloads/case-interview-simulator
npx supabase db push
```

## After Running

Your database will be completely fresh with:

✅ All tables created
✅ RLS policies configured
✅ Triggers set up
✅ Air Panama case seeded and ready

## What's Included

### Tables Created:
- **cases** - Published cases visible to everyone, with sections for Voice V2
- **user_profiles** - Stores onboarding data (name, target firm, experience, etc.)
- **interviews** - Tracks Echo authenticated interview sessions
- **case_attempts** - Alternative tracking for UUID-based auth
- **case_events** - Audit log for all case actions

### RLS Policies:
- **Permissive policies** for Echo authentication (user_profiles, interviews)
- **Standard policies** for cases, attempts, and events
- No authentication required for reading published cases

### Seeded Data:
- **Air Panama Revenue Growth** - McKinsey case, difficulty level 3
  - Fully structured with 4 sections
  - Complete with prompts, hints, and rubrics
  - Ready for voice interviews

## Troubleshooting

If you get an error:
1. Make sure you're connected to the correct Supabase project
2. Check that you have the necessary permissions
3. Try running the migration in smaller chunks if needed

## Next Steps

After running this migration:
1. Test the onboarding flow at `/onboarding`
2. Complete onboarding to be redirected to your first case
3. Start your first voice interview with Air Panama!
