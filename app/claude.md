# Routing & Page Roles - CaserAI

## Application Flow Map

```
┌─────────────┐
│   LANDING   │ / (public)
│   page.tsx  │
└──────┬──────┘
       │
       ├─ Sign up ────────┐
       └─ Sign in ────────┤
                          ▼
                   ┌──────────────┐
                   │  AUTH PAGES  │ /auth/*
                   │              │
                   │ - login      │ ← Mock auth (temp)
                   │ - sign-up    │ ← Echo entry point
                   └──────┬───────┘
                          │
                          ▼
                   ┌──────────────┐
                   │  DASHBOARD   │ /dashboard
                   │              │
                   │ - View stats │ ← Supabase: profiles, user_stats, cases
                   │ - Start case │ ← Echo: quota display
                   └──────┬───────┘
                          │
                          ▼
                   ┌──────────────────────┐
                   │  INTERVIEW SESSION   │ /interview/[id]
                   │                      │
                   │ - Voice loop         │ ← Web Speech API
                   │ - LLM chat           │ ← /api/interview/chat (no Echo yet)
                   │ - View exhibits      │ ← Hard-coded (no DB)
                   │ - End interview      │ ← Supabase: save transcript
                   └──────┬───────────────┘
                          │
                          ▼
                   ┌──────────────────────┐
                   │  FEEDBACK PAGE       │ /interview/[id]/feedback
                   │                      │
                   │ - View scores        │ ← Supabase: feedback table
                   │ - See trends         │ ← Supabase: all interviews
                   │ - Start next case    │ ← Echo: upsell premium
                   └──────────────────────┘
```

---

## Page-by-Page Analysis

### 1. Landing Page (/)

**File**: `app/page.tsx`
**Type**: Server Component (default)
**Purpose**: Marketing landing page with feature showcase

#### Auth State
- **Read**: NONE (public page)
- **Protection**: None needed
- **Redirect**: None

#### UI Structure
```typescript
Header (lines 10-27)
  ├─ Logo + "CasePrep AI"
  ├─ Sign in link ────→ /auth/login
  └─ Get started CTA ─→ /auth/sign-up

Hero Section (lines 30-54)
  ├─ Headline: "Master case interviews with voice-first AI"
  ├─ Start practicing CTA ─→ /auth/sign-up
  └─ Sign in CTA ─────────→ /auth/login

Features Grid (lines 57-107)
  ├─ Voice-First Experience
  ├─ Real Case Scenarios
  ├─ Instant Feedback
  └─ Track Progress

Bottom CTA (lines 110-125)
  └─ Get started button ──→ /auth/sign-up

Footer (lines 129-133)
```

#### Supabase Consumption
**NONE** - Static marketing page

#### Echo Integration Points

**🔐 Auth Entry** (lines 19, 23, 41, 48, 118):
```typescript
// CURRENT (mock auth):
<Link href="/auth/sign-up">
  <Button>Get started</Button>
</Link>

// FUTURE (Echo SDK):
import { EchoAuth } from '@echo/sdk'

<EchoAuth.SignUpButton
  onSuccess={(session) => router.push('/dashboard')}
  mode="modal"  // or "redirect"
>
  Get started
</EchoAuth.SignUpButton>
```

**💰 Pricing Teaser** (ADD before footer):
```typescript
<section className="container mx-auto px-4 py-20">
  <h2 className="text-3xl font-bold text-center mb-12">
    Choose Your Plan
  </h2>
  <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
    {/* Free, Pro, Enterprise cards */}
  </div>
</section>
```

#### Page Summary
| Aspect | Status | Future Action |
|--------|--------|---------------|
| **Auth Links** | ✅ Working | Replace with Echo components |
| **Content** | ✅ Static | Add pricing section |
| **SEO** | ⚠️ Basic | Add metadata in layout.tsx |
| **Analytics** | ✅ Vercel | Consider Echo event tracking |

---

### 2. Login Page (/auth/login)

**File**: `app/auth/login/page.tsx`
**Type**: Client Component (`"use client"`)
**Purpose**: Mock authentication entry point

#### Auth State
- **Read**: None (handled by middleware)
- **Write**: Sets mock session cookie @ line 20-22
- **Redirect**: To /dashboard on success @ line 25

#### Current Implementation

**Mock Auth Flow** (lines 15-32):
```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)

  try {
    const response = await fetch("/api/auth/mock-signin", {
      method: "POST",
    })

    if (response.ok) {
      router.push("/dashboard")  // ← Redirect after auth
    }
  } catch (error) {
    console.error("Mock sign in error:", error)
  } finally {
    setIsLoading(false)
  }
}
```

**API Route** (`/api/auth/mock-signin/route.ts:1-7`):
```typescript
import { setMockSession } from "@/lib/auth/mock-auth"

export async function POST() {
  await setMockSession()  // Sets cookie: mock-auth-session=true
  return NextResponse.json({ success: true })
}
```

