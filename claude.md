# CaserAI Frontend Codebase Analysis

## Executive Summary

**Status**: MVP-ready Next.js 15 + Supabase application with mock auth
**Tech Stack**: Next.js 15, React 19, Supabase (SSR), TypeScript, Tailwind CSS
**LLM Integration**: Vercel AI SDK with OpenAI GPT-4o-mini (NOT using Echo SDK yet)
**Voice**: Browser Web Speech API (recognition + synthesis)

### Current State
- ✅ Supabase client/server setup complete
- ✅ Mock authentication system (bypasses Supabase Auth for hackathon)
- ✅ Case interview flow working (select case → voice interview → feedback)
- ✅ Basic voice loop (Web Speech API)
- ❌ **NO `case_content` or `case_exhibits` tables** - using `cases` table only
- ❌ **NO Echo SDK** - direct OpenAI calls via Vercel AI SDK
- ❌ **NO real exhibits** - placeholder UI only

---

## 1. ROUTING & PAGE ROLES

### Route Map

```
/ (landing)
  └─ app/page.tsx
     ├─ Auth state: None (public)
     ├─ CTA: Links to /auth/login, /auth/sign-up
     └─ Echo gate: FUTURE - "Sign up" could be Echo paywall entry

/auth/login
  └─ app/auth/login/page.tsx
     ├─ Auth state: Redirects to /dashboard if authenticated
     ├─ Mock auth: Calls /api/auth/mock-signin
     └─ Echo gate: FUTURE - Replace mock auth with Echo Auth SDK

/auth/sign-up
  └─ app/auth/sign-up/page.tsx
     └─ Similar to login (not examined in detail)

/dashboard
  └─ app/dashboard/page.tsx
     ├─ Auth state: getMockSession() @ line 11, redirects to login if false
     ├─ Supabase reads:
     │  - profiles (line 26)
     │  - user_stats (line 29)
     │  - cases (line 32) ← SOURCE OF TRUTH for case list
     │  - interviews + feedback (line 35-42)
     ├─ **CASE CONTENT**: Fetched from `cases` table @ line 32
     │  - Fields: title, description, industry, difficulty, case_type, estimated_duration
     │  - NO separate `case_content` table
     ├─ Echo gate: FUTURE - Display usage limits, upgrade CTA
     └─ Navigation: "Start Case" → /interview/[case_id]

/interview/[id]
  └─ app/interview/[id]/page.tsx
     ├─ Auth state: getMockSession() @ line 9
     ├─ Supabase reads:
     │  - cases.select("*").eq("id", id) @ line 17 ← SINGLE CASE FETCH
     ├─ Supabase writes:
     │  - interviews.insert() @ line 31-39 (skipped for demo user)
     ├─ **CASE CONTENT**: Passed to VoiceInterviewClient @ line 49
     │  - caseData prop includes: id, title, description, prompt, industry, difficulty
     │  - NO `case_content` table - using `cases.prompt` field
     ├─ Component: VoiceInterviewClient (client component)
     ├─ Echo gate: FUTURE - Check usage quota before allowing interview start
     └─ Navigation: End interview → /interview/[id]/feedback

/interview/[id] (VoiceInterviewClient component)
  └─ components/voice-interview-client.tsx
     ├─ Auth state: Uses passed userId prop
     ├─ Voice UI:
     │  - Web Speech Recognition (line 48-92)
     │  - Web Speech Synthesis (line 153-169)
     │  - AudioVisualizer component (line 259)
     ├─ **EXHIBIT RENDERING**:
     │  - DataExhibitSlideover @ line 242
     │  - **HARD-CODED** sampleExhibits @ line 323-336
     │  - FUTURE: Fetch from `case_exhibits` table by case_id
     ├─ LLM calls:
     │  - POST /api/interview/chat @ line 128-136
     │  - Sends: messages[], caseContext, interviewId
     ├─ Session summary:
     │  - Transcript stored in messages state (line 33)
     │  - Duration tracked via startTimeRef (line 42, 203)
     │  - Saved to interviews.transcript @ line 212
     └─ Navigation: endInterview() @ line 199 → /interview/[id]/feedback

/interview/[id]/feedback
  └─ app/interview/[id]/feedback/page.tsx
     ├─ Auth state: getMockSession() @ line 15
     ├─ Demo mode: Generates mock feedback if id.startsWith("demo-")
     ├─ Supabase reads:
     │  - interviews + cases + feedback @ line 43-47
     │  - All user interviews for trend chart @ line 60-65
     ├─ Supabase writes:
     │  - feedback.insert() @ line 275 (if missing)
     ├─ **SESSION SUMMARY UI**: Rendered by renderFeedbackPage() @ line 103-267
     │  - Overall score display @ line 133
     │  - Performance breakdown @ line 146-177
     │  - Radar chart @ line 179-187
     │  - Trend chart (if multiple interviews) @ line 190-200
     │  - Strengths/improvements @ line 202-240
     │  - Detailed feedback @ line 242-249
     ├─ Echo gate: FUTURE - Upsell "Get detailed video feedback" for premium
     └─ Navigation: Back to dashboard @ line 252-262

/api/interview/chat
  └─ app/api/interview/chat/route.ts
     ├─ Auth: getMockSession() @ line 8
     ├─ LLM Provider: OpenAI GPT-4o-mini via Vercel AI SDK @ line 45-56
     ├─ Input: messages[], caseContext, interviewId
     ├─ System prompt: Built from caseContext @ line 13-43
     ├─ **NOT using Echo SDK** - direct generateText() call
     ├─ Echo integration point: REPLACE generateText with Echo metered call
     └─ Returns: { message: text }

/api/interview/feedback
  └─ app/api/interview/feedback/route.ts
     ├─ Auth: supabase.auth.getUser() @ line 10 (REAL AUTH, not mock)
     ├─ LLM Provider: OpenAI GPT-4o-mini @ line 59-66
     ├─ Supabase reads: interviews + cases @ line 17
     ├─ Supabase writes: feedback @ line 88-95, user_stats @ line 104-112
     ├─ Echo integration point: Meter this expensive analysis call
     └─ Returns: { feedback }

/api/interview/analyze
  └─ app/api/interview/analyze/route.ts
     ├─ Auth: supabase.auth.getUser() @ line 10
     ├─ Purpose: Real-time analysis (NOT currently used in UI)
     ├─ Echo integration point: Could be premium feature
     └─ Returns: { analysis }

/api/auth/mock-signin
  └─ app/api/auth/mock-signin/route.ts
     ├─ Sets mock session cookie @ line 5
     └─ Echo integration point: REPLACE with Echo Auth SDK
```

