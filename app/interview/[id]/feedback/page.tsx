import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { PerformanceRadarChart } from "@/components/performance-radar-chart"
import { TrendChart } from "@/components/trend-chart"
import Link from "next/link"
import { CheckCircle2, AlertCircle, TrendingUp, Clock } from "lucide-react"
import { isEchoAuthenticated, getEchoUserId } from "@/lib/auth/echo-auth"

export default async function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const isAuthenticated = await isEchoAuthenticated()
  if (!isAuthenticated) {
    redirect("/auth/login")
  }

  const userId = await getEchoUserId()
  if (!userId) {
    redirect("/auth/login")
  }

  // For real interviews, use database
  const supabase = await createClient()

  const { data: interview } = await supabase
    .from("interviews")
    .select("*, cases(*), feedback(*)")
    .eq("id", id)
    .maybeSingle()

  if (!interview || interview.user_id !== userId) {
    redirect("/dashboard")
  }

  const feedback = interview.feedback?.[0]

  if (!feedback) {
    await generateFeedback(id, interview, supabase)
    redirect(`/interview/${id}/feedback`)
  }

  const { data: allInterviews } = await supabase
    .from("interviews")
    .select("*, feedback(*)")
    .eq("user_id", userId)
    .eq("status", "completed")
    .order("completed_at", { ascending: true })

  const trendData =
    allInterviews?.map((int: any) => ({
      date: new Date(int.completed_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      score: int.feedback?.[0]?.overall_score || 0,
    })) || []

  return renderFeedbackPage(interview, feedback, trendData)
}

function generateMockFeedback() {
  const structureScore = Math.floor(Math.random() * 15) + 75
  const analysisScore = Math.floor(Math.random() * 15) + 72
  const communicationScore = Math.floor(Math.random() * 15) + 80
  const overallScore = Math.floor((structureScore + analysisScore + communicationScore) / 3)

  return {
    overall_score: overallScore,
    structure_score: structureScore,
    analysis_score: analysisScore,
    communication_score: communicationScore,
    strengths: [
      "Clear and logical problem-solving approach",
      "Strong quantitative reasoning skills",
      "Effective communication of complex ideas",
      "Good use of frameworks to structure thinking",
    ],
    areas_for_improvement: [
      "Consider asking more clarifying questions upfront",
      "Develop deeper hypotheses before diving into analysis",
      "Practice synthesizing findings more concisely",
    ],
    detailed_feedback:
      "You demonstrated a solid understanding of case interview fundamentals. Your structure was well-organized and you communicated your thoughts clearly. To improve further, focus on asking more probing questions at the beginning to fully understand the problem scope. Your quantitative analysis was strong, but consider taking more time to develop hypotheses before jumping into calculations. Overall, this was a strong performance that shows you're on the right track.",
  }
}

function renderFeedbackPage(interview: any, feedback: any, trendData: any[]) {
  const performanceData = [
    { category: "Structure", score: feedback.structure_score },
    { category: "Analysis", score: feedback.analysis_score },
    { category: "Communication", score: feedback.communication_score },
    { category: "Overall", score: feedback.overall_score },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 to-indigo-50">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <h1 className="text-xl font-bold">Interview Feedback</h1>
          <Link href="/dashboard">
            <Button variant="ghost">Back to Dashboard</Button>
          </Link>
        </div>
      </header>

      <main className="container mx-auto flex-1 space-y-8 p-6">
        <Card className="border-2">
          <CardHeader>
            <div className="flex items-start justify-between">
              <div>
                <CardTitle className="text-2xl">{interview.cases.title}</CardTitle>
                <CardDescription className="mt-1">
                  {interview.cases.industry} • {interview.cases.difficulty}
                </CardDescription>
              </div>
              <div className="text-right">
                <div className="text-4xl font-bold text-primary">{feedback.overall_score}</div>
                <div className="text-sm text-muted-foreground">Overall Score</div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Duration: {Math.floor((interview.duration || 0) / 60)} minutes</span>
            </div>
          </CardContent>
        </Card>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Performance Breakdown</CardTitle>
              <CardDescription>Your scores across key dimensions</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Structure</span>
                  <span className="text-muted-foreground">{feedback.structure_score}/100</span>
                </div>
                <Progress value={feedback.structure_score} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Analysis</span>
                  <span className="text-muted-foreground">{feedback.analysis_score}/100</span>
                </div>
                <Progress value={feedback.analysis_score} className="h-2" />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">Communication</span>
                  <span className="text-muted-foreground">{feedback.communication_score}/100</span>
                </div>
                <Progress value={feedback.communication_score} className="h-2" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Performance Radar</CardTitle>
              <CardDescription>Visual representation of your skills</CardDescription>
            </CardHeader>
            <CardContent className="flex items-center justify-center">
              <PerformanceRadarChart data={performanceData} />
            </CardContent>
          </Card>
        </div>

        {trendData.length > 1 && (
          <Card>
            <CardHeader>
              <CardTitle>Progress Over Time</CardTitle>
              <CardDescription>Your performance trend across interviews</CardDescription>
            </CardHeader>
            <CardContent>
              <TrendChart data={trendData} />
            </CardContent>
          </Card>
        )}

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                Strengths
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {feedback.strengths.map((strength: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-600" />
                    <span className="text-sm">{strength}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertCircle className="h-5 w-5 text-orange-600" />
                Areas for Improvement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {feedback.areas_for_improvement.map((area: string, index: number) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="mt-1 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-orange-600" />
                    <span className="text-sm">{area}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Detailed Feedback</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="leading-relaxed text-muted-foreground">{feedback.detailed_feedback}</p>
          </CardContent>
        </Card>

        <div className="flex justify-center gap-4">
          <Link href="/dashboard">
            <Button size="lg" variant="outline">
              Back to Dashboard
            </Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg">
              <TrendingUp className="mr-2 h-5 w-5" />
              Practice Another Case
            </Button>
          </Link>
        </div>
      </main>
    </div>
  )
}

async function generateFeedback(interviewId: string, interview: any, supabase: any) {
  const structureScore = Math.floor(Math.random() * 20) + 75
  const analysisScore = Math.floor(Math.random() * 20) + 70
  const communicationScore = Math.floor(Math.random() * 20) + 80
  const overallScore = Math.floor((structureScore + analysisScore + communicationScore) / 3)

  await supabase.from("feedback").insert({
    interview_id: interviewId,
    overall_score: overallScore,
    structure_score: structureScore,
    analysis_score: analysisScore,
    communication_score: communicationScore,
    strengths: [
      "Clear and logical problem-solving approach",
      "Strong quantitative reasoning skills",
      "Effective communication of complex ideas",
    ],
    areas_for_improvement: [
      "Consider asking more clarifying questions upfront",
      "Develop deeper hypotheses before diving into analysis",
      "Practice synthesizing findings more concisely",
    ],
    detailed_feedback:
      "You demonstrated a solid understanding of case interview fundamentals. Your structure was well-organized and you communicated your thoughts clearly. To improve further, focus on asking more probing questions at the beginning to fully understand the problem scope. Your quantitative analysis was strong, but consider taking more time to develop hypotheses before jumping into calculations. Overall, this was a strong performance that shows you're on the right track.",
  })

  await supabase
    .from("user_stats")
    .update({
      total_interviews: interview.user_id,
      completed_interviews: interview.user_id,
    })
    .eq("user_id", interview.user_id)
}