**Mock Session Helper** (`lib/auth/mock-auth.ts:8-17`):
```typescript
export async function setMockSession() {
  const cookieStore = await cookies()
  cookieStore.set(MOCK_AUTH_COOKIE, "true", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,  // 1 week
    path: "/",
  })
}
```

#### 🎯 Echo SDK Migration

**STEP 1: Install Echo SDK**
```bash
pnpm add @echo/sdk
```

**STEP 2: Replace handleLogin** (lines 15-32):
```typescript
import { EchoAuth } from '@echo/sdk'

const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)

  try {
    const session = await EchoAuth.signIn({
      provider: 'email',
      email: formData.email,
      password: formData.password,
    })

    if (session) {
      // Sync Echo user to Supabase profile
      await syncEchoUserToSupabase(session.user)

      router.push("/dashboard")
    }
  } catch (error) {
    console.error("Echo sign in error:", error)
    setError(error.message)
  } finally {
    setIsLoading(false)
  }
}
```

**STEP 3: Create Profile Sync** (new file `lib/auth/echo-sync.ts`):
```typescript
import { createClient } from '@/lib/supabase/server'

export async function syncEchoUserToSupabase(echoUser: any) {
  const supabase = await createClient()

  // Insert or update profile
  await supabase
    .from('profiles')
    .upsert({
      id: echoUser.id,  // Use Echo user ID
      email: echoUser.email,
      full_name: echoUser.name,
      updated_at: new Date().toISOString(),
    })

  // Initialize user stats
  await supabase
    .from('user_stats')
    .insert({
      user_id: echoUser.id,
    })
    .onConflict('user_id')
    .ignore()
}
```

**STEP 4: Update Middleware** (`middleware.ts:5-21`):
```typescript
import { EchoAuth } from '@echo/sdk'

export async function middleware(request: NextRequest) {
  const session = await EchoAuth.getSession(request)
  const isAuthenticated = !!session

  // ... rest of logic stays same
}
```

**STEP 5: Delete Mock Auth** (after migration):
- ❌ Delete `lib/auth/mock-auth.ts`
- ❌ Delete `app/api/auth/mock-signin/route.ts`
- ❌ Remove mock user RLS policies (scripts/004_setup_mock_user_bypass.sql)

#### Page Summary
| Aspect | Current | Future (Echo) |
|--------|---------|---------------|
| **Auth Method** | Mock cookie | Echo session |
| **User Storage** | Hard-coded ID | Echo + Supabase sync |
| **Session Duration** | 7 days | Configurable in Echo |
| **OAuth Support** | None | Google, GitHub, etc. |

---

### 3. Dashboard Page (/dashboard)

**File**: `app/dashboard/page.tsx`
**Type**: Server Component
**Purpose**: Main app hub - view stats, browse cases, start interviews

#### Auth State

**Read** (line 11):
```typescript
const isAuthenticated = await getMockSession()

if (!isAuthenticated) {
  redirect("/auth/login")
}
```

**User Object** (line 17):
```typescript
const mockUser = getMockUser()  // { id, email, full_name }
```

**Future (Echo)**:
```typescript
const session = await EchoAuth.getSession()
if (!session) redirect("/auth/login")

const user = session.user
```

#### Supabase Queries

**1. User Profile** (lines 26-27):
```typescript
const profileResult = await supabase
  .from("profiles")
  .select("*")
  .eq("id", mockUser.id)
  .maybeSingle()

profile = profileResult.data
```

**Used for**: Display name in header @ line 92

---

**2. User Stats** (lines 29-30):
```typescript
const statsResult = await supabase
  .from("user_stats")
  .select("*")
  .eq("user_id", mockUser.id)
  .maybeSingle()

userStats = statsResult.data
```

**Used for**: Stats cards @ lines 108-135
- Total Interviews
- Completed Interviews
- Average Score
- Current Streak

---

**3. Available Cases** (lines 32-33):
```typescript
const casesResult = await supabase
  .from("cases")
  .select("*")
  .order("difficulty", { ascending: true })

cases = casesResult.data || []
```

**⭐ SOURCE OF TRUTH for case content**

**Used for**: Case grid @ lines 172-204
- Fields displayed:
  - `title` - Case name
  - `description` - Short summary
  - `difficulty` - beginner/intermediate/advanced
  - `case_type` - market-sizing, profitability, etc.
  - `estimated_duration` - Minutes
  - `industry` - Retail, Tech, etc.

**❌ NOT using `case_content` table** - All content in `cases` table

---

**4. Recent Interviews** (lines 35-42):
```typescript
const interviewsResult = await supabase
  .from("interviews")
  .select("*, cases(*), feedback(*)")  // Joins!
  .eq("user_id", mockUser.id)
  .eq("status", "completed")
  .order("completed_at", { ascending: false })
  .limit(3)

recentInterviews = interviewsResult.data || []
```

**Used for**: Recent Interviews grid @ lines 138-167
- Shows last 3 completed interviews
- Displays case title, industry, difficulty
- Shows overall score from feedback
- Links to feedback page