---

## 2. SUPABASE INTEGRATION AUDIT

### Client Initialization

**Browser Client** (lib/supabase/client.ts:3-5)
```typescript
createBrowserClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)
```

**Server Client** (lib/supabase/server.ts:4-23)
```typescript
createServerClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  { cookies: { getAll, setAll } }
)
```

**Middleware Client** (lib/supabase/middleware.ts:9-26)
- Used in middleware.ts but currently BYPASSED by mock auth

### Authentication Flow

**Current**: Mock authentication system (lib/auth/mock-auth.ts)
- Mock user ID: `00000000-0000-0000-0000-000000000001`
- Cookie-based session: `mock-auth-session`
- Bypasses Supabase Auth entirely
- Used in: middleware.ts, dashboard/page.tsx, interview pages

**Future**: Replace with Echo SDK authentication
- Entry point: /auth/login/page.tsx:20-22 (handleLogin function)
- Remove: lib/auth/mock-auth.ts
- Add: Echo Auth SDK initialization

### Database Tables Used

**Existing Tables** (from scripts/001_create_schema.sql):
1. **profiles** - User profiles linked to auth.users
   - RLS enabled ✅
   - Mock user policy @ scripts/004_setup_mock_user_bypass.sql:39-40

2. **cases** - Interview case scenarios
   - RLS enabled ✅ (public read)
   - Fields: title, description, industry, difficulty, case_type, estimated_duration, **prompt**, key_concepts
   - **SOURCE OF TRUTH** for case content (no separate case_content table)
   - Queried in:
     - dashboard/page.tsx:32 (list all)
     - interview/[id]/page.tsx:17 (single case)

