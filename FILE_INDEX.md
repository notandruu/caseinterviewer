# CaserAI File-by-File Index

## Executive Summary

**Total Files**: 90+ TypeScript/JavaScript files
**Supabase Client Initialized**: 3 locations (client, server, middleware)
**Supabase Queries**: 8 locations across 5 files
**Case Content Tables**: ❌ `case_content` DOES NOT EXIST | ❌ `case_exhibits` DOES NOT EXIST
**Hard-Coded Content**: 2 locations (exhibits in component, case data in seed SQL)
**v0-Generated Files**: 60+ UI components in `components/ui/` (safe to regenerate)

---

## Configuration Files

### `package.json`
**Purpose**: Dependencies and scripts
**Key Dependencies**: Next.js 15, React 19, Supabase SSR, Vercel AI SDK, Radix UI
**Scripts**: `dev`, `build`, `start`, `lint`

### `tsconfig.json`
**Purpose**: TypeScript compiler configuration
**Settings**: Strict mode, path aliases (`@/*`), Next.js app directory support

### `next.config.mjs`
**Purpose**: Next.js configuration
**Note**: Currently default/minimal config

### `postcss.config.mjs`
**Purpose**: PostCSS configuration for Tailwind CSS
**Plugins**: Tailwind CSS v4, autoprefixer

### `components.json`
**Purpose**: Shadcn/ui component library configuration
**Style**: Default, Tailwind CSS v4, path aliases

### `.gitignore`
**Purpose**: Git ignore patterns
**Excludes**: node_modules, .next, .env files, build outputs

### `pnpm-lock.yaml`
**Purpose**: pnpm package lock file (pinned dependency versions)

---

## Root-Level Application Files

### `middleware.ts` ⭐ SUPABASE USED
**Purpose**: Route protection middleware
**Line 5**: Imports `getMockSession` from mock auth (TEMPORARY)
**Line 6**: Checks authentication status
**Lines 12-20**: Redirects based on auth state
**Future**: Replace with Echo SDK session check
**Supabase Import**: NONE (uses mock auth currently)

---

## Styles

### `styles/globals.css`
**Purpose**: Global CSS styles and Tailwind directives
**Tailwind Layers**: Base, components, utilities
**Custom Variables**: CSS variables for theming

---

## Library Utilities

### `lib/utils.ts`
**Purpose**: Utility functions (cn for className merging)
**Exports**: `cn()` function using clsx + tailwind-merge

---

## Supabase Integration Files ⭐⭐⭐

### `lib/supabase/client.ts` ⭐ SUPABASE INIT #1
**Purpose**: Browser-side Supabase client initialization
**Line 1**: Imports `createBrowserClient` from `@supabase/ssr`
**Lines 3-5**: Creates and exports Supabase client
**Environment Variables Used**:
- `process.env.NEXT_PUBLIC_SUPABASE_URL`
- `process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY`

```typescript
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

**Used By**:
- `components/voice-interview-client.tsx:41`
- `lib/auth/sync-user.ts:7` (if created for Echo integration)

---

### `lib/supabase/server.ts` ⭐ SUPABASE INIT #2
**Purpose**: Server-side Supabase client with cookie handling
**Line 1**: Imports `createServerClient` from `@supabase/ssr`
**Line 2**: Imports Next.js `cookies()` helper
**Lines 4-23**: Creates Supabase client with cookie management

```typescript
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          // Cookie setting logic
        },
      },
    },
  )
}
```

**Used By**:
- `app/dashboard/page.tsx:18`
- `app/interview/[id]/page.tsx:15`
- `app/interview/[id]/feedback/page.tsx:41`
- `app/api/interview/feedback/route.ts:8`

---

### `lib/supabase/middleware.ts` ⭐ SUPABASE INIT #3 (NOT CURRENTLY USED)
**Purpose**: Supabase session refresh in middleware
**Lines 1-40**: Creates server client and refreshes user session
**Status**: NOT IMPORTED by `middleware.ts` (using mock auth instead)
**Future**: Use for Echo + Supabase integration

---

## Mock Auth (TEMPORARY - DELETE AFTER ECHO MIGRATION)

### `lib/auth/mock-auth.ts` ⚠️ TEMPORARY
**Purpose**: Mock authentication for hackathon demo
**Lines 3-6**: Mock user constants
**Lines 8-17**: `setMockSession()` - Sets cookie
**Lines 19-22**: `clearMockSession()` - Deletes cookie
**Lines 24-28**: `getMockSession()` - Reads cookie
**Lines 30-36**: `getMockUser()` - Returns hard-coded user object

**Mock User**:
```typescript
const MOCK_USER_ID = "00000000-0000-0000-0000-000000000001"
const MOCK_USER_EMAIL = "demo@caseprep.ai"
const MOCK_USER_NAME = "Demo User"
```

**Used By**:
- `middleware.ts:5`
- `app/dashboard/page.tsx:11`
- `app/interview/[id]/page.tsx:9`
- `app/interview/[id]/feedback/page.tsx:15`
- `app/api/interview/chat/route.ts:8`
- `app/api/auth/mock-signin/route.ts:1`

**DELETE AFTER**: Echo SDK migration complete

---

## Hooks

### `hooks/use-toast.ts`
**Purpose**: Toast notification hook (Radix UI wrapper)
**Exports**: `useToast()`, `toast()` utilities

### `hooks/use-mobile.ts`
**Purpose**: Responsive breakpoint hook
**Exports**: `useIsMobile()` - Detects mobile viewport

---

## App Pages (Next.js 15 App Router)

### `app/layout.tsx`
**Purpose**: Root layout wrapping all pages
**Line 1-5**: Imports fonts, analytics
**Lines 7-11**: Metadata export
**Lines 13-26**: Root HTML structure with fonts
**Line 22**: Vercel Analytics component
**Missing**: Echo provider (add after integration)

---

### `app/page.tsx` (Landing Page)
**Purpose**: Public marketing landing page
**Lines 10-27**: Header with auth CTAs
**Lines 30-54**: Hero section
**Lines 57-107**: Features grid (4 cards)
**Lines 110-125**: Bottom CTA section
**Lines 129-133**: Footer
**Supabase**: NONE (static page)
**Links To**: `/auth/login`, `/auth/sign-up`

---

### `app/dashboard/page.tsx` ⭐ SUPABASE QUERIES #1-4
**Purpose**: Main authenticated dashboard
**Type**: Server Component

**Auth Check** (lines 11-15):
```typescript
const isAuthenticated = await getMockSession()
if (!isAuthenticated) {
  redirect("/auth/login")
}
```

**Supabase Initialization** (line 18):
```typescript
const supabase = await createClient()
```

**Query 1: User Profile** (lines 26-27):
```typescript
const profileResult = await supabase
  .from("profiles")
  .select("*")
  .eq("id", mockUser.id)
  .maybeSingle()