#### UI Structure

```typescript
Header (lines 83-100)
  ├─ Logo + "CasePrep AI"
  ├─ Welcome message (profile.full_name)
  └─ Sign out button ─→ /api/auth/signout

Stats Cards (lines 108-135)  ← FROM user_stats
  ├─ Total Interviews
  ├─ Completed
  ├─ Average Score
  └─ Current Streak

Recent Interviews (lines 138-167)  ← FROM interviews + feedback
  └─ [Only if recentInterviews.length > 0]
      ├─ Case cards (last 3)
      └─ "View Feedback" links

Available Cases (lines 170-206)  ← FROM cases table
  └─ Case cards
      ├─ Difficulty badge (color-coded)
      ├─ Case type badge
      ├─ Title + description
      ├─ Duration + industry icons
      └─ "Start Case" button ─→ /interview/[case.id]
```

#### Echo Integration Points

**💰 Usage Widget** (ADD after stats cards @ line 136):
```typescript
import { EchoUsage } from '@echo/sdk'

<Card className="col-span-4 border-2 border-primary/20">
  <CardHeader>
    <CardTitle>Your Usage This Month</CardTitle>
  </CardHeader>
  <CardContent>
    <EchoUsage
      metrics={['interviews', 'chat_messages', 'voice_minutes']}
      showUpgradeButton={true}
    />
  </CardContent>
</Card>
```

**🔒 Quota Check** (MODIFY "Start Case" button @ line 199-201):
```typescript
import { checkQuota } from '@/lib/echo/quota'

async function startCase(caseId: string) {
  const canStart = await checkQuota('interviews')

  if (!canStart) {
    // Show paywall modal
    return (
      <Dialog>
        <DialogTitle>Interview Limit Reached</DialogTitle>
        <DialogContent>
          You've used all {planLimits.interviews} interviews this month.
          Upgrade to continue practicing!
        </DialogContent>
        <DialogFooter>
          <EchoCheckout plan="pro" />
        </DialogFooter>
      </Dialog>
    )
  }

  // Proceed to interview
  router.push(`/interview/${caseId}`)
}
```

**📊 Premium Analytics Banner** (ADD after recent interviews):
```typescript
{!isPro && recentInterviews.length > 0 && (
  <Card className="bg-gradient-to-br from-primary/10 to-primary/5 border-primary/20">
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-1">
            Unlock Detailed Analytics
          </h3>
          <p className="text-sm text-muted-foreground">
            Track your progress over time, compare to peers, get personalized recommendations
          </p>
        </div>
        <Button size="lg">
          Upgrade to Pro
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

#### Page Summary
| Data Source | Query Location | Display Location | Echo Gate |
|-------------|----------------|------------------|-----------|
| **User Profile** | Line 26 | Header @ line 92 | None |
| **User Stats** | Line 29 | Cards @ 108-135 | Add usage widget |
| **Cases** | Line 32 | Grid @ 172-204 | Quota check on start |
| **Recent Interviews** | Line 35 | Grid @ 138-167 | Premium analytics upsell |

---

### 4. Interview Page (/interview/[id])

**File**: `app/interview/[id]/page.tsx`
**Type**: Server Component
**Purpose**: Entry point for interview session, fetches case data, renders VoiceInterviewClient

#### Auth State

**Read** (lines 9-12):
```typescript
const isAuthenticated = await getMockSession()
if (!isAuthenticated) {
  redirect("/auth/login")
}
```

#### Dynamic Route Handling

**Params** (line 6-7):
```typescript
export default async function InterviewPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params  // Next.js 15 async params
}
```

#### Supabase Queries

**1. Fetch Case** (line 17):
```typescript
const { data: caseData } = await supabase
  .from("cases")
  .select("*")
  .eq("id", id)
  .single()

if (!caseData) {
  redirect("/dashboard")  // Case not found
}
```

**⭐ CASE CONTENT READ - Source of Truth**

**Fields fetched**:
- `id` - Case UUID
- `title` - Case name
- `description` - Summary
- `prompt` - **Initial interviewer message** (used as system prompt)
- `industry` - Retail, Tech, etc.
- `difficulty` - beginner/intermediate/advanced
- `case_type` - market-sizing, profitability, etc.
- `estimated_duration` - Not used in this page
- `key_concepts` - Not used in this page

**Passed to**: VoiceInterviewClient @ line 49

---

**2. Create Interview Session** (lines 31-46):
```typescript
// Check if demo user
if (mockUser.id === "00000000-0000-0000-0000-000000000001") {
  // Generate temporary ID, NO database insert
  interviewId = `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`
} else {
  // Real users: Insert into database
  const { data: interview, error } = await supabase
    .from("interviews")
    .insert({
      user_id: mockUser.id,
      case_id: id,
      status: "in-progress",
    })
    .select()
    .single()

  if (error || !interview) {
    redirect("/dashboard")
  }

  interviewId = interview.id
}
```

**Why demo bypass?**:
- Demo user doesn't exist in `auth.users` (foreign key constraint)
- RLS policies would block insert
- Allows testing without real Supabase Auth

#### Component Rendering

**VoiceInterviewClient** (line 49):
```typescript
return (
  <VoiceInterviewClient
    caseData={caseData}      // ← FROM SUPABASE (cases table)
    interviewId={interviewId} // ← GENERATED ABOVE
    userId={mockUser.id}      // ← FROM MOCK AUTH
  />
)
```

**Props flow**:
```
Supabase cases table
       ↓
   caseData object
       ↓