3. **interviews** - User interview sessions
   - RLS enabled ✅
   - Fields: user_id, case_id, status, **transcript (JSONB)**, duration, completed_at
   - Queried in:
     - dashboard/page.tsx:35-42 (recent interviews)
     - interview/[id]/feedback/page.tsx:43-47 (single interview)
   - Updated in:
     - voice-interview-client.tsx:206-214 (save transcript on end)

4. **feedback** - AI-generated interview feedback
   - RLS enabled ✅
   - Fields: interview_id, overall_score, structure_score, analysis_score, communication_score, strengths[], areas_for_improvement[], detailed_feedback
   - Generated by: api/interview/feedback/route.ts:88-95

5. **user_stats** - User progress tracking
   - RLS enabled ✅
   - Fields: total_interviews, completed_interviews, average_score, current_streak, last_interview_date
   - Updated in: api/interview/feedback/route.ts:104-112

**MISSING Tables** (expected but NOT found):
- ❌ **case_content** - Does NOT exist
  - Replaced by `cases.prompt` field
  - FUTURE: Could separate case metadata from content

- ❌ **case_exhibits** - Does NOT exist
  - Exhibit data is **HARD-CODED** in voice-interview-client.tsx:323-336
  - FUTURE: Create table with schema:
    ```sql
    CREATE TABLE case_exhibits (
      id UUID PRIMARY KEY,
      case_id UUID REFERENCES cases(id),
      label TEXT,  -- "Chart 1", "Table 2"
      image_url TEXT,
      chart_summary TEXT,  -- For LLM context
      display_order INT
    )
    ```

### RLS Policies

**Active Policies**:
- All tables have RLS enabled
- Mock user bypass policies @ scripts/004_setup_mock_user_bypass.sql:38-56
- User-scoped policies for profiles, interviews, feedback, user_stats
- Public read for cases table

**Echo Integration Note**:
- When switching to Echo Auth, verify RLS policies work with Echo's user model
- May need to map Echo user IDs to Supabase auth.users

---

## 3. CASE CONTENT & EXHIBITS - SOURCE OF TRUTH

### Current Implementation

**Case Content**:
- ✅ Stored in `cases` table (scripts/001_create_schema.sql:10-22)
- ✅ Fields used:
  - `title` - Case name
  - `description` - Short summary
  - `prompt` - Initial interviewer message (SOURCE OF TRUTH for LLM context)
  - `industry`, `difficulty`, `case_type` - Metadata
  - `key_concepts` - Array of learning objectives
- ✅ Fetched in:
  - dashboard/page.tsx:32 (all cases)
  - interview/[id]/page.tsx:17 (single case)
- ✅ Passed to LLM in:
  - api/interview/chat/route.ts:13-43 (system prompt construction)

**Case Exhibits**:
- ❌ **TEMP HARD-CODE** in voice-interview-client.tsx:323-336
  ```typescript
  const sampleExhibits = [
    { id: "1", title: "Market Size Analysis", type: "chart", data: {} },
    { id: "2", title: "Revenue Breakdown", type: "table", data: {} },
  ]
  ```
- ❌ NO database fetch
- ❌ NO image URLs
- ❌ NO chart summaries for LLM context

### Recommended Migration Plan

**Phase 1: Minimal (Hackathon)**
- Keep hard-coded exhibits in component
- Add single static chart image to public/exhibits/chart1.png
- Update DataExhibitSlideover to render image

**Phase 2: Database Migration**
1. Create `case_exhibits` table:
   ```sql
   CREATE TABLE case_exhibits (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     case_id UUID NOT NULL REFERENCES cases(id),
     label TEXT NOT NULL,  -- "Chart 1"
     image_url TEXT NOT NULL,  -- "/exhibits/case1-chart1.png"
     chart_summary TEXT,  -- "Bar chart showing market size by segment"
     display_order INT DEFAULT 0,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. Seed exhibits for each case in scripts/003_seed_exhibits.sql

3. Update VoiceInterviewClient:
   - Add useEffect to fetch exhibits by case_id
   - Replace sampleExhibits with fetched data
   - Location: voice-interview-client.tsx:323 (replace hard-coded array)

4. Update DataExhibitSlideover:
   - Render actual images from image_url
   - Location: data-exhibit-slideover.tsx:68-74 (replace placeholder)

5. Update LLM context:
   - Include exhibit summaries in /api/interview/chat system prompt
   - Location: api/interview/chat/route.ts:13 (add exhibits to context)

**Future Fetch Hook Location**:
```typescript
// voice-interview-client.tsx (add after line 43)
const [exhibits, setExhibits] = useState<DataExhibit[]>([])

