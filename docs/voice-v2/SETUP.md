# Voice V2 Setup Guide

## 🎯 Quick Start

Voice V2 is now fully implemented with Realtime API integration and server-mediated tools. Follow this guide to get it running.

## ✅ Prerequisites

- Node.js 18+ installed
- Supabase project created
- OpenAI API key with Realtime API access
- Echo SDK credentials (optional for auth)

## 📋 Setup Steps

### 1. Environment Configuration

The `.env.local` file should already have:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# OpenAI (Required for Realtime API)
OPENAI_API_KEY=your_openai_key

# Feature Flag (ALREADY SET TO TRUE)
NEXT_PUBLIC_VOICE_SESSION_V2_ENABLED=true
```

### 2. Run Database Migrations

You need to run the Voice V2 migrations in your Supabase project:

#### Option A: Via Supabase Dashboard (Recommended)

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor** in the left sidebar
3. Click **New Query**
4. Copy/paste the contents of `supabase/migrations/20250111_voice_v2_cases.sql`
5. Click **Run**
6. Repeat for `supabase/seed/voice_cases.sql`

#### Option B: Via Supabase CLI

```bash
# If you have Supabase CLI installed
supabase db push

# Or manually with psql
psql $DATABASE_URL < supabase/migrations/20250111_voice_v2_cases.sql
psql $DATABASE_URL < supabase/seed/voice_cases.sql
```

### 3. Verify Database Setup

After running migrations, verify in Supabase SQL Editor:

```sql
-- Check that tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
AND table_name IN ('cases', 'case_attempts', 'case_events');

-- Check that Air Panama case was seeded
SELECT id, title, firm, industry, difficulty_level
FROM cases
WHERE title = 'Air Panama Revenue Growth';

-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('cases', 'case_attempts', 'case_events');
```

All three tables should exist, the Air Panama case should be present, and all three tables should have `rowsecurity = true`.

### 4. Start Development Server

```bash
npm run dev
```

Server should start on `http://localhost:3000`

### 5. Test the System

#### A. Access Voice Interview

1. Navigate to dashboard: `http://localhost:3000/dashboard`
2. Click on "Air Panama Revenue Growth" case
3. You should see the normal interview route
4. To access Voice V2, manually navigate to: `http://localhost:3000/cases/{case-id}/voice`

#### B. Test API Tools

Test individual tools with curl:

```bash
# Test calculator (should work without auth)
curl "http://localhost:3000/api/voice-tools/calc-basic?expr=200*0.6*500"
# Expected: {"result":60000,"expression":"200*0.6*500"}

# Test calculator with complex expression
curl "http://localhost:3000/api/voice-tools/calc-basic?expr=(200*0.8*700*3)-(200*0.6*500*2)"
# Expected: {"result":276000,"expression":"(200*0.8*700*3)-(200*0.6*500*2)"}
```

#### C. Test Full Flow

1. Sign in (or use as guest)
2. Navigate to `/cases/{case-id}/voice`
3. Allow microphone access when prompted
4. Wait for "Connected - Speak anytime" status
5. Say "Hello" or "I'm ready to begin"
6. AI should greet you and deliver the introduction

**Expected Behavior:**
- Timeline shows 4 sections (Introduction active, others locked)
- AgentOrb pulses when AI speaks
- MicVisualizer shows your audio input
- Hints counter shows "Hints: 0 / 2" (for introduction)
- AI follows structured interview flow

## 🧪 Testing Checklist

### Manual Tests

- [ ] **Connection**: Voice session connects successfully
- [ ] **Audio**: Can hear AI interviewer speaking
- [ ] **Microphone**: MicVisualizer responds to your voice
- [ ] **Timeline**: Sections progress correctly (Introduction → Framework → Analysis → Synthesis)
- [ ] **Hints**: AI can call `reveal_hint` when you ask for help
- [ ] **Calculator**: AI uses `calc_basic` for all arithmetic
- [ ] **Scoring**: AI calls `score_response` before advancing sections
- [ ] **Completion**: Interview ends after synthesis section

### Security Tests

- [ ] **Answer Leakage**: Query `expected_answer_summary` as non-staff user (should be filtered by RLS)
  ```sql
  -- Run in Supabase SQL Editor
  SELECT expected_answer_summary FROM cases LIMIT 1;
  -- Should return NULL for non-staff users
  ```

- [ ] **Ground Truth**: Verify `ground_truth` is never exposed to AI (check network tab, no ground_truth in responses)

- [ ] **Calculator Security**: Try to inject code via calculator
  ```bash
  curl "http://localhost:3000/api/voice-tools/calc-basic?expr=eval('console.log(1)')"
  # Should return error: "Unsafe or invalid expression"
  ```

### Performance Tests

