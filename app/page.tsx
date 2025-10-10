import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Mic, BarChart3, Target, Zap } from "lucide-react"
import Link from "next/link"

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      {/* Header */}
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Mic className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">CasePrep AI</span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1">
        <section className="container mx-auto px-4 py-20 text-center">
          <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-balance text-5xl font-bold leading-tight tracking-tight md:text-6xl">
              Master case interviews with <span className="text-primary">voice-first AI</span>
            </h1>
            <p className="text-pretty text-xl text-muted-foreground">
              Practice consulting case interviews naturally with our AI interviewer. Get real-time feedback and track
              your progress toward landing your dream job.
            </p>
            <div className="flex flex-col items-center justify-center gap-4 pt-4 sm:flex-row">
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2">
                  <Mic className="h-5 w-5" />
                  Start practicing free
                </Button>
              </Link>
              <Link href="/auth/login">
                <Button size="lg" variant="outline">
                  Sign in
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="container mx-auto px-4 py-20">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <Mic className="h-6 w-6 text-blue-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Voice-First Experience</h3>
                <p className="text-sm text-muted-foreground">
                  Practice speaking naturally, just like a real interview. No typing required.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-indigo-100">
                  <Target className="h-6 w-6 text-indigo-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Real Case Scenarios</h3>
                <p className="text-sm text-muted-foreground">
                  Practice with authentic cases across industries and difficulty levels.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <Zap className="h-6 w-6 text-purple-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Instant Feedback</h3>
                <p className="text-sm text-muted-foreground">
                  Get detailed AI-powered feedback on structure, analysis, and communication.
                </p>
              </CardContent>
            </Card>

            <Card className="border-2">
              <CardContent className="pt-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-pink-100">
                  <BarChart3 className="h-6 w-6 text-pink-600" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">Track Progress</h3>
                <p className="text-sm text-muted-foreground">
                  Monitor your improvement with detailed analytics and performance metrics.
                </p>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* CTA Section */}
        <section className="container mx-auto px-4 py-20">
          <Card className="border-2 bg-gradient-to-br from-primary/5 to-primary/10">
            <CardContent className="p-12 text-center">
              <h2 className="mb-4 text-3xl font-bold">Ready to ace your case interview?</h2>
              <p className="mb-6 text-lg text-muted-foreground">
                Join hundreds of candidates preparing for McKinsey, BCG, Bain, and more.
              </p>
              <Link href="/auth/sign-up">
                <Button size="lg" className="gap-2">
                  <Mic className="h-5 w-5" />
                  Get started now
                </Button>
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          <p>© 2025 CasePrep AI. Built for aspiring consultants.</p>
        </div>
      </footer>
    </div>
  )
}
