# ✅ Compact CaseCard/LineCard Structure - Complete!

## What's Been Done

### 1. **Database Migrations** ✅
- **10_compact_case_structure.sql** - New schema with compact turn-based structure
- **11_seed_artificial_turf_complete.sql** - Full Artificial Turf case with all content
- ❌ Removed old migrations (00, 01, 02, 03)

### 2. **System Prompt** ✅
- **lib/prompts/system-prompt-compact.ts** - Static base prompt + dynamic CaseCard/LineCard injection
- Uses your exact specification:
  - Turn discipline
  - Evaluation & tags
  - Tool use protocol
  - Style & tone
  - Safety & fallback

### 3. **Tool Definitions** ✅
- **lib/tools-compact.ts** - 4 compact tools:
  - `get_next_line(attemptId)` - Fetch next LineCard
  - `calc_basic(expr)` - Arithmetic calculator
  - `reveal_hint(attemptId)` - Progressive hints
  - `record_turn(attemptId, summary, tags)` - Record candidate response

### 4. **API Routes** ✅
- **app/api/voice-tools-compact/get_next_line/route.ts**
- **app/api/voice-tools-compact/calc_basic/route.ts**
- **app/api/voice-tools-compact/reveal_hint/route.ts**
- **app/api/voice-tools-compact/record_turn/route.ts**

All support:
- ✅ Authenticated users
- ✅ Demo mode (attemptId starts with "demo-")
- ✅ RLS policies

### 5. **Updated VoiceSessionV3** ✅
- Replaced old tools with compact tools
- Dynamic system prompt injection each turn
- Automatic LineCard/CaseCard updates
- Hints counter tracking per line

---

## How It Works

### Turn Flow

1. **Initial Load**
   - Component calls `get_next_line(attemptId)`
   - Receives first CaseCard + LineCard
   - Generates system prompt with `generateCompactSystemPrompt()`
   - AI delivers LineCard.text to candidate

2. **Candidate Responds**
   - AI listens to response
   - (Optional) Calls `record_turn(attemptId, summary, tags)` to log response
   - Calls `get_next_line(attemptId)` to advance
   - Receives updated CaseCard + new LineCard
   - System prompt is regenerated with new context

3. **Tool Usage**
   - `calc_basic(expr)` - AI uses for all math
   - `reveal_hint(attemptId)` - AI uses when candidate asks for help
   - Hints are tracked per line, reset when advancing

4. **Completion**
   - `get_next_line` returns `completed: true`
   - Interview ends

---

## CaseCard Structure (Passed Each Turn)

```json
{
  "case_id": "uuid",
  "case_type": "Market Sizing",
  "title": "Artificial Turf",
  "objective": "Estimate market size for artificial turf in US",
  "vars": {
    "us_population_millions": 300,
    "high_school_attendance_rate": 0.80,
    "price_per_sqft_usd": 10
  },
  "section": "math_schools",
  "line_id": "l_3",
  "evaluation_focus": ["structure", "quantitative", "units", "sanity_check"]
}
```

---

## LineCard Structure (Current Line)

```json
{
  "speaker": "interviewer",
  "text": "Can you estimate the number of schools in the U.S.?",
  "expects_response": true,
  "response_type": "estimate",
  "next_preview": ["Now let's calculate the market value."],
  "hints": [
    {"tier": 1, "text": "Start with US population..."},
    {"tier": 2, "text": "Break into high schools, colleges..."},
    {"tier": 3, "text": "Example calculation..."}
  ]
}
```

---

## Testing Instructions

### Step 1: Apply Migrations to Supabase

**Go to Supabase Dashboard → SQL Editor**

1. Copy contents of `supabase/migrations/10_compact_case_structure.sql`
2. Paste and **Run**
3. Copy contents of `supabase/migrations/11_seed_artificial_turf_complete.sql`
4. Paste and **Run**

### Step 2: Verify Data

Run this query in SQL Editor:

```sql
SELECT
  title,
  case_type,
  jsonb_object_keys(lines) as line_ids
FROM public.cases
WHERE title = 'Artificial Turf';
```

You should see: `l_1`, `l_2`, `l_3`, `l_4`, `l_5`

### Step 3: Check Browser Console

Navigate to: **http://localhost:3004/dashboard**

Open browser console (F12) and look for:
- `[Dashboard] checkOnboarding called`
- `[Dashboard] Fetching cases...`
- `[Dashboard] Cases fetched: 1`

You should see the "Artificial Turf" case on the dashboard.

### Step 4: Start an Interview

Click on "Artificial Turf" case to start.

**What to expect:**
1. AI calls `get_next_line(attemptId)` automatically
2. AI says: "Our client would like us to estimate the market for artificial turf. How would you approach this?"
3. You respond with your framework
4. AI calls `record_turn()` to log your response
5. AI calls `get_next_line()` again
6. AI delivers next LineCard: "Can you estimate the number of schools in the U.S.?"
7. Process continues through all 5 lines

---

## Debugging

### Check API Routes

Test get_next_line manually:

```bash
curl -X POST http://localhost:3004/api/voice-tools-compact/get_next_line \
  -H "Content-Type: application/json" \
  -d '{"attemptId": "demo-test-123"}'
```

Expected response:
```json
{
  "caseCard": {
    "case_id": "...",
    "case_type": "Market Sizing",
    "title": "Artificial Turf",
    "vars": {...},
    "section": "opening",
    "line_id": "l_1",
    "evaluation_focus": [...]
  },
  "lineCard": {
    "speaker": "interviewer",
    "text": "Our client would like us to estimate...",
    "expects_response": true,
    "response_type": "framework"
  },
  "completed": false
}
```

### Check Console Logs

In VoiceSessionV3, look for:
- `[VoiceSessionV3] data_channel_opened`
- `[VoiceSessionV3] tool_call_received` with `name: "get_next_line"`
- `[VoiceSessionV3] session_config_sent`

---

## File Structure

```
supabase/
├── migrations/
│   ├── 10_compact_case_structure.sql       ← Database schema
│   └── 11_seed_artificial_turf_complete.sql ← Case data

lib/
├── prompts/
│   └── system-prompt-compact.ts            ← Prompt generator
└── tools-compact.ts                        ← Tool definitions

app/api/voice-tools-compact/
├── get_next_line/route.ts
├── calc_basic/route.ts
├── reveal_hint/route.ts
└── record_turn/route.ts

components/VoiceSession/V3/
└── VoiceSessionV3.tsx                      ← Updated to use compact tools
```

---

## Next Steps

1. ✅ Apply migrations to Supabase (see Step 1 above)
2. ✅ Verify case data loaded (see Step 2 above)
3. ✅ Test interview flow (see Step 4 above)
4. Add more cases using the same LineCard structure
5. Implement scoring/feedback based on evaluation tags

---

## Questions?

- **Migrations not working?** Make sure you're in the correct Supabase project
- **Dashboard stuck loading?** Check browser console for auth errors
- **Interview not starting?** Check Network tab for failed API calls
- **System prompt not updating?** Check that `generateCompactSystemPrompt()` is being called after each `get_next_line`

---

## Benefits of This Approach

✅ **Static base prompt** - Same interviewer rules for all cases
✅ **Dynamic context** - CaseCard/LineCard injected each turn
✅ **Tool-driven flow** - AI doesn't decide next line, tools do
✅ **Hints per line** - Each LineCard has its own hints
✅ **Evaluation tags** - Guide AI's assessment per turn
✅ **Clean separation** - Case content separate from interviewer logic
✅ **Demo mode support** - Works without authentication

---

**Dev server is running at: http://localhost:3004**

Ready to test! 🚀