VoiceInterviewClient props
       ↓
- Used for initial message (caseData.prompt)
- Sent to /api/interview/chat (caseContext)
- Displayed in header (caseData.title)
```

#### Echo Integration Points

**🔒 Quota Check** (ADD before render @ line 23):
```typescript
import { checkQuota } from '@/lib/echo/quota'

const canStart = await checkQuota('interviews', mockUser.id)

if (!canStart) {
  // Redirect to upgrade page
  redirect('/upgrade?reason=interviews_exceeded')
}
```

**📊 Meter Interview Start** (MODIFY insert @ line 31):
```typescript
import { EchoClient } from '@echo/sdk'

const echo = new EchoClient({ userId: mockUser.id })

// Increment interview counter
await echo.usage.increment('interviews', 1, {
  metadata: {
    case_id: id,
    case_title: caseData.title,
  }
})

// Then create interview session...
```

#### Page Summary
| Aspect | Location | Status | Future Action |
|--------|----------|--------|---------------|
| **Case Fetch** | Line 17 | ✅ Working | None needed |
| **Session Create** | Line 31 | ⚠️ Demo bypass | Remove after Echo migration |
| **Quota Check** | N/A | ❌ Missing | Add Echo check |
| **Props Flow** | Line 49 | ✅ Working | None needed |

---

### 5. Interview Client (Component in Page Context)

**Component**: VoiceInterviewClient (rendered by interview/[id]/page.tsx)
**Detailed analysis**: See `/components/claude.md`
**Key page-level interactions**:

#### Where Exhibits Render

**Location**: voice-interview-client.tsx:242
```typescript
<DataExhibitSlideover exhibits={sampleExhibits} />
```

**⚠️ TEMP HARD-CODE** (line 323-336):
```typescript
const sampleExhibits = [
  {
    id: "1",
    title: "Market Size Analysis",
    type: "chart" as const,
    data: {},  // EMPTY
  },
  {
    id: "2",
    title: "Revenue Breakdown",
    type: "table" as const,
    data: {},  // EMPTY
  },
]
```

**❌ NOT fetching from database**
**❌ NO `case_exhibits` table exists**

#### 🎯 FUTURE: Exhibit Database Fetch

**Create Table** (new SQL file):
```sql
CREATE TABLE case_exhibits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  case_id UUID NOT NULL REFERENCES cases(id),
  label TEXT NOT NULL,            -- "Chart 1"
  image_url TEXT NOT NULL,        -- "/exhibits/coffee-chain-market.png"
  chart_summary TEXT,             -- "Bar chart showing market size..."
  display_order INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS: Public read (like cases table)
ALTER TABLE case_exhibits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view exhibits" ON case_exhibits
  FOR SELECT USING (true);
```

**Fetch in Component** (voice-interview-client.tsx - ADD after line 42):
```typescript
const [exhibits, setExhibits] = useState<DataExhibit[]>([])

useEffect(() => {
  async function fetchExhibits() {
    const { data, error } = await supabase
      .from('case_exhibits')
      .select('id, label, image_url, chart_summary')
      .eq('case_id', caseData.id)
      .order('display_order')

    if (data) {
      setExhibits(data.map(ex => ({
        id: ex.id,
        title: ex.label,
        type: 'chart',
        imageUrl: ex.image_url,      // ⭐ PASS TO CHILD
        summary: ex.chart_summary,   // ⭐ USE IN LLM CONTEXT
      })))
    }
  }

  fetchExhibits()
}, [caseData.id, supabase])

// Then update render:
<DataExhibitSlideover exhibits={exhibits} />  // Use fetched data
```

**Update LLM Context** (app/api/interview/chat/route.ts - ADD to system prompt):
```typescript
const systemPrompt = `You are an experienced consulting interviewer...

Available Exhibits:
${exhibits.map(ex => `- ${ex.title}: ${ex.summary}`).join('\n')}

When the candidate asks for data, refer them to these exhibits.
`
```

#### Where Session Summary Lives

**Saved**: voice-interview-client.tsx:206-214
```typescript
await supabase
  .from("interviews")
  .update({
    status: "completed",
    completed_at: new Date().toISOString(),
    duration,
    transcript: messages,  // ⭐ FULL CONVERSATION SAVED HERE
  })
  .eq("id", interviewId)
