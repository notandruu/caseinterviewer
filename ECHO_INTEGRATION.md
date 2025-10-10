# Echo SDK Integration Guide - Subscription Model

## Overview

CaserAI uses **Echo SDK for OAuth authentication and monthly subscription management**.

**Key Principles**:
- ✅ Echo handles: Auth (OAuth) + Subscriptions (monthly plans)
- ✅ Direct LLM calls: Vercel AI SDK → OpenAI (NOT metered through Echo)
- ✅ Subscription gate: Check plan status BEFORE expensive operations
- ✅ Supabase: Source of truth for interviews, transcripts, feedback

**NOT using**:
- ❌ Per-session metering (no "3 interviews/month" limits)
- ❌ Token-based billing (no "1000 messages/month" quotas)
- ❌ Echo LLM proxy (direct provider calls)

---

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────┐
│                    User Request                          │
└─────────────────────┬───────────────────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   Echo SDK (Auth)      │
         │  - OAuth sign-in       │
         │  - Session management  │
         └────────────┬───────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │  Echo API (Plans)      │
         │  - Get subscription    │
         │  - Check status        │
         │    • trial             │
         │    • active            │
         │    • expired           │
         └────────────┬───────────┘
                      │
                      ▼
              ┌───────────────┐
              │ Status Check  │
              │ active/trial? │
              └───────┬───────┘
                      │
         ┌────────────┴────────────┐
         │                         │
    ✅ YES                     ❌ NO
         │                         │
         ▼                         ▼
┌─────────────────┐    ┌──────────────────┐
│  Vercel AI SDK  │    │ Return 402       │
│  ↓              │    │ Payment Required │
│ OpenAI API      │    │ + upgrade_url    │
│  ↓              │    └──────────────────┘
│ Generate Text   │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Supabase DB   │
│ - Save session  │
│ - Save feedback │
└─────────────────┘
```

---

## Plan Configuration

### Recommended Plans (Configure in Echo Dashboard)

```yaml
free_trial:
  price: $0
  duration: 7 days
  description: "Try CaserAI free for 7 days"
  features:
    - unlimited_interviews
    - ai_interviewer
    - basic_feedback
  trial: true

pro:
  price: $29/month
  description: "Unlimited practice + premium features"
  features:
    - unlimited_interviews
    - ai_interviewer
    - detailed_feedback     # LLM-generated analysis
    - progress_analytics    # Trend charts
    - transcript_export
    - priority_support

enterprise:
  price: custom
  description: "For teams and institutions"
  features:
    - all_pro_features
    - team_analytics
    - white_label
    - custom_cases
    - sso
```

### Feature Matrix

| Feature | Free Trial | Pro | Enterprise |
|---------|------------|-----|------------|
| **Interviews** | Unlimited (7 days) | Unlimited | Unlimited |
| **AI Interviewer** | ✅ | ✅ | ✅ |
| **Basic Scores** | ✅ | ✅ | ✅ |
| **LLM Feedback** | ✅ | ✅ | ✅ |
| **Progress Charts** | ❌ | ✅ | ✅ |
| **Transcript Export** | ❌ | ✅ | ✅ |
| **Team Analytics** | ❌ | ❌ | ✅ |

---

## Implementation Guide

### Step 1: Install Echo SDK

```bash
cd /Users/dennisliu/Downloads/case-interview-simulator
pnpm add @echo/sdk  # or npm/yarn
```

### Step 2: Environment Variables

Add to `.env.local`:

```bash
# Echo SDK
NEXT_PUBLIC_ECHO_PUBLIC_KEY=pk_live_...  # From Echo dashboard
ECHO_SECRET_KEY=sk_live_...              # Server-only

# Existing (keep these)
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
```

### Step 3: Initialize Echo Provider

**File**: `app/layout.tsx`

**Current** (lines 1-26):
```typescript
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import './globals.css'

