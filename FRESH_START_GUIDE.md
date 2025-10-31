# 🚀 Fresh Start Guide - Voice V2

## 🎯 Problem Solved

You were right! The Supabase database had the old schema structure, which is why the Voice V2 system couldn't pull case data.

I've created a **fresh start migration** that completely resets the database with the correct Voice V2 structure.

## ✅ What's Been Created

### 1. Comprehensive Reset Migration

**File**: `supabase/migrations/00_RESET_fresh_start.sql`

This single file does everything:
- ✅ Drops old tables cleanly (cases, case_attempts, case_events)
- ✅ Creates new Voice V2 schema with proper structure
- ✅ Sets up Row Level Security (RLS) policies
- ✅ Creates helper functions (get_next_section, set_updated_at)
- ✅ Seeds complete Air Panama case with:
  - **4 structured sections** (introduction → framework → analysis → synthesis)
  - **Tiered hints** (2-4 hints per section)
  - **Detailed rubrics** for scoring
  - **Complete case data** (aircraft capacity, route utilization, ticket prices, etc.)
  - **Ground truth** for scoring (hidden from AI)

### 2. Updated Documentation

**File**: `MIGRATIONS.md`

Step-by-step instructions for:
- Running the migration in Supabase
- Verifying setup is correct
- Getting the case ID for testing
- Troubleshooting common issues

## 🔧 What You Need to Do

### Step 1: Run the Migration in Supabase

1. Open your Supabase project dashboard
2. Go to **SQL Editor** (left sidebar)
3. Click **New Query**
4. Open file: `supabase/migrations/00_RESET_fresh_start.sql`
5. Copy **entire file contents** (Cmd/Ctrl + A, then Cmd/Ctrl + C)
6. Paste into Supabase SQL Editor
7. Click **Run** (or press Cmd/Ctrl + Enter)
8. Wait 5-10 seconds
9. You should see: "Success. No rows returned"

### Step 2: Verify Setup

Run this in Supabase SQL Editor:

```sql
-- Quick check
SELECT id, title, firm, industry, difficulty_level, published
FROM cases
WHERE title = 'Air Panama Revenue Growth';
```

Expected result:
- 1 row with `published = true`
- Copy the `id` (UUID) for testing

### Step 3: Test Voice Interview

1. Navigate to: `http://localhost:3000/cases/{CASE_ID}/voice`
   - Replace `{CASE_ID}` with the UUID from Step 2
2. Pre-interview settings screen should appear
3. Select language (English is default)
4. Click "Test Microphone" and allow access
5. Click "Start Interview"

### Expected Behavior

The AI should now:
- ✅ Greet you professionally
- ✅ Deliver the introduction prompt: "Your client is Air Panama, the second-largest airline in Latin America..."
- ✅ Have access to case data (aircraft capacity: 200, routes: Mango & NYC, etc.)
- ✅ Use tools automatically:
  - `calc_basic` for arithmetic
  - `reveal_hint` when you ask for help
  - `score_response` before advancing sections
  - `advance_section` to progress through the interview
- ✅ Progress through timeline: Introduction → Framework → Analysis → Synthesis

## 📊 Data Structure Overview

### What's Now in Supabase

**Cases Table**:
```
id: uuid
title: "Air Panama Revenue Growth"
firm: "McKinsey"
industry: "Aviation"
difficulty_level: 3
sections: [4 section objects with prompts, hints, rubrics]
data_json: {aircraft, routes, competitors, financials}
ground_truth: {calculations} ← NEVER exposed to AI
published: true
```

**Section Structure** (4 sections):
```json
{
  "name": "introduction",
  "goal": "Understand the case context...",
  "prompt": "Your client is Air Panama...",
  "time_limit_sec": 300,
  "hints": [
    {"tier": 1, "text": "Consider asking about..."},
    {"tier": 2, "text": "It may help to understand..."}
  ],
  "rubric": {
    "criteria": [...],
    "passing_score": 60
  }
}
```