- [ ] **Latency**: Tool calls should complete in <500ms
- [ ] **Audio Quality**: No noticeable lag between speaking and AI response
- [ ] **Memory**: Session should run for 30+ minutes without issues

## 🔧 Troubleshooting

### Issue: "Failed to get session token"

**Cause**: OpenAI API key missing or invalid

**Fix**:
```bash
# Verify key is set
echo $OPENAI_API_KEY

# Or check .env.local
cat .env.local | grep OPENAI_API_KEY
```

### Issue: "Case not found or not published"

**Cause**: Migrations not run or case not marked as published

**Fix**:
```sql
-- Check if case exists
SELECT id, title, published FROM cases;

-- If exists but not published
UPDATE cases SET published = true WHERE title = 'Air Panama Revenue Growth';
```

### Issue: "Microphone access denied"

**Cause**: Browser blocked microphone permissions

**Fix**:
1. Click the lock icon in browser address bar
2. Set "Microphone" to "Allow"
3. Refresh page

### Issue: "Tool call failed: 401 Unauthorized"

**Cause**: User not authenticated or session expired

**Fix**:
1. Sign out and sign back in via Echo
2. Or use demo mode (works without auth for create-attempt)

### Issue: AI doesn't use calc_basic

**Cause**: System prompt may need strengthening or tool not properly registered

**Fix**: Check VoiceSessionV3.tsx line 140 - ensure tools are registered:
```typescript
tools: REALTIME_TOOL_DEFINITIONS,
tool_choice: 'auto',
```

### Issue: RLS blocking legitimate queries

**Cause**: Row Level Security policies too restrictive

**Fix**: Check policies in Supabase dashboard:
```sql
-- View policies
SELECT * FROM pg_policies WHERE tablename = 'cases';

-- Temporarily disable RLS for testing (NOT for production)
ALTER TABLE cases DISABLE ROW LEVEL SECURITY;
```

## 📊 Monitoring

### Database Events

Monitor case_events table for activity:

```sql
-- Recent events
SELECT
  ce.created_at,
  ce.event_type,
  ca.user_id,
  c.title as case_title,
  ce.payload
FROM case_events ce
JOIN case_attempts ca ON ca.id = ce.attempt_id
JOIN cases c ON c.id = ca.case_id
ORDER BY ce.created_at DESC
LIMIT 20;
```

### Active Sessions

```sql
-- In-progress interviews
SELECT
  ca.id,
  ca.user_id,
  c.title,
  ca.current_section,
  ca.started_at,
  EXTRACT(EPOCH FROM (NOW() - ca.started_at))/60 as duration_minutes
FROM case_attempts ca
JOIN cases c ON c.id = ca.case_id
WHERE ca.state = 'in_progress'
ORDER BY ca.started_at DESC;
```

### Tool Usage Analytics

```sql
-- Tool call frequency
SELECT
  payload->>'section' as section,
  COUNT(*) as tool_calls
FROM case_events
WHERE event_type IN ('calculation_performed', 'hint_revealed', 'response_scored')
GROUP BY payload->>'section'
ORDER BY tool_calls DESC;
```

## 🚀 Production Deployment

### Pre-flight Checklist

- [ ] Run migrations in production Supabase
- [ ] Seed production cases
- [ ] Verify RLS policies are enabled
- [ ] Set `NEXT_PUBLIC_VOICE_SESSION_V2_ENABLED=false` initially
- [ ] Test with beta users first
- [ ] Monitor error rates and latency
- [ ] Set up alerting for tool failures

### Gradual Rollout

```bash
# Phase 1: Internal testing
NEXT_PUBLIC_VOICE_SESSION_V2_ENABLED=true (for staff only)

# Phase 2: Beta users
# Add feature flag check based on user ID or cohort

# Phase 3: Full launch
NEXT_PUBLIC_VOICE_SESSION_V2_ENABLED=true (for all)
```

### Performance Targets

- **Tool Latency**: <500ms p95
- **Session Init**: <3s
- **Audio Latency**: <200ms
- **Uptime**: >99.5%

### Cost Monitoring

Voice V2 uses:
- OpenAI Realtime API (charged per audio minute)
- Supabase database (charged per request)

Monitor usage in:
- OpenAI dashboard: `https://platform.openai.com/usage`
- Supabase dashboard: Database tab → Usage

## 📚 Additional Resources

- [Architecture Documentation](./readme.md)
- [Implementation Status](./IMPLEMENTATION_STATUS.md)
- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)

## 🆘 Support

If you encounter issues:

1. Check the [Troubleshooting](#-troubleshooting) section
2. Review browser console for errors
3. Check Supabase logs for database errors
4. Review server logs for API errors
5. Open an issue on GitHub

---

**Last Updated**: October 11, 2025
**Status**: Production Ready