export const metadata: Metadata = {
  title: 'v0 App',
  description: 'Created with v0',
  generator: 'v0.app',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        {children}
        <Analytics />
      </body>
    </html>
  )
}
```

**Updated** (add Echo provider):
```typescript
import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { Analytics } from '@vercel/analytics/next'
import { EchoProvider } from '@echo/sdk'  // ← ADD THIS
import './globals.css'

export const metadata: Metadata = {
  title: 'CasePrep AI',
  description: 'Master case interviews with voice-first AI',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${GeistSans.variable} ${GeistMono.variable}`}>
        <EchoProvider publicKey={process.env.NEXT_PUBLIC_ECHO_PUBLIC_KEY!}>
          {children}
        </EchoProvider>
        <Analytics />
      </body>
    </html>
  )
}
```

---

## Step 4: Replace Mock Auth with Echo OAuth

### 4A. Update Login Page

**File**: `app/auth/login/page.tsx`

**Current** (lines 15-32):
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
  } finally {
    setIsLoading(false)
  }
}
```

**Updated** (Echo OAuth):
```typescript
import { useEcho } from '@echo/sdk'  // ← ADD THIS

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()
  const { signIn } = useEcho()  // ← ADD THIS

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const session = await signIn({
        provider: 'google',  // or 'email', 'github', etc.
      })

      if (session) {
        // Sync Echo user to Supabase
        await syncUserToSupabase(session.user)

        router.push("/dashboard")
      }
    } catch (error) {
      console.error("Sign in error:", error)
    } finally {
      setIsLoading(false)
    }
  }

  // ... rest of component
}
```

### 4B. Create User Sync Utility

**New File**: `lib/auth/sync-user.ts`

```typescript
import { createClient } from '@/lib/supabase/client'

interface EchoUser {
  id: string
  email: string
  name?: string
  metadata?: Record<string, any>
}

