# Supabase Migration Instructions - Voice V2

This document provides instructions for setting up the Voice V2 database from scratch.

## ⚠️ IMPORTANT: Fresh Start Required

Voice V2 requires a completely new database structure. The old schema is incompatible.

**Recommended Approach**: Run the fresh start migration that drops and recreates everything.

## Quick Start (Recommended)

### Step 1: Run Fresh Start Migration

Use the comprehensive reset migration that sets up everything in one go:

**File**: `supabase/migrations/00_RESET_fresh_start.sql`

This migration:
- ✅ Drops old tables cleanly
- ✅ Creates new Voice V2 schema
- ✅ Sets up RLS policies
- ✅ Creates helper functions
- ✅ Seeds Air Panama case with complete data
- ✅ Verifies structure

## Running the Migration

### Via Supabase Dashboard (Easiest)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open `supabase/migrations/00_RESET_fresh_start.sql`
5. Copy ALL contents (entire file)
6. Paste into Supabase SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. Wait ~5-10 seconds for completion
9. You should see "Success. No rows returned"

### Via psql (Alternative)

If you have psql installed and your DATABASE_URL:

```bash
psql $DATABASE_URL < supabase/migrations/00_RESET_fresh_start.sql
```

### What Gets Created

After running the migration, you'll have:

- ✅ `cases` table with Voice V2 structure
- ✅ `case_attempts` table for tracking progress
- ✅ `case_events` table for audit logging
- ✅ RLS policies for security
- ✅ Helper functions for section progression
- ✅ Air Panama case fully seeded with:
  - 4 structured sections (introduction, framework, analysis, synthesis)
  - Tiered hints (2-4 hints per section)
  - Detailed rubrics for each section
  - Complete case data (aircraft, routes, financials)
  - Ground truth for scoring (hidden from AI)

## New Schema Structure

### Cases Table

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `title` | TEXT | Case title |
| `firm` | TEXT | Consulting firm (e.g., "McKinsey", "BCG") |
| `industry` | TEXT | Industry category |
| `difficulty_level` | INTEGER | 1-5 scale |
| `summary` | TEXT | Brief case summary |
| `prompt_introduction` | TEXT | Stage 1: Introduction prompt |
| `prompt_framework` | TEXT | Stage 2: Framework development prompt |
| `prompt_analysis` | TEXT | Stage 3: Analysis & data prompt |
| `prompt_synthesis` | TEXT | Stage 4: Synthesis & recommendation prompt |
| `data_json` | JSONB | Flexible JSON data for the case |
| `expected_framework` | TEXT | Expected framework structure |
| `expected_answer_summary` | TEXT | Expected final recommendation |
| `key_insights` | TEXT[] | Array of key insights |

## Step 2: Verify Setup

After running the migration, verify everything is set up correctly:

### Quick Verification (Run in Supabase SQL Editor)

```sql
-- 1. Check tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('cases', 'case_attempts', 'case_events');
-- Expected: 3 rows

-- 2. Check Air Panama case exists
SELECT id, title, firm, industry, difficulty_level, published
FROM cases
WHERE title = 'Air Panama Revenue Growth';
-- Expected: 1 row with published = true

-- 3. Check sections are properly structured
SELECT
  title,
  jsonb_array_length(sections) as section_count,
  jsonb_array_length(key_insights) as insight_count
FROM cases
WHERE title = 'Air Panama Revenue Growth';
-- Expected: section_count = 4, insight_count = 4

-- 4. Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('cases', 'case_attempts', 'case_events');
-- Expected: All 3 tables with rowsecurity = true

-- 5. Check data structure
SELECT
  sections->0->>'name' as first_section,
  sections->0->>'goal' as first_goal,
  jsonb_array_length(sections->0->'hints') as hints_count
FROM cases
WHERE title = 'Air Panama Revenue Growth';
-- Expected: first_section = 'introduction', hints_count = 2
```

### Detailed Section Check