```

**Retrieved**: app/interview/[id]/feedback/page.tsx:43-47
```typescript
const { data: interview } = await supabase
  .from("interviews")
  .select("*, cases(*), feedback(*)")
  .eq("id", id)
  .maybeSingle()

// Access transcript:
const transcript = interview.transcript  // Array of Message objects
```

**Displayed**: feedback/page.tsx (no transcript shown in current UI)

**🎯 FUTURE: Add Transcript Viewer**:
```typescript
<Card>
  <CardHeader>
    <CardTitle>Interview Transcript</CardTitle>
  </CardHeader>
  <CardContent>
    {interview.transcript.map((msg, i) => (
      <div key={i} className={msg.role === 'user' ? 'text-right' : 'text-left'}>
        <p className="text-sm text-muted-foreground">
          {msg.role === 'user' ? 'You' : 'Interviewer'}
        </p>
        <p>{msg.content}</p>
      </div>
    ))}
  </CardContent>
</Card>
```

---

### 6. Feedback Page (/interview/[id]/feedback)

**File**: `app/interview/[id]/feedback/page.tsx`
**Type**: Server Component
**Purpose**: Display AI-generated feedback, scores, trends

#### Auth State

**Read** (lines 15-18):
```typescript
const isAuthenticated = await getMockSession()
if (!isAuthenticated) {
  redirect("/auth/login")
}
```

#### Demo vs Real Interview Handling

**Demo Mode** (lines 22-37):
```typescript
const isDemoInterview = id.startsWith("demo-")

if (isDemoInterview) {
  // Generate mock feedback (no DB query)
  const mockFeedback = generateMockFeedback()  // Random scores
  const mockInterview = {
    id,
    cases: {
      title: "Market Entry Strategy",
      industry: "Technology",
      difficulty: "Medium",
    },
    duration: 1200,  // 20 min
  }

  return renderFeedbackPage(mockInterview, mockFeedback, [])
}
```

**Why?**: Demo users can't write to database, need fake data for testing

#### Supabase Queries

**1. Fetch Interview + Feedback** (lines 43-47):
```typescript
const { data: interview } = await supabase
  .from("interviews")
  .select("*, cases(*), feedback(*)")
  .eq("id", id)
  .maybeSingle()

if (!interview || interview.user_id !== mockUser.id) {
  redirect("/dashboard")  // Not found or not owned by user
}

const feedback = interview.feedback?.[0]  // Get first (should be only) feedback
```

**Joins**:
- `cases(*)` - Get case title, industry, difficulty
- `feedback(*)` - Get scores, strengths, areas for improvement

---

**2. Generate Feedback if Missing** (lines 55-58):
```typescript
if (!feedback) {
  await generateFeedback(id, interview, supabase)  // Create feedback
  redirect(`/interview/${id}/feedback`)            // Refresh page
}
```

**generateFeedback()** function (lines 269-302):
- Creates **mock feedback** with random scores (NOT using LLM)
- Should be replaced with `/api/interview/feedback` POST call
- Updates `user_stats` incorrectly (bug @ lines 298-301)

**⚠️ BUG**: Lines 298-301 set `total_interviews = user_id` (should increment)

---

**3. Fetch All Interviews for Trend** (lines 60-65):
```typescript
const { data: allInterviews } = await supabase
  .from("interviews")
  .select("*, feedback(*)")
  .eq("user_id", mockUser.id)
  .eq("status", "completed")
  .order("completed_at", { ascending: true })