```

**Query 2: User Stats** (lines 29-30):
```typescript
const statsResult = await supabase
  .from("user_stats")
  .select("*")
  .eq("user_id", mockUser.id)
  .maybeSingle()
```

**Query 3: Available Cases** ⭐ CASE CONTENT SOURCE (lines 32-33):
```typescript
const casesResult = await supabase
  .from("cases")
  .select("*")
  .order("difficulty", { ascending: true })
```
**NOTE**: Uses `cases` table (NOT `case_content`)

**Query 4: Recent Interviews** (lines 35-42):
```typescript
const interviewsResult = await supabase
  .from("interviews")
  .select("*, cases(*), feedback(*)")
  .eq("user_id", mockUser.id)
  .eq("status", "completed")
  .order("completed_at", { ascending: false })
  .limit(3)
```

**UI Sections**:
- Lines 108-135: Stats cards (from user_stats)
- Lines 138-167: Recent interviews (from interviews + feedback join)
- Lines 172-204: Available cases grid (from cases table)

**Tables Queried**: `profiles`, `user_stats`, `cases`, `interviews`, `feedback`

---

### `app/interview/[id]/page.tsx` ⭐ SUPABASE QUERY #5
**Purpose**: Interview session entry point
**Type**: Server Component

**Auth Check** (lines 9-12):
```typescript
const isAuthenticated = await getMockSession()
if (!isAuthenticated) {
  redirect("/auth/login")
}
```

**Supabase Initialization** (line 15):
```typescript
const supabase = await createClient()
```

**Query 5: Fetch Case by ID** ⭐ CASE CONTENT READ (line 17):
```typescript
const { data: caseData } = await supabase
  .from("cases")
  .select("*")
  .eq("id", id)
  .single()
```
**NOTE**: Fetches from `cases` table (NOT `case_content`)

**Fields Retrieved**:
- `id`, `title`, `description`, `prompt` (used as initial message)
- `industry`, `difficulty`, `case_type`, `estimated_duration`, `key_concepts`

**Write: Create Interview Session** (lines 31-46):
```typescript
// Demo user bypass
if (mockUser.id === "00000000-0000-0000-0000-000000000001") {
  interviewId = `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`
} else {
  // Real users: Insert into database
  const { data: interview } = await supabase
    .from("interviews")
    .insert({
      user_id: mockUser.id,
      case_id: id,
      status: "in-progress",
    })
    .select()
    .single()
}
```

**Component Render** (line 49):
```typescript
return <VoiceInterviewClient caseData={caseData} interviewId={interviewId} userId={mockUser.id} />
```

**Tables Queried**: `cases`
**Tables Written**: `interviews`

---

### `app/interview/[id]/feedback/page.tsx` ⭐ SUPABASE QUERIES #6-7
**Purpose**: Display AI-generated feedback after interview
**Type**: Server Component

**Auth Check** (lines 15-18):
```typescript
const isAuthenticated = await getMockSession()
if (!isAuthenticated) {
  redirect("/auth/login")
}
```

**Demo Mode Bypass** (lines 22-37):
```typescript
const isDemoInterview = id.startsWith("demo-")
if (isDemoInterview) {
  // Generate mock feedback, skip database
  return renderFeedbackPage(mockInterview, mockFeedback, [])
}
```

**Supabase Initialization** (line 41):
```typescript
const supabase = await createClient()
```

**Query 6: Fetch Interview + Feedback** (lines 43-47):
```typescript
const { data: interview } = await supabase
  .from("interviews")
  .select("*, cases(*), feedback(*)")
  .eq("id", id)
  .maybeSingle()