```sql
-- View all sections for Air Panama case
SELECT
  jsonb_array_elements(sections)->>'name' as section_name,
  jsonb_array_elements(sections)->>'goal' as goal,
  jsonb_array_length(jsonb_array_elements(sections)->'hints') as hints
FROM cases
WHERE title = 'Air Panama Revenue Growth';
-- Expected: 4 rows (introduction, framework, analysis, synthesis)
```

## Example Case Structure

See the Air Panama case in the seed file for a complete example:

```json
{
  "title": "Air Panama Revenue Growth",
  "firm": "McKinsey",
  "industry": "Aviation",
  "difficulty_level": 3,
  "summary": "Help Air Panama grow revenue amid increased competition...",
  "prompt_introduction": "Your client is Air Panama...",
  "prompt_framework": "Walk me through your framework...",
  "prompt_analysis": "The client is considering adding 3 daily flights...",
  "prompt_synthesis": "Based on your analysis, please summarize...",
  "data_json": {
    "aircraft_capacity": 200,
    "mango_utilization": 0.6,
    "nyc_utilization": 0.8,
    "ticket_prices": {
      "mango": 500,
      "nyc": 700
    }
  },
  "expected_framework": "Profitability → Revenue → Volume/Pricing...",
  "key_insights": [
    "Utilization gap drives profit variance",
    "High fixed costs favor fuller aircraft",
    "Price elasticity in North America market is low"
  ]
}
```

## Verification

After running migrations, verify the schema:

```sql
-- Check table structure
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'cases';

-- Check seeded data
SELECT id, title, firm, industry, difficulty_level
FROM cases;
```

## Application Updates

The following files have been updated to use the new schema:

- `components/VoiceSession/VoiceSessionV2.tsx` - Uses structured prompts in Realtime API instructions
- `app/dashboard/page.tsx` - Displays `difficulty_level` and `firm` fields
- `app/interview/[id]/page.tsx` - Fetches all new fields with `select("*")`

## Step 3: Get Case ID for Testing

After running the migration, you need the case ID to test the voice interview:

```sql
-- Get the Air Panama case ID
SELECT id, title FROM cases WHERE title = 'Air Panama Revenue Growth';
```

Copy the UUID (e.g., `03e5e202-3e6b-4537-9467-34bcdae0b46d`)

## Step 4: Test Voice Interview

1. Navigate to: `http://localhost:3000/cases/{CASE_ID}/voice`
   - Replace `{CASE_ID}` with the UUID from above
2. You should see the pre-interview settings screen
3. Select language (English is default)
4. Test microphone
5. Click "Start Interview"
6. The AI should:
   - Greet you professionally
   - Deliver the introduction prompt
   - Wait for your response
   - Use tools (calc_basic, reveal_hint, etc.) as needed
   - Progress through all 4 sections

## Troubleshooting

### "Case not found"
- Check that the case was seeded: `SELECT COUNT(*) FROM cases;`
- Should return 1
- Check published status: `SELECT published FROM cases;`
- Should be `true`

### "Failed to get section details"
- Check sections structure: `SELECT sections FROM cases LIMIT 1;`
- Should return a JSONB array with 4 objects
- Each object should have: name, goal, prompt, time_limit_sec, hints, rubric

### "No data available"
- Check data_json: `SELECT data_json FROM cases LIMIT 1;`
- Should return JSONB with aircraft, routes, competitors, financials

### API returns null/empty
- RLS might be blocking queries
- Temporarily disable to test: `ALTER TABLE cases DISABLE ROW LEVEL SECURITY;`
- Remember to re-enable: `ALTER TABLE cases ENABLE ROW LEVEL SECURITY;`

## Next Steps

After migration is complete and verified:
1. ✅ Test the interview flow with Air Panama case
2. ✅ Verify all tools work (calc_basic, reveal_hint, score_response, advance_section)
3. ✅ Check that timeline advances correctly
4. ✅ Verify hints counter updates
5. Add additional cases following the same structure
6. Consider creating a case management UI for non-technical users