useEffect(() => {
  async function fetchExhibits() {
    const { data } = await supabase
      .from('case_exhibits')
      .select('*')
      .eq('case_id', caseData.id)
      .order('display_order')

    if (data) setExhibits(data)
  }
  fetchExhibits()
}, [caseData.id])
```

---

## 4. COMPONENT MAP

### Core Components

#### VoiceInterviewClient
**Location**: components/voice-interview-client.tsx
**Purpose**: Main interview UI with voice interaction
**Props**:
- `caseData` - Case metadata from Supabase (title, description, prompt, etc.)
- `interviewId` - Interview session ID
- `userId` - Current user ID

**State**:
- `messages: Message[]` - Conversation transcript (line 33)
- `isListening: boolean` - Mic active state (line 31)
- `isSpeaking: boolean` - AI speaking state (line 32)
- `interimTranscript: string` - Live speech recognition (line 34)
- `hasStarted: boolean` - Interview started flag (line 35)

**Supabase Usage**:
- Client init @ line 41: `const supabase = createClient()`
- Write transcript @ line 206-214: `interviews.update({ transcript, duration })`

**Voice UI**:
- Web Speech Recognition setup @ line 48-92
  - Continuous mode, interim results
  - Auto-restart on end (line 88-91)
- Web Speech Synthesis @ line 153-169
  - Rate 0.95, pitch 1
  - Speaking state tracking
- AudioVisualizer @ line 259 (visual feedback)

**Exhibit Rendering**:
- DataExhibitSlideover @ line 242
- **TEMP HARD-CODE** @ line 323-336
- FUTURE: Replace with fetch from `case_exhibits` table

**LLM Integration**:
- Chat API call @ line 128-136
- Payload: `{ messages, caseContext, interviewId }`
- Response: `{ message }` → spoken via TTS

**Echo Integration Points**:
- Line 128: Check usage quota before API call
- Line 172: Meter voice synthesis usage
- Line 199: Save session data for billing

#### DataExhibitSlideover
**Location**: components/data-exhibit-slideover.tsx
**Purpose**: Sidebar to display case exhibits (charts, tables, images)
**Props**:
- `exhibits?: DataExhibit[]` - Array of exhibits (optional)

**State**:
- `isOpen: boolean` - Slideover visibility (line 21)

**Current Rendering**:
- Placeholder UI @ line 68-74
- Shows type labels: "Chart visualization", "Table data", "Image exhibit"
- NO actual data rendering

**FUTURE Fetch Location**:
- Props will come from VoiceInterviewClient parent
- Parent fetches from `case_exhibits` by case_id
- Update rendering @ line 68-74 to show actual images:
  ```tsx
  {exhibit.type === "chart" && (
    <img src={exhibit.image_url} alt={exhibit.title} />
  )}
  ```

**Echo Integration**:
- Could gate advanced exhibits behind paywall
- "Unlock detailed financial model" CTA

#### AudioVisualizer
**Location**: components/audio-visualizer.tsx
**Purpose**: Animated blob and waveform during voice interaction
**Props**:
- `isActive: boolean` - AI speaking state
- `isListening: boolean` - User speaking state

**UI Elements**:
- Yellow blob with morph animation (line 57-84)
- Canvas waveform bars when listening (line 88)
- No Supabase or state dependencies

**Echo Integration**: None needed

#### PerformanceRadarChart
**Location**: components/performance-radar-chart.tsx
**Purpose**: Radar chart for feedback scores
**Props**: `data` - Array of { category, score }
**Echo Integration**: Premium feature - detailed analytics

#### TrendChart
**Location**: components/trend-chart.tsx
**Purpose**: Line chart showing progress over time
**Props**: `data` - Array of { date, score }
**Echo Integration**: Could limit to last 3 interviews for free tier

### UI Component Library
**Location**: components/ui/
**Purpose**: Shadcn/ui components (Button, Card, Dialog, etc.)
**Note**: No business logic, pure presentation
**v0 Artifacts**: All files auto-generated by v0, safe to regenerate if needed

---

## 5. VOICE LOOP IMPLEMENTATION

### Current Implementation (Web Speech API)

**Recognition** (voice-interview-client.tsx:48-92):
```typescript
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
recognitionRef.current = new SpeechRecognition()
recognitionRef.current.continuous = true
recognitionRef.current.interimResults = true
recognitionRef.current.lang = "en-US"