const trendData = allInterviews?.map((int: any) => ({
  date: new Date(int.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
  score: int.feedback?.[0]?.overall_score || 0,
})) || []
```

**Used for**: TrendChart @ line 197 (only if `trendData.length > 1`)

#### UI Structure (renderFeedbackPage function)

**⭐ SESSION SUMMARY UI** (lines 103-267):

```typescript
Header (lines 113-120)
  ├─ "Interview Feedback" title
  └─ Back to Dashboard button

Overall Score Card (lines 123-144)
  ├─ Case title + industry + difficulty
  ├─ Overall score (large number)  ← feedback.overall_score
  └─ Duration in minutes           ← interview.duration / 60

Performance Breakdown (lines 146-177)
  ├─ Structure score + progress bar    ← feedback.structure_score
  ├─ Analysis score + progress bar     ← feedback.analysis_score
  └─ Communication score + progress bar ← feedback.communication_score

Performance Radar Chart (lines 179-187)
  └─ Visual representation of 4 scores

Trend Chart (lines 190-200)  [CONDITIONAL]
  └─ Only shown if user has multiple interviews
      └─ Line chart of scores over time

Strengths Card (lines 202-220)
  └─ Bulleted list from feedback.strengths[]

Areas for Improvement Card (lines 222-240)
  └─ Bulleted list from feedback.areas_for_improvement[]

Detailed Feedback (lines 242-249)
  └─ Paragraph text from feedback.detailed_feedback

Action Buttons (lines 251-262)
  ├─ Back to Dashboard
  └─ Practice Another Case ─→ /dashboard
```

#### Echo Integration Points

**💎 Premium Feedback Upsell** (ADD before buttons @ line 250):
```typescript
{!isPro && (
  <Card className="border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10">
    <CardContent className="pt-6">
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold mb-1">
            Unlock Premium Feedback
          </h3>
          <p className="text-sm text-muted-foreground mb-3">
            Get detailed video replay, personalized coach recommendations, and downloadable reports
          </p>
        </div>
        <Button size="lg">
          Upgrade to Pro
        </Button>
      </div>
    </CardContent>
  </Card>
)}
```

**🔒 Limit Trend Chart for Free Users** (MODIFY line 190):
```typescript
{trendData.length > 1 && (
  <Card>
    <CardHeader>
      <div className="flex items-center justify-between">
        <div>
          <CardTitle>Progress Over Time</CardTitle>
          <CardDescription>Your performance trend</CardDescription>
        </div>
        {!isPro && (
          <Badge variant="outline">Last 3 shown • Upgrade for full history</Badge>
        )}
      </div>
    </CardHeader>
    <CardContent>
      <TrendChart data={isPro ? trendData : trendData.slice(-3)} />
    </CardContent>
  </Card>
)}
```

**📊 Add Premium Features**:
- Video replay of interview
- Detailed transcript with sentiment analysis
- Peer comparison ("You scored better than 73% of users")
- Custom improvement plan
- Downloadable PDF report

#### Page Summary
| Data Source | Query Location | Display Location | Echo Gate |
|-------------|----------------|------------------|-----------|
| **Interview + Feedback** | Line 43 | Overall card @ 123 | None |
| **Performance Scores** | feedback object | Breakdown @ 146-177 | Premium: Detailed insights |
| **Trend Data** | Line 60 | Chart @ 197 | Free: Last 3 only |
| **Strengths/Improvements** | feedback object | Cards @ 202-240 | Premium: Personalized plan |

---

## API Routes

### 7. Chat API (/api/interview/chat)

**File**: `app/api/interview/chat/route.ts`
**Type**: Server Route Handler
**Purpose**: LLM inference for interviewer responses

#### Auth Check

**Read** (lines 8-11):
```typescript
const isAuthenticated = await getMockSession()
if (!isAuthenticated) {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
```

**Future**: Replace with Echo session check

#### Request Payload

**Input** (line 6):
```typescript
const { messages, caseContext, interviewId } = await req.json()
```

**Types**:
- `messages`: Array of `{ role: "user" | "assistant", content: string }`
- `caseContext`: Case object from `cases` table
  ```typescript
  {
    title: string,
    industry: string,
    difficulty: string,
    case_type: string,
    description: string,
    // prompt not used here (only for initial message)
  }
  ```
- `interviewId`: UUID string (not used in this route)

#### LLM Integration

**⚠️ NOT using Echo SDK - Direct OpenAI call** (lines 45-56):
```typescript
import { generateText } from "ai"  // Vercel AI SDK

const { text } = await generateText({
  model: "openai/gpt-4o-mini",  // ← Direct model reference
  messages: [
    { role: "system", content: systemPrompt },
    ...messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
  ],
  temperature: 0.7,
  maxTokens: 200,  // Keep responses concise for TTS
})

return Response.json({ message: text })
```

**System Prompt** (lines 13-43):
```typescript
const systemPrompt = `You are an experienced consulting interviewer...

Case Context:
- Title: ${caseContext.title}
- Industry: ${caseContext.industry}
- Difficulty: ${caseContext.difficulty}
- Type: ${caseContext.case_type}
- Description: ${caseContext.description}

Your role:
1. Guide the candidate through the case interview naturally
2. Ask clarifying questions when needed
3. Provide data when requested (make up realistic numbers)
4. Challenge assumptions constructively
5. Keep responses concise (2-3 sentences max)
6. Be encouraging but professional
7. Evaluate their structure, analysis, and communication

Interview stages to guide through:
1. Framework development
2. Data analysis
3. Quantitative reasoning
4. Synthesis

Adapt based on performance...
`
```

**⭐ WHERE CASE CONTENT IS USED**:
- System prompt construction @ lines 13-43
- Uses `caseContext` fields but NOT `prompt` (that's only for initial message)

#### 🎯 Echo SDK Migration

**REPLACE lines 45-56**:
```typescript
import { EchoClient } from '@echo/sdk'

// Get user from Echo session
const session = await EchoAuth.getSession(req)
if (!session) {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}

const echo = new EchoClient({
  apiKey: process.env.ECHO_API_KEY,
  userId: session.user.id,
})

// Check quota BEFORE expensive operation
const canProceed = await echo.checkQuota('chat_messages')
if (!canProceed) {
  return Response.json({
    error: 'Message limit reached',
    upgrade_url: echo.getUpgradeUrl(),
  }, { status: 429 })
}

// Metered LLM call
const response = await echo.chat.complete({
  messages: [
    { role: "system", content: systemPrompt },
    ...messages,
  ],
  model: 'gpt-4o-mini',
  temperature: 0.7,
  maxTokens: 200,
  metadata: {
    interviewId,
    caseId: caseContext.id,
    feature: 'case-interview',
  },
})

// Echo automatically tracks:
// - Token usage
// - Cost
// - User quota consumption

return Response.json({ message: response.text })
```

**Benefits**:
- ✅ Automatic usage metering
- ✅ Quota enforcement
- ✅ Cost tracking per user
- ✅ Rate limiting
- ✅ Upgrade flows

#### Route Summary
| Aspect | Current | Future (Echo) |
|--------|---------|---------------|
| **Auth** | Mock session | Echo session |
| **LLM Call** | Direct OpenAI | Echo metered |
| **Quota Check** | None | Before inference |
| **Cost Tracking** | None | Automatic |
| **Upgrade Flow** | None | Built-in |

---

### 8. Feedback API (/api/interview/feedback)

**File**: `app/api/interview/feedback/route.ts`
**Type**: Server Route Handler
**Purpose**: Generate AI feedback after interview completion

#### Auth Check

**IMPORTANT**: Uses **REAL Supabase Auth** (not mock!) (lines 10-15):
```typescript
const supabase = await createClient()
const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
```

**Why real auth here?**: This route needs to verify user owns the interview (RLS policy)

**⚠️ INCONSISTENCY**: Other routes use mock auth, this uses real auth
**Future**: All should use Echo Auth

#### Request Payload

**Input** (line 6):
```typescript
const { interviewId } = await req.json()
```

#### Supabase Queries

**1. Fetch Interview** (line 17):
```typescript
const { data: interview } = await supabase
  .from("interviews")
  .select("*, cases(*)")
  .eq("id", interviewId)
  .single()

if (!interview || interview.user_id !== user.id) {
  return Response.json({ error: "Interview not found" }, { status: 404 })
}

const transcript = interview.transcript as Array<{ role: string; content: string }>
```

**Used for**:
- Verify ownership (`interview.user_id === user.id`)
- Get case context (`interview.cases.*`)
- Get conversation transcript (`interview.transcript`)

#### LLM Feedback Generation

**System Prompt** (lines 25-53):
```typescript
const systemPrompt = `You are an expert consulting interview evaluator...

Case Context:
- Title: ${interview.cases.title}
- Type: ${interview.cases.case_type}
- Difficulty: ${interview.cases.difficulty}

Evaluate on these dimensions (score 0-100):
1. Structure: Did they use a clear framework? MECE?
2. Analysis: How deep? Key drivers identified?
3. Communication: Clarity, pacing

Provide:
- Overall score (average of three)
- Individual scores
- 3 specific strengths
- 3 areas for improvement
- Detailed feedback paragraph (3-4 sentences)

Format as JSON:
{
  "overall_score": number,
  "structure_score": number,
  ...
}
`
```

**LLM Call** (lines 59-66):
```typescript
const { text } = await generateText({
  model: "openai/gpt-4o-mini",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Transcript:\n\n${conversationText}` },
  ],
  temperature: 0.3,  // Lower = more consistent
})

let feedbackData
try {
  feedbackData = JSON.parse(text)
} catch {
  // Fallback to default scores if JSON parse fails
  feedbackData = { ... }
}
```

**⚠️ Expensive Operation**: Analyzes entire transcript, should be metered

#### Database Writes

**1. Insert Feedback** (lines 88-95):
```typescript
const { data: feedback } = await supabase
  .from("feedback")
  .insert({
    interview_id: interviewId,
    overall_score: feedbackData.overall_score,
    structure_score: feedbackData.structure_score,
    analysis_score: feedbackData.analysis_score,
    communication_score: feedbackData.communication_score,
    strengths: feedbackData.strengths,
    areas_for_improvement: feedbackData.areas_for_improvement,
    detailed_feedback: feedbackData.detailed_feedback,
  })
  .select()
  .single()
```

**2. Update User Stats** (lines 97-112):
```typescript
const { data: stats } = await supabase
  .from("user_stats")
  .select("*")
  .eq("user_id", user.id)
  .single()

const newCompletedCount = (stats?.completed_interviews || 0) + 1
const newTotalCount = (stats?.total_interviews || 0) + 1
const currentAverage = stats?.average_score || 0
const newAverage = (currentAverage * (newCompletedCount - 1) + feedbackData.overall_score) / newCompletedCount

await supabase
  .from("user_stats")
  .update({
    total_interviews: newTotalCount,
    completed_interviews: newCompletedCount,
    average_score: newAverage,
    last_interview_date: new Date().toISOString().split("T")[0],
  })
  .eq("user_id", user.id)
```

**Logic**: Incremental average calculation

#### 🎯 Echo SDK Migration

**REPLACE lines 59-66**:
```typescript
const echo = new EchoClient({ userId: user.id })

// Check quota (expensive operation)
const canGenerate = await echo.checkQuota('ai_feedback_generation')
if (!canGenerate) {
  return Response.json({
    error: 'Feedback generation limit reached',
    message: 'Upgrade to get AI feedback on all interviews',
    upgrade_url: echo.getUpgradeUrl(),
  }, { status: 429 })
}

// Metered feedback generation
const response = await echo.chat.complete({
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Transcript:\n\n${conversationText}` },
  ],
  model: 'gpt-4o-mini',
  temperature: 0.3,
  metadata: {
    interviewId,
    feature: 'feedback-generation',
  },
})