```
**Joins**: `cases` (for title/industry), `feedback` (for scores)

**Query 7: Fetch All Interviews (Trend Data)** (lines 60-65):
```typescript
const { data: allInterviews } = await supabase
  .from("interviews")
  .select("*, feedback(*)")
  .eq("user_id", mockUser.id)
  .eq("status", "completed")
  .order("completed_at", { ascending: true })
```

**UI Sections** (lines 103-267):
- Lines 123-144: Overall score card
- Lines 146-177: Performance breakdown (structure/analysis/communication)
- Lines 179-187: Radar chart
- Lines 190-200: Trend chart (if multiple interviews)
- Lines 202-240: Strengths/improvements
- Lines 242-249: Detailed feedback

**Tables Queried**: `interviews`, `cases`, `feedback`

---

## Auth Pages

### `app/auth/login/page.tsx` ⚠️ MOCK AUTH (REPLACE WITH ECHO)
**Purpose**: Login page (currently using mock auth)
**Type**: Client Component (`"use client"`)

**Mock Auth Handler** (lines 15-32):
```typescript
const handleLogin = async (e: React.FormEvent) => {
  e.preventDefault()
  setIsLoading(true)

  try {
    const response = await fetch("/api/auth/mock-signin", {
      method: "POST",
    })

    if (response.ok) {
      router.push("/dashboard")
    }
  } catch (error) {
    console.error("Mock sign in error:", error)
  }
}
```

**Supabase**: NONE (mock auth only)
**Replace With**: Echo SDK OAuth flow (see ECHO_INTEGRATION.md)

---

### `app/auth/sign-up/page.tsx`
**Purpose**: Sign-up page (similar to login)
**Status**: Not examined in detail (likely similar mock auth pattern)
**Replace With**: Echo SDK OAuth

---

### `app/auth/check-email/page.tsx`
**Purpose**: Email verification page (not currently used)
**Status**: Placeholder for future email auth flow

---

## API Routes

### `app/api/auth/mock-signin/route.ts` ⚠️ DELETE AFTER ECHO
**Purpose**: Mock authentication endpoint
**Line 1**: Imports `setMockSession`
**Lines 4-7**: Sets mock session cookie and returns success
**DELETE**: After Echo SDK migration

---

### `app/api/auth/signout/route.ts`
**Purpose**: Sign-out endpoint
**Status**: Needs update for Echo SDK
**Current**: Likely clears mock session
**Future**: Call Echo sign-out API

---

### `app/api/interview/chat/route.ts` ⭐ LLM INTEGRATION
**Purpose**: AI interviewer chat endpoint (LLM inference)
**Type**: Server Route Handler

**Auth Check** (lines 8-11):
```typescript
const isAuthenticated = await getMockSession()
if (!isAuthenticated) {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
```

**Request Payload** (line 6):
```typescript
const { messages, caseContext, interviewId } = await req.json()
```

**System Prompt Construction** ⭐ USES CASE CONTENT (lines 13-43):
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
...
`
```

**LLM Call** (lines 45-56):
```typescript
import { generateText } from "ai"  // Vercel AI SDK

const { text } = await generateText({
  model: "openai/gpt-4o-mini",
  messages: [
    { role: "system", content: systemPrompt },
    ...messages.map((m: any) => ({
      role: m.role,
      content: m.content,
    })),
  ],
  temperature: 0.7,
  maxTokens: 200,
})

return Response.json({ message: text })
```

**Supabase**: NONE (only LLM inference)
**Future**: Add Echo subscription check before LLM call

---

### `app/api/interview/feedback/route.ts` ⭐ SUPABASE QUERY #8 + WRITES
**Purpose**: Generate AI feedback after interview
**Type**: Server Route Handler

**Auth Check** (lines 10-15):
```typescript
const supabase = await createClient()
const { data: { user } } = await supabase.auth.getUser()

if (!user) {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
```
**NOTE**: Uses REAL Supabase Auth (not mock!)

**Query 8: Fetch Interview** (line 17):
```typescript
const { data: interview } = await supabase
  .from("interviews")
  .select("*, cases(*)")
  .eq("id", interviewId)
  .single()
```

**LLM Feedback Generation** (lines 59-66):
```typescript
const { text } = await generateText({
  model: "openai/gpt-4o-mini",
  messages: [
    { role: "system", content: systemPrompt },
    { role: "user", content: `Transcript:\n\n${conversationText}` },
  ],
  temperature: 0.3,
})

let feedbackData = JSON.parse(text)
```

**Write 1: Insert Feedback** (lines 88-95):
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

**Write 2: Update User Stats** (lines 104-112):
```typescript
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

**Tables Queried**: `interviews`, `cases`, `user_stats`
**Tables Written**: `feedback`, `user_stats`

---

### `app/api/interview/analyze/route.ts`
**Purpose**: Real-time interview analysis (NOT currently used in UI)
**Status**: Stub/placeholder
**Potential Use**: Premium feature for live hints during interview

---

## Core Components

### `components/voice-interview-client.tsx` ⭐ PRIMARY COMPONENT + SUPABASE WRITE
**Purpose**: Main interview UI with voice interaction
**Type**: Client Component (`"use client"`)
**Lines**: 337 total

**Props** (lines 17-28):
```typescript
interface VoiceInterviewClientProps {
  caseData: {
    id: string
    title: string
    description: string
    prompt: string        // ⭐ CASE CONTENT (from cases table)
    industry: string
    difficulty: string
  }
  interviewId: string
  userId: string
}
```

**State** (lines 31-37):
- `isListening` - Mic recording state
- `isSpeaking` - AI speaking state
- `messages` - Conversation transcript ⭐
- `interimTranscript` - Live speech-to-text
- `hasStarted` - Interview begun flag
- `currentAIText` - Text for typewriter effect
- `displayedAIText` - Animated text display

**Supabase Client Init** (line 41):
```typescript
const supabase = createClient()
```

**Web Speech API Setup** (lines 48-92):
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

**Voice Synthesis** (lines 153-169):
```typescript
const speakText = (text: string) => {
  synthRef.current?.cancel()
  const utterance = new SpeechSynthesisUtterance(text)
  utterance.rate = 0.95
  utterance.pitch = 1
  utterance.volume = 1

  utterance.onstart = () => setIsSpeaking(true)
  utterance.onend = () => setIsSpeaking(false)

  synthRef.current?.speak(utterance)
}
```

**LLM Chat Call** (lines 128-136):
```typescript
const response = await fetch("/api/interview/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    messages: [...messages, { role: "user", content: userInput }],
    caseContext: caseData,  // ⭐ CASE CONTENT SENT HERE
    interviewId,
  }),
})
```

**Supabase Write: Save Transcript** (lines 206-214):
```typescript
await supabase
  .from("interviews")
  .update({
    status: "completed",
    completed_at: new Date().toISOString(),
    duration,
    transcript: messages,  // ⭐ FULL CONVERSATION SAVED
  })
  .eq("id", interviewId)
```

**⚠️ HARD-CODED EXHIBITS** (lines 323-336):
```typescript
const sampleExhibits = [
  {
    id: "1",
    title: "Market Size Analysis",
    type: "chart" as const,
    data: {},  // ⚠️ EMPTY
  },
  {
    id: "2",
    title: "Revenue Breakdown",
    type: "table" as const,
    data: {},  // ⚠️ EMPTY
  },
]
```
**NOTE**: `case_exhibits` table DOES NOT EXIST

**DataExhibitSlideover Render** (line 242):
```typescript
<DataExhibitSlideover exhibits={sampleExhibits} />
```

**Tables Written**: `interviews`
**Hard-Coded Content**: Exhibits (lines 323-336)

---

### `components/data-exhibit-slideover.tsx`
**Purpose**: Slideover panel for case exhibits
**Type**: Client Component
**Lines**: 85 total

**Props** (lines 9-18):
```typescript
interface DataExhibit {
  id: string
  title: string
  type: "chart" | "table" | "image"
  data: any
}

interface DataExhibitSlideoverProps {
  exhibits?: DataExhibit[]
}
```

**State** (line 21):
```typescript
const [isOpen, setIsOpen] = useState(false)
```

**⚠️ PLACEHOLDER RENDERING** (lines 68-74):
```typescript
<div className="flex h-48 items-center justify-center text-sm text-muted-foreground">
  {exhibit.type === "chart" && "Chart visualization"}
  {exhibit.type === "table" && "Table data"}
  {exhibit.type === "image" && "Image exhibit"}
</div>
```
**NOTE**: No actual exhibit data rendered (placeholder text only)

**Supabase**: NONE (receives data as props)

---

### `components/audio-visualizer.tsx`
**Purpose**: Animated blob + waveform for voice feedback
**Type**: Client Component
**Lines**: 92 total

**Props** (lines 5-8):
```typescript
interface AudioVisualizerProps {
  isActive: boolean      // AI speaking
  isListening: boolean   // User speaking
}
```

**Rendering**:
- Lines 54-85: Yellow blob with morph animations
- Lines 14-50: Canvas waveform (random bars, not real audio analysis)

**Supabase**: NONE (pure UI component)

---

### `components/transcript-display.tsx`
**Purpose**: Transcript viewer component (not currently used)
**Status**: Placeholder/future feature

---

### `components/trend-chart.tsx`
**Purpose**: Line chart for performance over time
**Type**: Client Component (assumed Recharts wrapper)
**Used By**: `app/interview/[id]/feedback/page.tsx:197`

---

### `components/performance-radar-chart.tsx`
**Purpose**: Radar chart for feedback scores
**Type**: Client Component (assumed Recharts wrapper)
**Used By**: `app/interview/[id]/feedback/page.tsx:185`

---

### `components/theme-provider.tsx`
**Purpose**: Dark mode theme provider (not currently used)
**Status**: Placeholder for future theme support

---

## UI Component Library (v0 Generated) ✅ SAFE TO DELETE/REGENERATE

All files in `components/ui/` are auto-generated by v0.app and Shadcn. They can be safely regenerated if broken. **Total: 60+ files**

### Core UI Components (Most Used):

1. **`components/ui/button.tsx`**
   Purpose: Button component with variants (default, outline, ghost, destructive)

2. **`components/ui/card.tsx`**
   Purpose: Card container (Card, CardHeader, CardTitle, CardContent)

3. **`components/ui/badge.tsx`**
   Purpose: Badge/pill component (difficulty indicators, plan badges)

4. **`components/ui/dialog.tsx`**
   Purpose: Modal dialog (future: upgrade prompts)

5. **`components/ui/sheet.tsx`**
   Purpose: Slideover/drawer (used by DataExhibitSlideover)

6. **`components/ui/progress.tsx`**
   Purpose: Progress bars (feedback score displays)

7. **`components/ui/input.tsx`**
   Purpose: Text input field

8. **`components/ui/label.tsx`**
   Purpose: Form labels

9. **`components/ui/separator.tsx`**
   Purpose: Horizontal/vertical dividers

10. **`components/ui/alert.tsx`**
    Purpose: Alert banners (future: quota warnings)

### Full UI Components List:

```
components/ui/accordion.tsx          - Collapsible sections
components/ui/alert-dialog.tsx       - Confirmation modals
components/ui/aspect-ratio.tsx       - Image aspect ratio container
components/ui/avatar.tsx             - User avatar display
components/ui/badge.tsx              - Status badges ⭐
components/ui/breadcrumb.tsx         - Navigation breadcrumbs
components/ui/button.tsx             - Buttons ⭐⭐⭐
components/ui/button-group.tsx       - Button grouping
components/ui/calendar.tsx           - Date picker
components/ui/card.tsx               - Cards ⭐⭐⭐
components/ui/carousel.tsx           - Image carousel
components/ui/chart.tsx              - Recharts wrapper
components/ui/checkbox.tsx           - Checkbox input
components/ui/collapsible.tsx        - Expandable sections
components/ui/command.tsx            - Command palette
components/ui/context-menu.tsx       - Right-click menu
components/ui/dialog.tsx             - Modals ⭐⭐
components/ui/drawer.tsx             - Bottom drawer
components/ui/dropdown-menu.tsx      - Dropdown menus
components/ui/empty.tsx              - Empty state placeholder
components/ui/field.tsx              - Form field wrapper
components/ui/form.tsx               - Form components
components/ui/hover-card.tsx         - Popover on hover
components/ui/input.tsx              - Text inputs ⭐
components/ui/input-group.tsx        - Input with addons
components/ui/input-otp.tsx          - OTP input
components/ui/item.tsx               - List item component
components/ui/kbd.tsx                - Keyboard shortcut display
components/ui/label.tsx              - Form labels ⭐
components/ui/menubar.tsx            - Menu bar
components/ui/navigation-menu.tsx    - Nav menu
components/ui/pagination.tsx         - Page navigation
components/ui/popover.tsx            - Popover tooltips
components/ui/progress.tsx           - Progress bars ⭐⭐
components/ui/radio-group.tsx        - Radio buttons
components/ui/resizable.tsx          - Resizable panels
components/ui/scroll-area.tsx        - Scrollable container
components/ui/select.tsx             - Select dropdown
components/ui/separator.tsx          - Dividers ⭐
components/ui/sheet.tsx              - Slideove/drawer ⭐
components/ui/sidebar.tsx            - Sidebar navigation
components/ui/skeleton.tsx           - Loading skeleton
components/ui/slider.tsx             - Range slider
components/ui/sonner.tsx             - Toast notifications
components/ui/spinner.tsx            - Loading spinner
components/ui/switch.tsx             - Toggle switch
components/ui/table.tsx              - Data tables
components/ui/tabs.tsx               - Tab navigation
components/ui/textarea.tsx           - Multiline text input
components/ui/toast.tsx              - Toast notification
components/ui/toaster.tsx            - Toast container
components/ui/toggle.tsx             - Toggle button
components/ui/toggle-group.tsx       - Toggle group
components/ui/tooltip.tsx            - Tooltips
components/ui/use-mobile.tsx         - Mobile hook (duplicate)
components/ui/use-toast.ts           - Toast hook (duplicate)
```

**v0 Artifacts**: All 60+ files
**Safe to Regenerate**: YES
**Customization**: Minimal (mostly default Shadcn)

---

## Database Scripts (Supabase SQL)

### `scripts/001_create_schema.sql` ⭐ DATABASE SCHEMA
**Purpose**: Core database schema and RLS policies
**Lines**: 156 total

**Tables Created**:

1. **`profiles`** (lines 2-8):
   ```sql
   CREATE TABLE IF NOT EXISTS public.profiles (
     id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
     email TEXT NOT NULL,
     full_name TEXT,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **`cases`** ⭐ CASE CONTENT SOURCE (lines 10-22):
   ```sql
   CREATE TABLE IF NOT EXISTS public.cases (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     title TEXT NOT NULL,
     description TEXT NOT NULL,
     industry TEXT NOT NULL,
     difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
     case_type TEXT NOT NULL CHECK (case_type IN ('market-sizing', 'profitability', 'market-entry', 'pricing', 'growth-strategy', 'operations')),
     estimated_duration INTEGER NOT NULL,
     prompt TEXT NOT NULL,           -- ⭐ INITIAL INTERVIEWER MESSAGE
     key_concepts TEXT[] NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```
   **NOTE**: NO separate `case_content` table

3. **`interviews`** (lines 24-35):
   ```sql
   CREATE TABLE IF NOT EXISTS public.interviews (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
     case_id UUID NOT NULL REFERENCES public.cases(id) ON DELETE CASCADE,
     status TEXT NOT NULL CHECK (status IN ('in-progress', 'completed', 'abandoned')),
     transcript JSONB DEFAULT '[]'::JSONB,  -- ⭐ FULL CONVERSATION
     started_at TIMESTAMPTZ DEFAULT NOW(),
     completed_at TIMESTAMPTZ,
     duration INTEGER,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

4. **`feedback`** (lines 38-49):
   ```sql
   CREATE TABLE IF NOT EXISTS public.feedback (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     interview_id UUID NOT NULL REFERENCES public.interviews(id) ON DELETE CASCADE,
     overall_score INTEGER CHECK (overall_score >= 0 AND overall_score <= 100),
     structure_score INTEGER CHECK (structure_score >= 0 AND structure_score <= 100),
     analysis_score INTEGER CHECK (analysis_score >= 0 AND analysis_score <= 100),
     communication_score INTEGER CHECK (communication_score >= 0 AND communication_score <= 100),
     strengths TEXT[] NOT NULL,
     areas_for_improvement TEXT[] NOT NULL,
     detailed_feedback TEXT NOT NULL,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

5. **`user_stats`** (lines 52-63):
   ```sql
   CREATE TABLE IF NOT EXISTS public.user_stats (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
     total_interviews INTEGER DEFAULT 0,
     completed_interviews INTEGER DEFAULT 0,
     average_score DECIMAL(5,2) DEFAULT 0,
     current_streak INTEGER DEFAULT 0,
     longest_streak INTEGER DEFAULT 0,
     last_interview_date DATE,
     created_at TIMESTAMPTZ DEFAULT NOW(),
     updated_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

**RLS Policies** (lines 66-123):
- All tables have RLS enabled
- User-scoped policies (users can only see their own data)
- Public read for `cases` table
- Feedback policies use JOIN to verify ownership

**Functions** (lines 126-155):
- `handle_new_user()`: Auto-creates profile + stats on signup

**❌ MISSING TABLES**:
- `case_content` - DOES NOT EXIST
- `case_exhibits` - DOES NOT EXIST

---

### `scripts/002_seed_cases.sql` ⭐ HARD-CODED CASE CONTENT
**Purpose**: Seed sample cases into database
**Lines**: 63 total

**Cases Inserted**: 6 total

1. **Coffee Chain Expansion** (lines 3-12):
   ```sql
   INSERT INTO public.cases (title, description, industry, difficulty, case_type, estimated_duration, prompt, key_concepts) VALUES
   (
     'Coffee Chain Expansion',
     'A national coffee chain is considering expanding into a new city...',
     'Retail',
     'beginner',
     'market-entry',
     30,
     'Our client is a successful coffee chain with 200 locations...',  -- ⭐ PROMPT
     ARRAY['market analysis', 'competitive landscape', ...]
   )
   ```

2. **Tech Startup Profitability** (lines 13-22)
3. **Airline Market Sizing** (lines 24-32)
4. **Pharmaceutical Pricing Strategy** (lines 34-42)
5. **E-commerce Growth Strategy** (lines 44-52)
6. **Manufacturing Operations Improvement** (lines 54-62)

**NOTE**: Case content is hard-coded in SQL (NOT in separate `case_content` table)

---

### `scripts/003_create_mock_user.sql` ⚠️ DELETE AFTER ECHO
**Purpose**: Create mock demo user for testing
**Lines**: 24 total

**Inserts**:
- Mock user profile (id: `00000000-0000-0000-0000-000000000001`)
- Mock user stats

**DELETE**: After Echo SDK migration

---

### `scripts/004_setup_mock_user_bypass.sql` ⚠️ DELETE AFTER ECHO
**Purpose**: RLS bypass policies for mock user
**Lines**: 56 total

**Policies Created**:
- Allow mock user access to all tables
- Bypass foreign key constraints for demo

**DELETE**: After Echo SDK migration

---

### `scripts/005_fix_mock_user_constraints.sql` ⚠️ DELETE AFTER ECHO
**Purpose**: Additional mock user constraint fixes
**DELETE**: After Echo SDK migration

---

## Public Assets

### `public/` directory
**Contents**: Static assets (images, favicons)
**Note**: No exhibits folder (exhibits are hard-coded placeholders)
**Future**: Create `public/exhibits/` for case chart images

---

## Summary Tables

### Supabase Usage Map

| File | Line(s) | Purpose | Tables |
|------|---------|---------|--------|
| **Initialization** | | | |
| `lib/supabase/client.ts` | 3-5 | Browser client | N/A |
| `lib/supabase/server.ts` | 4-23 | Server client | N/A |
| `lib/supabase/middleware.ts` | 9-26 | Middleware client (unused) | N/A |
| **Queries** | | | |
| `app/dashboard/page.tsx` | 26-27 | Fetch user profile | `profiles` |
| `app/dashboard/page.tsx` | 29-30 | Fetch user stats | `user_stats` |
| `app/dashboard/page.tsx` | 32-33 | Fetch all cases ⭐ | `cases` |
| `app/dashboard/page.tsx` | 35-42 | Fetch recent interviews | `interviews`, `feedback` |
| `app/interview/[id]/page.tsx` | 17 | Fetch case by ID ⭐ | `cases` |
| `app/interview/[id]/feedback/page.tsx` | 43-47 | Fetch interview + feedback | `interviews`, `cases`, `feedback` |
| `app/interview/[id]/feedback/page.tsx` | 60-65 | Fetch all interviews (trend) | `interviews`, `feedback` |
| `app/api/interview/feedback/route.ts` | 17 | Fetch interview for analysis | `interviews`, `cases` |
| **Writes** | | | |
| `app/interview/[id]/page.tsx` | 31-39 | Create interview session | `interviews` |
| `components/voice-interview-client.tsx` | 206-214 | Save transcript | `interviews` |
| `app/api/interview/feedback/route.ts` | 88-95 | Insert feedback | `feedback` |
| `app/api/interview/feedback/route.ts` | 104-112 | Update user stats | `user_stats` |

---

### Case Content Sources

| Content Type | Source | Status | File |
|--------------|--------|--------|------|
| **Case Metadata** | `cases` table | ✅ Exists | `scripts/001_create_schema.sql:10-22` |
| **Case Prompt** | `cases.prompt` field | ✅ Exists | `scripts/002_seed_cases.sql` (hard-coded) |
| **Case Exhibits** | ❌ DOES NOT EXIST | ⚠️ UNKNOWN | Hard-coded @ `components/voice-interview-client.tsx:323-336` |
| **Exhibit Images** | ❌ DOES NOT EXIST | ⚠️ UNKNOWN | Placeholder text only |
| **`case_content` table** | ❌ DOES NOT EXIST | ⚠️ UNKNOWN | N/A |
| **`case_exhibits` table** | ❌ DOES NOT EXIST | ⚠️ UNKNOWN | N/A |

---

### Hard-Coded Content Locations

1. **Exhibit Placeholders** (components/voice-interview-client.tsx:323-336):
   ```typescript
   const sampleExhibits = [
     { id: "1", title: "Market Size Analysis", type: "chart", data: {} },
     { id: "2", title: "Revenue Breakdown", type: "table", data: {} },
   ]
   ```

2. **Case Content** (scripts/002_seed_cases.sql:1-63):
   - All case titles, descriptions, prompts hard-coded in SQL
   - No separate content management system

---

### v0-Generated Files (Safe to Delete/Regenerate)

**Count**: 60+ files
**Location**: `components/ui/`

**Specific Paths** (8+ examples as requested):

1. `components/ui/button.tsx` - Button component
2. `components/ui/card.tsx` - Card container
3. `components/ui/dialog.tsx` - Modal dialog
4. `components/ui/sheet.tsx` - Slideover drawer
5. `components/ui/badge.tsx` - Status badges
6. `components/ui/progress.tsx` - Progress bars
7. `components/ui/input.tsx` - Text input
8. `components/ui/label.tsx` - Form labels
9. `components/ui/alert.tsx` - Alert banners
10. `components/ui/separator.tsx` - Dividers
11. `components/ui/toast.tsx` - Toast notifications
12. `components/ui/dropdown-menu.tsx` - Dropdown menus
13. `components/ui/checkbox.tsx` - Checkboxes
14. `components/ui/select.tsx` - Select dropdowns
15. `components/ui/table.tsx` - Data tables

**All can be regenerated via**:
```bash
npx shadcn@latest add <component-name>
```

---

## Proof of Supabase Integration

### ✅ Supabase is REAL and ACTIVE

**Evidence**:

1. **Client Initialization**: 3 files (`lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`)

2. **Environment Variables Required**:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`

3. **8 Query Locations** across 5 files:
   - Dashboard: 4 queries (profiles, user_stats, cases, interviews)
   - Interview page: 1 query (fetch case)
   - Feedback page: 2 queries (interview+feedback, all interviews)
   - Feedback API: 1 query (interview for LLM analysis)

4. **4 Write Locations**:
   - Create interview session
   - Save transcript after interview
   - Insert feedback
   - Update user stats

5. **Complete Schema** (`scripts/001_create_schema.sql`):
   - 5 tables with RLS policies
   - Foreign key relationships
   - Trigger functions for user creation

6. **Seed Data** (`scripts/002_seed_cases.sql`):
   - 6 sample cases
   - Ready to query immediately

**Supabase is the single source of truth for**:
- User profiles
- Interview sessions
- Transcripts (JSONB in `interviews.transcript`)
- Feedback scores
- User progress stats

---

## Route Map

```
/ (public)
  └─ app/page.tsx - Landing page

/auth
  ├─ /auth/login - app/auth/login/page.tsx (mock auth, replace with Echo)
  ├─ /auth/sign-up - app/auth/sign-up/page.tsx (mock auth, replace with Echo)
  └─ /auth/check-email - app/auth/check-email/page.tsx (placeholder)

/dashboard (protected)
  └─ app/dashboard/page.tsx - Main hub, lists cases

/interview (protected)
  ├─ /interview/[id] - app/interview/[id]/page.tsx - Interview session
  └─ /interview/[id]/feedback - app/interview/[id]/feedback/page.tsx - Feedback display

/api
  ├─ /api/auth/mock-signin - app/api/auth/mock-signin/route.ts (DELETE)
  ├─ /api/auth/signout - app/api/auth/signout/route.ts (update for Echo)
  ├─ /api/interview/chat - app/api/interview/chat/route.ts (LLM inference)
  ├─ /api/interview/feedback - app/api/interview/feedback/route.ts (AI feedback generation)
  └─ /api/interview/analyze - app/api/interview/analyze/route.ts (unused)
```

---

## Component Tree per Route

### `/` (Landing)
```
app/page.tsx
  └─ UI Components
      ├─ Button (x5) - Auth CTAs
      └─ Card (x4) - Feature cards
```

### `/dashboard`
```
app/dashboard/page.tsx
  └─ Header
      ├─ Button (sign out)
      └─ Badge (future: subscription status)
  └─ Stats Cards (x4)
      └─ Card
          ├─ CardHeader
          └─ CardTitle
  └─ Recent Interviews Grid
      └─ Card (x3)
          ├─ Badge (difficulty, case type)
          └─ Button (view feedback)
  └─ Available Cases Grid
      └─ Card (x6)
          ├─ Badge (difficulty, case type)
          └─ Button (start case)
```

### `/interview/[id]`
```
app/interview/[id]/page.tsx
  └─ VoiceInterviewClient (components/voice-interview-client.tsx)
      ├─ Header
      │   └─ Button (end interview)
      ├─ DataExhibitSlideover (components/data-exhibit-slideover.tsx)
      │   └─ Sheet
      │       └─ Card (x2) - Hard-coded exhibits
      ├─ AudioVisualizer (components/audio-visualizer.tsx)
      │   ├─ Canvas (waveform)
      │   └─ Animated blob
      └─ Controls
          ├─ Button (mic toggle)
          ├─ Button (skip AI speech)
          └─ Button (end interview)
```

### `/interview/[id]/feedback`
```
app/interview/[id]/feedback/page.tsx
  └─ Header
      └─ Button (back to dashboard)
  └─ Overall Score Card
      └─ Badge (difficulty)
  └─ Performance Breakdown Card
      └─ Progress (x3) - Score bars
  └─ PerformanceRadarChart (components/performance-radar-chart.tsx)
  └─ TrendChart (components/trend-chart.tsx) [conditional]
  └─ Strengths Card
  └─ Areas for Improvement Card
  └─ Detailed Feedback Card
  └─ Actions
      ├─ Button (back to dashboard)
      └─ Button (practice another case)
```

---

## Final Checklist

- ✅ **Supabase Initialized**: 3 locations (client, server, middleware)
- ✅ **Session State Read**: `getMockSession()` in 6 files (replace with Echo)
- ✅ **Supabase Queries**: 8 locations across 5 files
- ❌ **`case_content` table**: DOES NOT EXIST (using `cases` table)
- ❌ **`case_exhibits` table**: DOES NOT EXIST (hard-coded in component)
- ⚠️ **Hard-Coded Case Text**: In SQL seed file (`scripts/002_seed_cases.sql`)
- ⚠️ **Hard-Coded Exhibit Paths**: In component (`components/voice-interview-client.tsx:323-336`)
- ✅ **v0 Files Identified**: 60+ in `components/ui/` (safe to regenerate)
- ✅ **Delete After Echo**: 4 files (mock auth + SQL scripts)

**Supabase is REAL. Case exhibits are NOT.**

---

**End of File Index** | Last updated: 2025-10-10