recognitionRef.current.onresult = (event) => {
  // Extract final transcript → add to messages → call AI
}
```

**Synthesis** (voice-interview-client.tsx:153-169):
```typescript
const utterance = new SpeechSynthesisUtterance(text)
utterance.rate = 0.95
utterance.pitch = 1
window.speechSynthesis.speak(utterance)
```

**Flow**:
1. User clicks mic button → `toggleListening()` @ line 184
2. Recognition starts → interim results displayed @ line 268-271
3. Final transcript → `handleAIResponse()` @ line 126
4. POST /api/interview/chat → LLM response
5. TTS speaks response → `speakText()` @ line 153
6. Repeat until user ends interview @ line 199

### Limitations & Future Improvements

**Current Issues**:
- Browser compatibility (Safari partial support)
- No offline support
- Quality varies by browser
- No custom voice selection

**MVP Plan (Keep Web Speech API)**:
- ✅ Works for hackathon demo
- ✅ No additional API costs
- ⚠️ Add browser compatibility warning
- ⚠️ Fallback to text mode if unsupported

**Future Enhancements**:
- Integrate premium TTS (ElevenLabs, Azure)
- Better voice selection (male/female interviewer)
- Noise cancellation
- Interrupt handling (user can interrupt AI)

### Echo Integration for Voice

**Metering Points**:
1. Voice recognition minutes (line 55-80)
   - Track duration of user speech
   - Free tier: 30 min/month
   - Premium: Unlimited

2. TTS synthesis (line 153-169)
   - Track characters spoken
   - Free tier: 10k characters/month
   - Premium: Unlimited

3. Combined "interview minutes" metric
   - Track total session duration
   - Easier UX than separate voice/TTS limits

---

## 6. ECHO SDK INTEGRATION PLAN

### Current LLM Architecture (NO Echo SDK)

**Provider**: OpenAI GPT-4o-mini via Vercel AI SDK
**Location**: app/api/interview/chat/route.ts:45-56
```typescript
import { generateText } from "ai"

const { text } = await generateText({
  model: "openai/gpt-4o-mini",
  messages: [...],
  temperature: 0.7,
  maxTokens: 200,
})
```

**Missing**:
- ❌ No usage metering
- ❌ No auth integration
- ❌ No cost tracking
- ❌ No rate limiting

### Echo SDK Integration Strategy

#### Phase 1: Auth Integration

**Replace Mock Auth** (app/auth/login/page.tsx):
```typescript
import { EchoAuth } from '@echo/sdk'

async function handleLogin() {
  const session = await EchoAuth.signIn({
    provider: 'email',
    // or 'google', 'github', etc.
  })

  if (session) {
    // Map Echo user to Supabase profile
    await createOrUpdateProfile(session.user)
    router.push('/dashboard')
  }
}
```

**Files to Modify**:
- app/auth/login/page.tsx:15-32 (replace handleLogin)
- app/auth/sign-up/page.tsx (similar changes)
- lib/auth/mock-auth.ts (DELETE entire file)
- middleware.ts:5-21 (use Echo session check)

**Supabase Profile Sync**:
- Create server action to sync Echo user → profiles table
- Map Echo user.id → profiles.id (may need migration)
- Update RLS policies to check Echo session

#### Phase 2: Metered Chat API

**Replace Direct OpenAI Call** (app/api/interview/chat/route.ts):
```typescript
import { EchoClient } from '@echo/sdk'