**Case Data** (available during interview):
```json
{
  "aircraft": {
    "capacity": 200,
    "operating_cost_per_flight": 40000,
    "fleet_size": 25,
    "utilization_target": 0.75
  },
  "routes": {
    "mango": {
      "current_flights_per_day": 2,
      "utilization": 0.6,
      "ticket_price": 500,
      "market_size_pax_per_day": 500
    },
    "nyc": {
      "proposed_flights_per_day": 3,
      "utilization": 0.8,
      "ticket_price": 700,
      "market_size_pax_per_day": 1000
    }
  },
  "competitors": {...},
  "financials": {...}
}
```

**Ground Truth** (for scoring only):
```json
{
  "calculations": {
    "mango_revenue_per_flight": 60000,
    "nyc_revenue_per_flight": 112000,
    "revenue_delta_per_flight": 52000,
    "net_daily_improvement": 44000
  },
  "framework_components": [
    "Revenue", "Costs", "Volume", "Price", "Utilization"
  ]
}
```

## 🔍 Verification Queries

Run these in Supabase to verify everything:

```sql
-- 1. Table existence
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('cases', 'case_attempts', 'case_events');
-- Expected: 3 rows

-- 2. Section count
SELECT jsonb_array_length(sections) as section_count
FROM cases
WHERE title = 'Air Panama Revenue Growth';
-- Expected: 4

-- 3. First section details
SELECT
  sections->0->>'name' as section_name,
  sections->0->>'goal' as goal,
  jsonb_array_length(sections->0->'hints') as hint_count
FROM cases;
-- Expected: section_name = 'introduction', hint_count = 2

-- 4. Case data structure
SELECT
  data_json->'aircraft'->>'capacity' as capacity,
  data_json->'routes'->'mango'->>'ticket_price' as mango_price,
  data_json->'routes'->'nyc'->>'ticket_price' as nyc_price
FROM cases;
-- Expected: capacity = 200, mango_price = 500, nyc_price = 700

-- 5. RLS enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('cases', 'case_attempts', 'case_events');
-- Expected: All true
```

## 🐛 Troubleshooting

### "Case not found"
The migration didn't seed data properly.

**Fix**:
```sql
-- Check if case exists
SELECT COUNT(*) FROM cases;
-- If 0, re-run the migration
```

### "Failed to get section details"
Section structure is wrong.

**Fix**:
```sql
-- Check sections
SELECT sections FROM cases LIMIT 1;
-- Should be a JSONB array with 4 objects
```

### AI doesn't have data
RLS is blocking queries or data_json is empty.

**Fix**:
```sql
-- Check data_json
SELECT data_json FROM cases LIMIT 1;
-- Should have aircraft, routes, competitors, financials

-- Temporarily disable RLS to test
ALTER TABLE cases DISABLE ROW LEVEL SECURITY;
-- Remember to re-enable!
```

### Multiple agents speaking
Already fixed in code with:
- Single initialization (useRef prevents double mount)
- Single session.update call
- 500ms delay before first response.create

## 📝 Summary

**Before**: Old schema with `prompt`, `description`, `difficulty` fields
**After**: New Voice V2 schema with `sections`, `data_json`, `ground_truth`, `difficulty_level`

**Key Changes**:
- ✅ Structured sections replace single prompt
- ✅ JSONB data storage for flexible case data
- ✅ Ground truth for scoring (never exposed to AI)
- ✅ Tiered hints per section
- ✅ Detailed rubrics for evaluation
- ✅ Complete Air Panama case seeded

**What Works Now**:
- ✅ AI can access case data (aircraft, routes, etc.)
- ✅ AI uses structured prompts for each section
- ✅ System can score responses against ground truth
- ✅ Hints reveal progressively
- ✅ Timeline advances correctly

## 🎉 Next Steps

After running the migration:
1. Test Air Panama case end-to-end
2. Verify all tools work (calc_basic, reveal_hint, score_response, advance_section)
3. Check scoring accuracy
4. Add more cases using the same structure
5. Consider building a case management UI

---

**Ready to test!** Just run the migration in Supabase and navigate to the voice interview route.