let feedbackData = JSON.parse(response.text)
```

**Quota Configuration**:
```yaml
ai_feedback_generation:
  free: 3/month
  pro: unlimited
```

#### Route Summary
| Aspect | Current | Future (Echo) |
|--------|---------|---------------|
| **Auth** | Real Supabase | Echo session |
| **LLM Call** | Direct OpenAI | Echo metered |
| **Cost** | ~$0.02/call | Tracked per user |
| **Quota** | None | 3 free, unlimited pro |

---

### 9. Analyze API (/api/interview/analyze)

**File**: `app/api/interview/analyze/route.ts`
**Type**: Server Route Handler
**Purpose**: Real-time analysis during interview (NOT currently used in UI)

#### Status
**⚠️ NOT INTEGRATED** - Route exists but no frontend calls it

#### Potential Use Case
- Real-time hints during interview
- "You're on the right track" indicators
- Nudges if candidate is stuck

#### Echo Integration
- Perfect for **premium feature**
- Free: No real-time help
- Pro: AI coaching during interview

---

## Middleware

### 10. Route Protection Middleware

**File**: `middleware.ts`
**Type**: Next.js Middleware
**Purpose**: Protect routes, redirect based on auth state

#### Current Implementation

**Mock Auth** (lines 5-21):
```typescript
import { getMockSession } from "@/lib/auth/mock-auth"