const echo = new EchoClient({
  apiKey: process.env.ECHO_API_KEY,
  userId: session.user.id,
})

const response = await echo.chat.complete({
  messages: [...],
  model: 'gpt-4o-mini',
  metadata: {
    interviewId,
    caseId: caseContext.id,
    feature: 'case-interview',
  }
})

// Echo automatically tracks:
// - Tokens used
// - Cost
// - Rate limits
// - User quota
```

**Files to Modify**:
- app/api/interview/chat/route.ts:4-62 (replace generateText)
- app/api/interview/feedback/route.ts:1-119 (meter feedback generation)
- app/api/interview/analyze/route.ts (if used)

**Usage Tracking**:
- Echo SDK auto-meters each call
- Dashboard shows real-time usage
- Enforce limits before API call:
  ```typescript
  const canProceed = await echo.checkQuota('chat-messages')
  if (!canProceed) {
    return Response.json({
      error: 'Usage limit reached',
      upgrade_url: echo.getUpgradeUrl()
    }, { status: 429 })
  }
  ```

#### Phase 3: Paywall UI

**Dashboard Quota Display** (app/dashboard/page.tsx):
- Add usage widget showing:
  - Interviews used this month
  - Messages remaining
  - Voice minutes remaining
- Location: After stats cards @ line 136
- CTA: Upgrade button if approaching limit

**Interview Limit Gate** (app/interview/[id]/page.tsx):
- Check quota before creating interview @ line 31
- Show upgrade modal if exceeded
- Echo provides pre-built paywall components

**Feedback Upsell** (app/interview/[id]/feedback/page.tsx):
- Free tier: Basic scores only
- Premium: Detailed feedback, video replay, coach recommendations
- CTA location: @ line 250 (before action buttons)

#### Phase 4: Plan Configuration

**Echo Dashboard Setup**:
```yaml
plans:
  free:
    price: $0/month
    limits:
      interviews: 3/month
      chat_messages: 100/month
      voice_minutes: 30/month

  pro:
    price: $29/month
    limits:
      interviews: unlimited
      chat_messages: unlimited
      voice_minutes: unlimited
    features:
      - detailed_feedback
      - progress_analytics
      - custom_cases

  enterprise:
    price: custom
    features:
      - team_analytics
      - white_label
      - api_access
