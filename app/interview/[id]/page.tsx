import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { VoiceInterviewClient } from "@/components/voice-interview-client"
import { VoiceSessionV2 } from "@/components/VoiceSession/VoiceSessionV2"
import { isEchoAuthenticated, getEchoUserId } from "@/lib/auth/echo-auth"
import { isV2Enabled } from "@/lib/config/features"

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const isAuthenticated = await isEchoAuthenticated()
  if (!isAuthenticated) {
    redirect("/auth/login")
  }

  const userId = await getEchoUserId()
  if (!userId) {
    redirect("/auth/login")
  }

  const supabase = await createClient()

  const { data: caseData } = await supabase.from("cases").select("*").eq("id", id).single()

  if (!caseData) {
    redirect("/dashboard")
  }

  // Create interview session in database
  const { data: interview, error } = await supabase
    .from("interviews")
    .insert({
      user_id: userId,
      case_id: id,
      status: "in-progress",
    })
    .select()
    .single()

  if (error || !interview) {
    console.error("[v0] Error creating interview:", error)
    redirect("/dashboard")
  }

  const interviewId = interview.id

  // Feature flag: use V2 if enabled, otherwise V1 (default)
  const InterviewComponent = isV2Enabled() ? VoiceSessionV2 : VoiceInterviewClient

  return <InterviewComponent caseData={caseData} interviewId={interviewId} userId={userId} />
}