export async function syncUserToSupabase(echoUser: EchoUser) {
  const supabase = createClient()

  // Upsert profile
  const { error: profileError } = await supabase
    .from('profiles')
    .upsert({
      id: echoUser.id,
      email: echoUser.email,
      full_name: echoUser.name || echoUser.email.split('@')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', echoUser.id)

  if (profileError) {
    console.error('Profile sync error:', profileError)
  }

  // Initialize user stats (if new user)
  const { error: statsError } = await supabase
    .from('user_stats')
    .insert({
      user_id: echoUser.id,
      total_interviews: 0,
      completed_interviews: 0,
      average_score: 0,
      current_streak: 0,
      longest_streak: 0,
    })
    .select()
    .maybeSingle()

  // Ignore duplicate key errors (user already exists)
  if (statsError && !statsError.message.includes('duplicate')) {
    console.error('Stats init error:', statsError)
  }

  return { success: true }
}
```

### 4C. Update Middleware

**File**: `middleware.ts`

**Current** (lines 5-21):
```typescript
import { getMockSession } from "@/lib/auth/mock-auth"

export async function middleware(request: NextRequest) {
  const isAuthenticated = await getMockSession()
  const isAuthPage = request.nextUrl.pathname.startsWith("/auth")
  const isDashboardOrInterview =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/interview")

  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  if (!isAuthenticated && isDashboardOrInterview) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  return NextResponse.next()
}
```

**Updated** (Echo session):
```typescript
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"
import { getEchoSession } from "@echo/sdk/server"  // ← ADD THIS

export async function middleware(request: NextRequest) {
  const session = await getEchoSession(request)
  const isAuthenticated = !!session

  const isAuthPage = request.nextUrl.pathname.startsWith("/auth")
  const isDashboardOrInterview =
    request.nextUrl.pathname.startsWith("/dashboard") ||
    request.nextUrl.pathname.startsWith("/interview")

  // Redirect authenticated users away from auth pages
  if (isAuthenticated && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url))
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated && isDashboardOrInterview) {
    return NextResponse.redirect(new URL("/auth/login", request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
}
```

---

## Step 5: Add Subscription Gates

### 5A. Create Subscription Check Utility

**New File**: `lib/echo/subscription.ts`

```typescript
import { getEchoClient } from '@echo/sdk/server'

export interface SubscriptionStatus {
  status: 'active' | 'trial' | 'expired' | 'canceled' | 'none'
  plan: 'free_trial' | 'pro' | 'enterprise' | null
  trialEndsAt?: Date
  expiresAt?: Date
}

/**
 * Check if user has active subscription or trial
 */
export async function checkSubscription(userId: string): Promise<SubscriptionStatus> {
  const echo = getEchoClient()

  try {
    const subscription = await echo.subscriptions.get(userId)

    return {
      status: subscription.status,
      plan: subscription.plan?.id || null,
      trialEndsAt: subscription.trialEndsAt ? new Date(subscription.trialEndsAt) : undefined,
      expiresAt: subscription.expiresAt ? new Date(subscription.expiresAt) : undefined,
    }
  } catch (error) {
    console.error('[Echo] Subscription check failed:', error)

    // Fail open for now (allow access on error)
    // TODO: Change to fail closed in production
    return {
      status: 'active',
      plan: 'pro',
    }
  }
}

/**
 * Check if user can access paid features
 */
export async function canAccessPaidFeatures(userId: string): Promise<boolean> {
  const { status, plan } = await checkSubscription(userId)

  // Allow access if:
  // - Active paid plan
  // - Active trial
  const allowedStatuses = ['active', 'trial']
  const paidPlans = ['pro', 'enterprise', 'free_trial']

  return allowedStatuses.includes(status) && (plan ? paidPlans.includes(plan) : false)
}

/**
 * Get upgrade URL for current user
 */
export function getUpgradeUrl(): string {
  const echo = getEchoClient()
  return echo.getCheckoutUrl({ plan: 'pro' })
}
```

### 5B. Gate Interview Start

**File**: `app/interview/[id]/page.tsx`

**Current** (lines 9-12):
```typescript
const isAuthenticated = await getMockSession()
if (!isAuthenticated) {
  redirect("/auth/login")
}
```

**Updated** (add subscription check):
```typescript
import { getEchoSession } from "@echo/sdk/server"
import { checkSubscription } from "@/lib/echo/subscription"

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  // Auth check
  const session = await getEchoSession()
  if (!session) {
    redirect("/auth/login")
  }

  // Subscription check
  const subscription = await checkSubscription(session.user.id)

  if (!['active', 'trial'].includes(subscription.status)) {
    redirect(`/upgrade?reason=subscription_expired&returnTo=/interview/${id}`)
  }

  // Rest of existing code...
  const supabase = await createClient()
  const { data: caseData } = await supabase
    .from("cases")
    .select("*")
    .eq("id", id)
    .single()

  // ... continue with existing logic
}
```

### 5C. Gate Chat API (Most Important!)

**File**: `app/api/interview/chat/route.ts`

**Current** (lines 4-11):
```typescript
export async function POST(req: Request) {
  try {
    const { messages, caseContext, interviewId } = await req.json()

    const isAuthenticated = await getMockSession()
    if (!isAuthenticated) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }
```

**Updated** (subscription gate):
```typescript
import { getEchoSession } from "@echo/sdk/server"
import { checkSubscription, getUpgradeUrl } from "@/lib/echo/subscription"

export async function POST(req: Request) {
  try {
    const { messages, caseContext, interviewId } = await req.json()

    // Auth check
    const session = await getEchoSession(req)
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Subscription check (CRITICAL - gates expensive LLM calls)
    const subscription = await checkSubscription(session.user.id)

    if (!['active', 'trial'].includes(subscription.status)) {
      return Response.json({
        error: "Subscription required",
        message: subscription.status === 'expired'
          ? "Your subscription has expired. Upgrade to continue practicing."
          : "Please subscribe to use CasePrep AI.",
        subscription: {
          status: subscription.status,
          plan: subscription.plan,
        },
        upgrade_url: getUpgradeUrl(),
      }, { status: 402 })  // 402 Payment Required
    }

    // Existing LLM call (UNCHANGED - still direct OpenAI)
    const systemPrompt = `You are an experienced consulting interviewer...`

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
  } catch (error) {
    console.error("[Chat API] Error:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
```

### 5D. Gate Feedback Generation (Premium Feature)

**File**: `app/api/interview/feedback/route.ts`

**Current** (lines 8-15):
```typescript
const supabase = await createClient()
const {
  data: { user },
} = await supabase.auth.getUser()

if (!user) {
  return Response.json({ error: "Unauthorized" }, { status: 401 })
}
```

**Updated** (check if paid plan):
```typescript
import { getEchoSession } from "@echo/sdk/server"
import { checkSubscription, canAccessPaidFeatures } from "@/lib/echo/subscription"

export async function POST(req: Request) {
  try {
    const { interviewId } = await req.json()

    // Auth check
    const session = await getEchoSession(req)
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Feature gate: Detailed LLM feedback is Pro/Enterprise only
    const hasPaidAccess = await canAccessPaidFeatures(session.user.id)

    if (!hasPaidAccess) {
      // Generate basic feedback (no LLM) for trial/free users
      return generateBasicFeedback(interviewId)
    }

    // Existing code: Full LLM-powered feedback for paid users
    const supabase = await createClient()
    const { data: interview } = await supabase
      .from("interviews")
      .select("*, cases(*)")
      .eq("id", interviewId)
      .single()

    // ... rest of existing LLM feedback generation
  }
}

// Helper: Basic feedback without LLM
async function generateBasicFeedback(interviewId: string) {
  const supabase = await createClient()

  // Simple rule-based scoring
  const feedbackData = {
    overall_score: 75,
    structure_score: 75,
    analysis_score: 75,
    communication_score: 75,
    strengths: [
      "Completed the case interview",
      "Maintained professional demeanor",
      "Asked clarifying questions",
    ],
    areas_for_improvement: [
      "Upgrade to Pro for detailed AI-powered feedback",
      "Access personalized improvement recommendations",
      "See how you compare to other candidates",
    ],
    detailed_feedback: "Upgrade to Pro to unlock detailed AI analysis of your performance.",
  }

  await supabase.from("feedback").insert({
    interview_id: interviewId,
    ...feedbackData,
  })

  return Response.json({
    feedback: feedbackData,
    upgrade_message: "Upgrade to Pro for AI-powered feedback"
  })
}
```

---

## Step 6: Update Dashboard UI

### 6A. Show Subscription Status

**File**: `app/dashboard/page.tsx`

**Add after line 100** (header):
```typescript
import { getEchoSession } from "@echo/sdk/server"
import { checkSubscription } from "@/lib/echo/subscription"

export default async function DashboardPage() {
  // Existing auth check
  const session = await getEchoSession()
  if (!session) {
    redirect("/auth/login")
  }

  // Get subscription info
  const subscription = await checkSubscription(session.user.id)

  // Existing Supabase queries...
  const supabase = await createClient()
  // ...

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">CasePrep AI</span>
          </div>

          <div className="flex items-center gap-4">
            {/* Subscription badge */}
            <SubscriptionBadge subscription={subscription} />

            <span className="text-sm text-muted-foreground">
              Welcome, {profile?.full_name || session.user.name}
            </span>

            <form action="/api/auth/signout" method="post">
              <Button variant="ghost" size="sm" type="submit">
                Sign out
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Rest of page */}
    </div>
  )
}
```

### 6B. Create Subscription Badge Component

**New File**: `components/subscription-badge.tsx`

```typescript
import { Badge } from "@/components/ui/badge"
import { SubscriptionStatus } from "@/lib/echo/subscription"

interface SubscriptionBadgeProps {
  subscription: SubscriptionStatus
}

export function SubscriptionBadge({ subscription }: SubscriptionBadgeProps) {
  const getBadgeVariant = () => {
    switch (subscription.status) {
      case 'active':
        return subscription.plan === 'pro' || subscription.plan === 'enterprise'
          ? 'default'  // Blue for paid
          : 'secondary'
      case 'trial':
        return 'outline'
      case 'expired':
      case 'canceled':
        return 'destructive'
      default:
        return 'secondary'
    }
  }

  const getBadgeText = () => {
    switch (subscription.status) {
      case 'active':
        if (subscription.plan === 'pro') return 'Pro'
        if (subscription.plan === 'enterprise') return 'Enterprise'
        return 'Free'
      case 'trial':
        return 'Trial'
      case 'expired':
        return 'Expired'
      case 'canceled':
        return 'Canceled'
      default:
        return 'Free'
    }
  }

  return (
    <Badge variant={getBadgeVariant()}>
      {getBadgeText()}
    </Badge>
  )
}
```

### 6C. Add Trial Expiration Warning

**File**: `app/dashboard/page.tsx`

**Add after stats cards** (line 136):
```typescript
{/* Trial expiration banner */}
{subscription.status === 'trial' && subscription.trialEndsAt && (
  <Card className="border-2 border-amber-200 bg-amber-50">
    <CardContent className="flex items-center justify-between pt-6">
      <div>
        <h3 className="font-semibold text-amber-900">
          Trial Ending Soon
        </h3>
        <p className="text-sm text-amber-700">
          Your trial expires on {subscription.trialEndsAt.toLocaleDateString()}.
          Upgrade to Pro to keep unlimited access.
        </p>
      </div>
      <Link href={getUpgradeUrl()}>
        <Button>
          Upgrade to Pro
        </Button>
      </Link>
    </CardContent>
  </Card>
)}

{/* Subscription expired banner */}
{subscription.status === 'expired' && (
  <Card className="border-2 border-red-200 bg-red-50">
    <CardContent className="flex items-center justify-between pt-6">
      <div>
        <h3 className="font-semibold text-red-900">
          Subscription Expired
        </h3>
        <p className="text-sm text-red-700">
          Renew your subscription to continue practicing case interviews.
        </p>
      </div>
      <Link href={getUpgradeUrl()}>
        <Button variant="destructive">
          Renew Now
        </Button>
      </Link>
    </CardContent>
  </Card>
)}
```

---

## Step 7: Create Upgrade/Pricing Page

**New File**: `app/upgrade/page.tsx`

```typescript
import { getEchoSession } from "@echo/sdk/server"
import { checkSubscription } from "@/lib/echo/subscription"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Check } from "lucide-react"
import Link from "next/link"

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string; returnTo?: string }>
}) {
  const params = await searchParams
  const session = await getEchoSession()

  // Allow viewing pricing without auth
  const subscription = session ? await checkSubscription(session.user.id) : null

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold">CasePrep AI</span>
          </Link>
          {session && (
            <Link href="/dashboard">
              <Button variant="ghost">Back to Dashboard</Button>
            </Link>
          )}
        </div>
      </header>

      <main className="container mx-auto flex-1 px-4 py-12">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* Header */}
          <div className="text-center">
            <h1 className="mb-4 text-4xl font-bold">Unlock Your Full Potential</h1>
            <p className="text-xl text-muted-foreground">
              Get unlimited access to AI-powered case interview practice
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid gap-6 md:grid-cols-2">
            {/* Trial */}
            <Card className="border-2">
              <CardHeader>
                <CardTitle>Free Trial</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$0</span>
                  <span className="text-muted-foreground"> / 7 days</span>
                </div>
                <CardDescription className="mt-2">
                  Try all features free for 7 days
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {[
                    'Unlimited case interviews',
                    'AI interviewer',
                    'Basic feedback',
                    'Voice interaction',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                {!session ? (
                  <Link href="/auth/sign-up">
                    <Button className="w-full" size="lg">
                      Start Free Trial
                    </Button>
                  </Link>
                ) : subscription?.status === 'trial' ? (
                  <Button disabled className="w-full" size="lg">
                    Current Plan
                  </Button>
                ) : (
                  <Link href="/auth/sign-up">
                    <Button variant="outline" className="w-full" size="lg">
                      Sign Up
                    </Button>
                  </Link>
                )}
              </CardContent>
            </Card>

            {/* Pro */}
            <Card className="border-4 border-primary relative">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-primary px-4 py-1 text-sm font-semibold text-primary-foreground">
                  Most Popular
                </span>
              </div>
              <CardHeader>
                <CardTitle>Pro</CardTitle>
                <div className="mt-4">
                  <span className="text-4xl font-bold">$29</span>
                  <span className="text-muted-foreground"> / month</span>
                </div>
                <CardDescription className="mt-2">
                  Everything you need to ace your interviews
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {[
                    'Everything in Trial',
                    'Detailed AI feedback',
                    'Progress analytics',
                    'Transcript export',
                    'Priority support',
                  ].map((feature) => (
                    <li key={feature} className="flex items-center gap-2">
                      <Check className="h-4 w-4 text-green-600" />
                      <span className={feature === 'Everything in Trial' ? 'text-muted-foreground' : ''}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                <form action="/api/echo/checkout" method="POST">
                  <input type="hidden" name="plan" value="pro" />
                  {params.returnTo && (
                    <input type="hidden" name="returnTo" value={params.returnTo} />
                  )}
                  <Button className="w-full" size="lg" type="submit">
                    {subscription?.status === 'active' && subscription.plan === 'pro'
                      ? 'Current Plan'
                      : 'Upgrade to Pro'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Reason message */}
          {params.reason === 'subscription_expired' && (
            <Card className="border-2 border-amber-200 bg-amber-50">
              <CardContent className="pt-6 text-center">
                <p className="text-amber-900">
                  Your subscription has expired. Upgrade to continue practicing!
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  )
}
```

---

## Step 8: Echo Checkout API Route

**New File**: `app/api/echo/checkout/route.ts`

```typescript
import { NextRequest, NextResponse } from "next/server"
import { getEchoSession, getEchoClient } from "@echo/sdk/server"

export async function POST(req: NextRequest) {
  try {
    const session = await getEchoSession(req)

    if (!session) {
      return NextResponse.redirect(new URL('/auth/login', req.url))
    }

    const formData = await req.formData()
    const plan = formData.get('plan') as string
    const returnTo = formData.get('returnTo') as string | null

    const echo = getEchoClient()

    // Create checkout session
    const checkoutUrl = echo.createCheckoutSession({
      userId: session.user.id,
      plan: plan,
      successUrl: returnTo || '/dashboard',
      cancelUrl: '/upgrade',
    })

    return NextResponse.redirect(checkoutUrl)
  } catch (error) {
    console.error('[Echo Checkout] Error:', error)
    return NextResponse.redirect(new URL('/upgrade?error=checkout_failed', req.url))
  }
}
```

---

## Step 9: Clean Up Mock Auth

### Delete These Files:
```bash
rm lib/auth/mock-auth.ts
rm app/api/auth/mock-signin/route.ts
rm scripts/004_setup_mock_user_bypass.sql
rm scripts/005_fix_mock_user_constraints.sql
```

### Update Supabase RLS

Remove mock user policies from `scripts/001_create_schema.sql`:

**Remove these policies**:
```sql
-- DELETE THESE (mock user bypass)
CREATE POLICY IF NOT EXISTS "Allow mock user access to profiles" ON public.profiles
  FOR ALL USING (id = '00000000-0000-0000-0000-000000000001');

CREATE POLICY IF NOT EXISTS "Allow mock user access to user_stats" ON public.user_stats
  FOR ALL USING (user_id = '00000000-0000-0000-0000-000000000001');

-- ... etc
```

**Update to use Echo auth**:
```sql
-- Profiles: Users can only access their own profile
CREATE POLICY "Users can view their own profile" ON public.profiles
  FOR SELECT USING (auth.uid() = id);  -- Keep this

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);  -- Keep this

-- ... (rest stays the same)
```

---

## Step 10: Update Sign-Out Handler

**File**: `app/api/auth/signout/route.ts`

**Create/Update**:
```typescript
import { NextRequest, NextResponse } from "next/server"
import { getEchoClient } from "@echo/sdk/server"

export async function POST(req: NextRequest) {
  const echo = getEchoClient()

  await echo.auth.signOut()

  return NextResponse.redirect(new URL('/', req.url))
}
```

---

## Testing Checklist

### Auth Flow
- [ ] Sign up with Echo OAuth works
- [ ] User profile syncs to Supabase
- [ ] User stats initialize on first sign-up
- [ ] Sign in redirects to dashboard
- [ ] Sign out clears session
- [ ] Middleware protects routes

### Subscription Checks
- [ ] Trial users can start interviews
- [ ] Expired users see upgrade prompt
- [ ] Chat API blocks expired subscriptions (402)
- [ ] Feedback API shows basic/premium based on plan
- [ ] Upgrade page displays correctly

### Dashboard
- [ ] Subscription badge shows correct status
- [ ] Trial expiration warning appears
- [ ] Expired banner shows when needed
- [ ] Upgrade button links to correct URL

### Interview Flow
- [ ] Active subscribers can complete interviews
- [ ] LLM calls work (direct OpenAI)
- [ ] Transcripts save to Supabase
- [ ] Feedback generates correctly
- [ ] Stats update after completion

---

## Deployment Notes

### Environment Variables (Production)

```bash
# Echo (production keys)
NEXT_PUBLIC_ECHO_PUBLIC_KEY=pk_live_...
ECHO_SECRET_KEY=sk_live_...

# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# OpenAI (for direct LLM calls)
OPENAI_API_KEY=sk-...
```

### Vercel Deployment

1. Set environment variables in Vercel dashboard
2. Redeploy: `vercel --prod`
3. Test auth flow end-to-end
4. Verify subscription checks work
5. Monitor error logs for Echo API issues

### Echo Dashboard Configuration

1. Add production webhook URL: `https://yourdomain.com/api/echo/webhook`
2. Configure subscription plans (trial, pro, enterprise)
3. Set up Stripe integration (if using)
4. Test checkout flow in live mode
5. Enable analytics/usage tracking

---

## Migration from Mock Auth (Existing Users)

If you have existing users with mock auth:

```sql
-- Option 1: Clear mock users (development only)
DELETE FROM user_stats WHERE user_id = '00000000-0000-0000-0000-000000000001';
DELETE FROM profiles WHERE id = '00000000-0000-0000-0000-000000000001';

-- Option 2: Migrate real test data (if any)
-- Manual process: Export interviews/feedback, re-import under new Echo user IDs
```

---

## Summary: What Echo Does vs. What It Doesn't

### ✅ Echo SDK Handles
- OAuth authentication (Google, email, etc.)
- Session management
- Subscription status tracking
- Plan/tier management
- Checkout flow
- Webhook notifications

### ❌ Echo Does NOT Handle
- LLM API calls (you call OpenAI directly)
- Per-message metering
- Token counting
- Usage-based billing
- Interview session storage (use Supabase)
- Transcript/feedback storage (use Supabase)

### 🔑 Your Responsibility
- Check subscription status BEFORE expensive operations
- Call OpenAI/LLM provider directly (Vercel AI SDK)
- Store all user data in Supabase
- Handle LLM errors/retries
- Monitor OpenAI costs separately

---

**Integration Complete!** 🎉

Echo provides auth + subscription management.
You handle LLM calls + data storage.
Simple, clean separation of concerns.