```

**Metering Keys**:
- `interviews` - Track interview sessions created
- `chat_messages` - Track LLM API calls
- `voice_minutes` - Track TTS/STT usage (future)

### Migration Checklist

**Prerequisites**:
- [ ] Echo account + API keys
- [ ] Define plan tiers in Echo dashboard
- [ ] Test Echo Auth in staging

**Code Changes**:
- [ ] Install `@echo/sdk` package
- [ ] Replace mock auth with Echo Auth (3 files)
- [ ] Replace direct OpenAI with Echo client (3 files)
- [ ] Add quota checks before expensive operations
- [ ] Add usage widgets to dashboard
- [ ] Add upgrade CTAs (3 locations)
- [ ] Update RLS policies for Echo users
- [ ] Test full flow: signup → interview → paywall

**Data Migration**:
- [ ] Sync existing mock users to Echo (if needed)
- [ ] Map user IDs: mock UUID → Echo user ID
- [ ] Migrate interviews/feedback to new user IDs

**Deployment**:
- [ ] Set ECHO_API_KEY env var
- [ ] Update CORS settings for Echo
- [ ] Test webhook endpoints (if using)
- [ ] Monitor quota enforcement

---

## 7. KEY FINDINGS & RECOMMENDATIONS

### Critical Issues

**1. MISSING EXHIBITS INFRASTRUCTURE**
- Status: **UNKNOWN** - `case_exhibits` table does NOT exist
- Impact: Can't show real charts to users
- Hard-coded placeholders @ voice-interview-client.tsx:323-336
- Recommendation:
  - MVP: Add 1 static chart per case to public/exhibits/
  - Post-hackathon: Create `case_exhibits` table + seed data
  - Long-term: Support dynamic chart generation

**2. CASE CONTENT ARCHITECTURE**
- Current: Single `cases` table holds everything
- Future: May want to separate `case_content` for:
  - Multi-language support
  - A/B testing different prompts
  - Version history
- Recommendation: Keep as-is for MVP, migrate later if needed

**3. AUTH BYPASS CREATES TECH DEBT**
- Mock auth works but adds complexity
- RLS policies have special mock user exceptions
- Recommendation: Prioritize Echo Auth integration post-hackathon

### Performance Optimizations

**1. Parallel Data Fetching**
- dashboard/page.tsx fetches 4 queries sequentially (lines 26-42)
- Recommendation: Use Promise.all() for parallel fetching

**2. Voice Loop Latency**
- Current: Waits for full TTS before re-enabling mic
- Recommendation: Add "interrupt" feature to cancel TTS mid-speech

**3. LLM Response Caching**
- Common case prompts could be pre-generated
- Recommendation: Cache initial greeting per case

### Developer Experience

**1. Type Safety**
- Some `any` types in voice-interview-client.tsx (line 38, 142)
- Recommendation: Generate TypeScript types from Supabase schema

**2. Error Handling**
- Most Supabase queries use `try/catch` but swallow errors
- Recommendation: Add proper error UI + logging

**3. Testing**
- No test files found
- Recommendation: Add E2E tests for critical flow (signup → interview → feedback)

### Security Notes

**1. Environment Variables**
- Requires: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY
- Future: ECHO_API_KEY (server-only)
- All properly scoped (public vs server)

**2. RLS Policies**
- Well-configured for user data isolation
- Mock user bypass is acceptable for demo
- Will need review when switching to Echo Auth

**3. API Routes**
- Auth checks present in all routes ✅
- Some use mock auth, some use real Supabase auth (inconsistent)
- Recommendation: Standardize on Echo Auth

---

## 8. NEXT STEPS FOR HACKATHON

### Must-Have (MVP)
1. ✅ Voice loop working (DONE)
2. ✅ Basic case flow (DONE)
3. ✅ Feedback generation (DONE)
4. ⚠️ Add 1 real exhibit per case
   - Create public/exhibits/ folder
   - Add sample charts as PNG/JPG
   - Update DataExhibitSlideover to render images
5. ⚠️ Replace hard-coded exhibits with real data
   - Update voice-interview-client.tsx:323-336
   - Fetch from Supabase or use static imports

### Should-Have (Polish)
1. Loading states for all async operations
2. Error boundaries for voice/LLM failures
3. Mobile-responsive voice UI
4. Browser compatibility warnings
5. Better transcript visualization

### Could-Have (Future)
1. Echo SDK integration (full plan above)
2. `case_exhibits` table + dynamic fetching
3. Advanced analytics charts
4. Multi-language support
5. Custom case creator (admin panel)

---

## 9. FILE REFERENCE INDEX

### Critical Files
- **voice-interview-client.tsx** - Main interview UI, voice loop, exhibit rendering
- **app/interview/[id]/page.tsx** - Entry point, case fetching, session creation
- **app/api/interview/chat/route.ts** - LLM integration point (replace with Echo)
- **app/dashboard/page.tsx** - Case list, usage stats (add Echo widgets)
- **scripts/001_create_schema.sql** - Database schema (NO case_exhibits!)

### Supabase Integration
- **lib/supabase/client.ts** - Browser client
- **lib/supabase/server.ts** - Server client (use in API routes)
- **lib/supabase/middleware.ts** - Auth middleware (currently bypassed)

### Auth System
- **lib/auth/mock-auth.ts** - Mock auth (DELETE when migrating to Echo)
- **app/auth/login/page.tsx** - Login UI (Echo integration entry point)
- **middleware.ts** - Route protection (uses mock auth)

### Components Needing Updates
- **components/data-exhibit-slideover.tsx** - Exhibit rendering (add real images)
- **components/voice-interview-client.tsx** - Echo quota checks + exhibit fetch

### Schema & Migrations
- **scripts/001_create_schema.sql** - Core tables
- **scripts/002_seed_cases.sql** - Case data
- **scripts/004_setup_mock_user_bypass.sql** - Demo user RLS bypass

---

**End of Analysis** | Generated: 2025-10-10 | Source: CaserAI Frontend v0 Export