export async function middleware(request: NextRequest) {
  const isAuthenticated = await getMockSession()
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth")
  const isDashboardOrInterview =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/interview")

  // Redirect to dashboard if authenticated + on auth page
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Redirect to login if not authenticated + on protected page
  if (!isAuthenticated && isDashboardOrInterview) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  return NextResponse.next()
}
```

**Matcher** (lines 24-26):
```typescript
export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
```

**Excludes**: Static files, images, Next.js internals

#### 🎯 Echo SDK Migration

**REPLACE with Echo session check**:
```typescript
import { EchoAuth } from '@echo/sdk'

export async function middleware(request: NextRequest) {
  const session = await EchoAuth.getSession(request)
  const isAuthenticated = !!session

  // ... rest of logic stays same

  // Optional: Add usage tracking
  if (session && isDashboardOrInterview) {
    // Track page views for analytics
    await echo.analytics.track('page_view', {
      userId: session.user.id,
      path: request.nextUrl.pathname,
    })
  }

  return NextResponse.next()
}
```

---

## Summary Tables

### Pages by Auth State

| Route | Auth Required | Auth Method | Redirects |
|-------|---------------|-------------|-----------|
| `/` | ❌ Public | None | None |
| `/auth/login` | ❌ | Sets mock cookie | → /dashboard if authenticated |
| `/auth/sign-up` | ❌ | Sets mock cookie | → /dashboard if authenticated |
| `/dashboard` | ✅ | Mock session | → /auth/login if not authenticated |
| `/interview/[id]` | ✅ | Mock session | → /auth/login if not authenticated |
| `/interview/[id]/feedback` | ✅ | Mock session | → /auth/login if not authenticated |

### Supabase Tables Used by Page

| Page | Tables Read | Tables Written | Purpose |
|------|-------------|----------------|---------|
| `/dashboard` | profiles, user_stats, cases, interviews | None | Show stats, case list |
| `/interview/[id]` | cases | interviews | Fetch case, create session |
| VoiceInterviewClient | None | interviews | Save transcript on end |
| `/feedback` | interviews, cases, feedback, all interviews | feedback, user_stats | Display feedback, trends |
| Chat API | None | None | LLM inference only |
| Feedback API | interviews, cases, user_stats | feedback, user_stats | Generate + save feedback |

### Echo Integration Priority

| Location | Feature | Priority | Complexity |
|----------|---------|----------|------------|
| `/auth/login` | Echo Auth | 🔴 High | Medium |
| `/api/interview/chat` | Metered LLM | 🔴 High | Low |
| `/dashboard` | Usage widget | 🟡 Medium | Low |
| `/dashboard` | Quota check | 🟡 Medium | Low |
| `/api/interview/feedback` | Metered feedback | 🟡 Medium | Low |
| `/feedback` | Premium upsell | 🟢 Low | Low |
| `/feedback` | Limit trend chart | 🟢 Low | Low |

---

**End of Routing & Page Roles Map**
