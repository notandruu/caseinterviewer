import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { VoiceInterviewClient } from "@/components/voice-interview-client"
import { getMockSession, getMockUser } from "@/lib/auth/mock-auth"

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const isAuthenticated = await getMockSession()
  if (!isAuthenticated) {
    redirect("/auth/login")
  }

  const mockUser = getMockUser()
  const supabase = await createClient()

  const { data: caseData } = await supabase.from("cases").select("*").eq("id", id).single()

  if (!caseData) {
    redirect("/dashboard")
  }

  let interviewId: string

  // Check if this is the mock/demo user
  if (mockUser.id === "00000000-0000-0000-0000-000000000001") {
    // Generate a temporary interview ID for demo mode (no database insert)
    interviewId = `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`
  } else {
    // For real users, insert into database
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
      console.error("[v0] Error creating interview:", error)
      redirect("/dashboard")
    }

    interviewId = interview.id
  }

  return <VoiceInterviewClient caseData={caseData} interviewId={interviewId} userId={mockUser.id} />
}
