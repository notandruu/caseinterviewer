'use client'

/**
 * Voice V2 Interview Route
 * Entry point for voice-first case interviews with server-mediated tools
 */

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEcho } from '@merit-systems/echo-react-sdk'
import { createClient } from '@/lib/supabase/client'
import { isVoiceV2Enabled } from '@/lib/tools'
import { VoiceSessionV3 } from '@/components/VoiceSession/V3/VoiceSessionV3'
import { PreInterviewSettings, type InterviewSettings } from '@/components/VoiceSession/V3/PreInterviewSettings'
import type { ClientCase } from '@/types/cases'

export default function VoiceInterviewPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const router = useRouter()
  const { isLoggedIn, user } = useEcho()
  const [caseData, setCaseData] = useState<ClientCase | null>(null)
  const [attemptId, setAttemptId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [interviewSettings, setInterviewSettings] = useState<InterviewSettings | null>(null)
  const [showSettings, setShowSettings] = useState(true)
  const supabase = createClient()

  // Unwrap params
  const { id } = use(params)

  useEffect(() => {
    // Check feature flag
    if (!isVoiceV2Enabled()) {
      setError('Voice V2 is not enabled')
      return
    }

    async function setupInterview() {
      try {
        // Fetch case data
        const { data: fetchedCase, error: caseError } = await supabase
          .from('cases')
          .select('*')
          .eq('id', id)
          .eq('published', true)
          .single()

        if (caseError || !fetchedCase) {
          setError('Case not found or not published')
          router.push('/dashboard')
          return
        }

        setCaseData(fetchedCase as ClientCase)

        // Create attempt
        // For demo users (not logged in), generate a temporary ID
        // For logged in users, create a database record
        if (isLoggedIn && user?.id) {
          const { data: attempt, error: attemptError } = await supabase
            .from('case_attempts')
            .insert({
              user_id: user.id,
              case_id: id,
              state: 'in_progress',
              current_section: 'introduction',
            })
            .select()
            .single()

          if (attemptError || !attempt) {
            console.error('[Voice] Error creating attempt:', attemptError)
            setError(`Failed to create interview session: ${attemptError?.message || 'Unknown error'}`)
            return
          }

          setAttemptId(attempt.id)
        } else {
          // Demo mode: Generate temporary attempt ID
          const tempId = `demo-${Date.now()}-${Math.random().toString(36).substring(7)}`
          setAttemptId(tempId)
        }
      } catch (err) {
        console.error('[Voice] Setup error:', err)
        setError('An error occurred')
      }
    }

    setupInterview()
  }, [id, isLoggedIn, user?.id])

  // Loading state
  if (!caseData || !attemptId) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <div className="h-3 w-3 rounded-full bg-[#2196F3] animate-pulse mx-auto mb-4" />
          <p className="text-sm text-gray-500">Preparing interview session...</p>
        </div>
      </div>
    )
  }

  // Error state
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

  // Feature flag check
  if (!isVoiceV2Enabled()) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center max-w-md">
          <h1 className="text-2xl font-semibold mb-4">Voice V2 Not Available</h1>
          <p className="text-gray-600 mb-6">
            This feature is currently disabled. Please check back later or contact support.
          </p>
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

  // Main voice interface
  const effectiveUserId = user?.id || 'demo-user'

  // Show settings screen first
  if (showSettings) {
    return (
      <PreInterviewSettings
        caseData={caseData}
        onStart={(settings) => {
          setInterviewSettings(settings)
          setShowSettings(false)
        }}
      />
    )
  }

  // Then show voice session with selected settings
  return (
    <VoiceSessionV3
      caseData={caseData}
      attemptId={attemptId}
      userId={effectiveUserId}
      language={interviewSettings?.language || 'en'}
    />
  )
}
