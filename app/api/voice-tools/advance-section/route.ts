/**
 * API Tool: advance_section
 *
 * Moves interview to next section in the case flow
 * Enforces progression rules (must complete current section first)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  AdvanceSectionRequestSchema,
  validateApiRequest,
} from '@/lib/validators/cases'
import type { SectionName } from '@/types/cases'

// Section order definition
const SECTION_ORDER: SectionName[] = ['introduction', 'framework', 'analysis', 'synthesis']

/**
 * Get next section in sequence
 */
function getNextSection(currentSection: SectionName): SectionName | null {
  const currentIndex = SECTION_ORDER.indexOf(currentSection)
  if (currentIndex === -1 || currentIndex >= SECTION_ORDER.length - 1) {
    return null // No next section
  }
  return SECTION_ORDER[currentIndex + 1]
}

/**
 * Check if user can advance from current section
 */
async function canAdvance(
  supabase: any,
  attemptId: string,
  currentSection: SectionName
): Promise<{ allowed: boolean; reason?: string }> {
  // Introduction can always advance (no scoring required)
  if (currentSection === 'introduction') {
    return { allowed: true }
  }

  // For other sections, check if there's a score
  const { data: events, error } = await supabase
    .from('case_events')
    .select('event_type, payload')
    .eq('attempt_id', attemptId)
    .eq('event_type', 'response_scored')

  if (error) {
    return { allowed: false, reason: 'Failed to check section completion' }
  }

  // Check if current section has been scored
  const hasScore = events?.some(
    (e: any) => e.payload?.section === currentSection
  )

  if (!hasScore) {
    return {
      allowed: false,
      reason: `Section "${currentSection}" must be scored before advancing`,
    }
  }

  return { allowed: true }
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = validateApiRequest(AdvanceSectionRequestSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { attemptId } = validation.data

    // Initialize Supabase client
    const supabase = await createClient()

    // Check if this is a demo attempt
    const isDemoAttempt = attemptId.startsWith('demo-')

    let currentSection: SectionName

    if (isDemoAttempt) {
      // Demo mode: Get current section from request body
      const demoBody = body as any
      currentSection = (demoBody.currentSection || 'introduction') as SectionName
      // Skip advancement checks for demo mode
    } else {
      // Regular authenticated flow
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      // Fetch attempt and verify ownership
      const { data: attempt, error: attemptError } = await supabase
        .from('case_attempts')
        .select('user_id, current_section, state')
        .eq('id', attemptId)
        .single()

      if (attemptError || !attempt) {
        return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
      }

      if (attempt.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      // Check if attempt is still in progress
      if (attempt.state !== 'in_progress') {
        return NextResponse.json(
          { error: 'Attempt is not in progress', state: attempt.state },
          { status: 400 }
        )
      }

      currentSection = attempt.current_section as SectionName

      // Check if can advance
      const advanceCheck = await canAdvance(supabase, attemptId, currentSection)
      if (!advanceCheck.allowed) {
        return NextResponse.json(
          { error: advanceCheck.reason || 'Cannot advance section' },
          { status: 400 }
        )
      }
    }

    // Get next section
    const nextSection = getNextSection(currentSection)

    if (!nextSection) {
      // No more sections, interview is complete
      if (!isDemoAttempt) {
        // Save transcript from request (sent by voice session on completion)
        const transcript = (body as any).transcript || []

        // Mark attempt as processing feedback
        await supabase
          .from('case_attempts')
          .update({
            state: 'generating_feedback',
            completed_at: new Date().toISOString(),
            transcript: transcript, // Save the full transcript
          })
          .eq('id', attemptId)

        // Log completion event
        await supabase.from('case_events').insert({
          attempt_id: attemptId,
          event_type: 'attempt_completed',
          payload: {
            final_section: currentSection,
            transcript_length: transcript.length,
          },
        })

        // Trigger feedback generation asynchronously (uses Echo credits)
        // Don't await - let it run in background
        fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/voice-tools/generate-feedback`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ attemptId }),
        }).catch(err => console.error('Failed to trigger feedback generation:', err))
      }

      return NextResponse.json({
        next_section: null,
        completed: true,
        message: 'Interview completed successfully. Generating your personalized feedback...',
      })
    }

    // Update database only for non-demo attempts
    if (!isDemoAttempt) {
      // Update attempt to next section
      await supabase
        .from('case_attempts')
        .update({ current_section: nextSection })
        .eq('id', attemptId)

      // Log section advance event
      await supabase.from('case_events').insert({
        attempt_id: attemptId,
        event_type: 'section_advanced',
        payload: {
          from_section: currentSection,
          to_section: nextSection,
        },
      })
    }

    return NextResponse.json({
      next_section: nextSection,
      previous_section: currentSection,
      completed: false,
    })
  } catch (error) {
    console.error('[advance-section] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
