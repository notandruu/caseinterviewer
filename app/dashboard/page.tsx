import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Clock, TrendingUp, Target, Flame } from "lucide-react"
import Link from "next/link"
import { getMockSession, getMockUser } from "@/lib/auth/mock-auth"
import { EchoTokensWidget } from "@/components/echo/EchoTokensWidget"

export default async function DashboardPage() {
  const isAuthenticated = await getMockSession()

  if (!isAuthenticated) {
    redirect("/auth/login")
  }

  const mockUser = getMockUser()
  const supabase = await createClient()

  let profile = null
  let userStats = null
  let cases = []
  let recentInterviews = []

  try {
    const profileResult = await supabase.from("profiles").select("*").eq("id", mockUser.id).maybeSingle()
    profile = profileResult.data

    const statsResult = await supabase.from("user_stats").select("*").eq("user_id", mockUser.id).maybeSingle()
    userStats = statsResult.data

    const casesResult = await supabase.from("cases").select("*").order("difficulty", { ascending: true })
    cases = casesResult.data || []

    const interviewsResult = await supabase
      .from("interviews")
      .select("*, cases(*), feedback(*)")
      .eq("user_id", mockUser.id)
      .eq("status", "completed")
      .order("completed_at", { ascending: false })
      .limit(3)
    recentInterviews = interviewsResult.data || []
  } catch (error) {
    console.error("[v0] Dashboard data fetch error:", error)
    // Continue with default values
  }

  const displayStats = {
    total_interviews: userStats?.total_interviews || 0,
    completed_interviews: userStats?.completed_interviews || 0,
    average_score: userStats?.average_score || 0,
    current_streak: userStats?.current_streak || 0,
  }

  const getDifficultyIcon = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return <Target className="h-4 w-4" />
      case "intermediate":
        return <TrendingUp className="h-4 w-4" />
      case "advanced":
        return <Flame className="h-4 w-4" />
      default:
        return <Target className="h-4 w-4" />
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "beginner":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100"
      case "intermediate":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-100"
      case "advanced":
        return "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-100"
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900 dark:text-gray-100"
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <Target className="h-5 w-5 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold">Case Now</span>
          </div>
          <div className="flex items-center gap-4">
            <EchoTokensWidget />
          </div>
        </div>
      </header>

      <main className="container mx-auto flex-1 space-y-8 p-6">
        <div>
          <h1 className="mb-2 text-3xl font-bold">Your Dashboard</h1>
          <p className="text-muted-foreground">Track your progress and practice case interviews</p>
        </div>

        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Total Interviews</CardDescription>
              <CardTitle className="text-3xl">{displayStats.total_interviews}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Completed</CardDescription>
              <CardTitle className="text-3xl">{displayStats.completed_interviews}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Average Score</CardDescription>
              <CardTitle className="text-3xl">{displayStats.average_score.toFixed(0)}</CardTitle>
            </CardHeader>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardDescription>Current Streak</CardDescription>
              <CardTitle className="text-3xl">{displayStats.current_streak} days</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {recentInterviews && recentInterviews.length > 0 && (
          <div>
            <h2 className="mb-4 text-2xl font-bold">Recent Interviews</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {recentInterviews.map((interview: any) => (
                <Card key={interview.id}>
                  <CardHeader>
                    <CardTitle className="text-lg">{interview.cases.title}</CardTitle>
                    <CardDescription>{interview.cases.industry}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <Badge className={getDifficultyColor(interview.cases.difficulty)}>
                        {getDifficultyIcon(interview.cases.difficulty)}
                        <span className="ml-1 capitalize">{interview.cases.difficulty}</span>
                      </Badge>
                      {interview.feedback?.[0] && (
                        <span className="text-2xl font-bold">{interview.feedback[0].overall_score}</span>
                      )}
                    </div>
                    <Link href={`/interview/${interview.id}/feedback`}>
                      <Button variant="ghost" size="sm" className="mt-4 w-full">
                        View Feedback
                      </Button>
                    </Link>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        <div>
          <h2 className="mb-4 text-2xl font-bold">Available Cases</h2>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {cases?.map((caseItem) => (
              <Card key={caseItem.id} className="flex flex-col">
                <CardHeader>
                  <div className="mb-2 flex items-start justify-between">
                    <Badge className={getDifficultyColor(caseItem.difficulty)}>
                      {getDifficultyIcon(caseItem.difficulty)}
                      <span className="ml-1 capitalize">{caseItem.difficulty}</span>
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {caseItem.case_type.replace("-", " ")}
                    </Badge>
                  </div>
                  <CardTitle className="text-xl">{caseItem.title}</CardTitle>
                  <CardDescription className="line-clamp-2">{caseItem.description}</CardDescription>
                </CardHeader>
                <CardContent className="flex flex-1 flex-col justify-end gap-4">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{caseItem.estimated_duration} min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Target className="h-4 w-4" />
                      <span>{caseItem.industry}</span>
                    </div>
                  </div>
                  <Link href={`/interview/${caseItem.id}`} className="w-full">
                    <Button className="w-full">Start Case</Button>
                  </Link>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </main>
    </div>
  )
}
