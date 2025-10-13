'use client'

import { use, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useEcho } from "@merit-systems/echo-react-sdk"
import { createClient } from "@/lib/supabase/client"
import { VoiceSessionV2 } from "@/components/VoiceSession/VoiceSessionV2"

export default function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { isLoggedIn, user } = useEcho()
  const [caseData, setCaseData] = useState<any>(null)
  const [interviewId, setInterviewId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const supabase = createClient()

  // Unwrap params using React.use()
  const { id } = use(params)

  useEffect(() => {
    if (!id) return

    async function setupInterview() {
      try {
        // Fetch case data
        const { data: fetchedCase, error: caseError } = await supabase
          .from("cases")
          .select("*")
          .eq("id", id)
          .single()

        if (caseError || !fetchedCase) {
          setError("Case not found")
          router.push("/dashboard")
          return
        }

        setCaseData(fetchedCase)

        // Create interview session
        // For demo users (not logged in), generate a temporary ID
        // For logged in users, create a database record
        if (isLoggedIn && user?.id) {
          const { data: interview, error: interviewError } = await supabase
            .from("interviews")
            .insert({
              user_id: user.id,
              case_id: id,
              status: "in-progress",
            })
            .select()
            .single()

          if (interviewError || !interview) {
            console.error("[Interview] Error creating interview:", interviewError)
            console.error("[Interview] User ID:", user.id)
            console.error("[Interview] Case ID:", id)
            setError(`Failed to create interview session: ${interviewError?.message || 'Unknown error'}`)
            return
          }

          setInterviewId(interview.id)
        } else {
          // Demo mode: Generate temporary interview ID
          const tempId = `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`
          setInterviewId(tempId)
        }
      } catch (err) {
        console.error("[Interview] Setup error:", err)
        setError("An error occurred")
      }
    }

    setupInterview()
  }, [id, isLoggedIn, user?.id])

  if (!caseData || !interviewId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-3 w-3 rounded-full bg-[#2196F3] animate-pulse" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-[#2196F3] text-white rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  // Use VoiceSessionV2 with Realtime API (always)
  const effectiveUserId = user?.id || 'demo-user'

  return <VoiceSessionV2 caseData={caseData} interviewId={interviewId} userId={effectiveUserId} />
}
