/**
 * API Tool: reveal_hint
 *
 * Progressively discloses hints within a section
 * Enforces tiered hint system and logs usage
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  RevealHintRequestSchema,
  validateApiRequest,
} from '@/lib/validators/cases'
import type { CaseSection, HintUsage } from '@/types/cases'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = validateApiRequest(RevealHintRequestSchema, body)

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

    let caseId: string
    let currentSectionName = 'introduction'
    let hintsUsed: HintUsage[] = []

    if (isDemoAttempt) {
      // Demo mode: Extract case ID from body (client must pass it)
      // For demo, we can't track hints in DB, so return first available hint
      const demoBody = body as any
      if (!demoBody.caseId) {
        return NextResponse.json(
          { error: 'caseId required for demo mode' },
          { status: 400 }
        )
      }
      caseId = demoBody.caseId
      currentSectionName = demoBody.currentSection || 'introduction'
      // Demo hint tier passed by client
      const demoHintTier = demoBody.hintTier || 0
      hintsUsed = Array(demoHintTier).fill(null).map((_, i) => ({
        section: currentSectionName,
        tier: i + 1,
        timestamp: new Date().toISOString(),
      }))
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
        .select('user_id, case_id, current_section, hints_used')
        .eq('id', attemptId)
        .single()

      if (attemptError || !attempt) {
        return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
      }

      // Verify user owns this attempt
      if (attempt.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: You do not own this attempt' },
          { status: 403 }
        )
      }

      caseId = attempt.case_id
      currentSectionName = attempt.current_section
      hintsUsed = (attempt.hints_used as HintUsage[]) || []
    }

    // Fetch case to get section hints
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('sections')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Find current section
    const sections = caseData.sections as CaseSection[]
    const currentSection = sections.find((s) => s.name === currentSectionName)

    if (!currentSection) {
      return NextResponse.json(
        { error: 'Current section not found' },
        { status: 500 }
      )
    }

    // Count hints already used in this section
    const hintsUsedInCurrentSection = hintsUsed.filter(
      (h) => h.section === currentSectionName
    )
    const nextTier = hintsUsedInCurrentSection.length + 1

    // Check if more hints are available
    if (nextTier > currentSection.hints.length) {
      return NextResponse.json(
        {
          error: 'No more hints available for this section',
          hints_used: hintsUsedInCurrentSection.length,
          total_hints: currentSection.hints.length,
        },
        { status: 400 }
      )
    }

    // Get next hint (hints are 0-indexed, tiers are 1-indexed)
    const nextHint = currentSection.hints[nextTier - 1]

    if (!nextHint) {
      return NextResponse.json(
        { error: 'Hint not found' },
        { status: 500 }
      )
    }

    // Update database only for non-demo attempts
    if (!isDemoAttempt) {
      // Record hint usage
      const newHintUsage: HintUsage = {
        section: currentSectionName,
        tier: nextTier,
        timestamp: new Date().toISOString(),
      }

      const updatedHintsUsed = [...hintsUsed, newHintUsage]

      // Update attempt with new hint usage
      await supabase
        .from('case_attempts')
        .update({ hints_used: updatedHintsUsed })
        .eq('id', attemptId)

      // Log event
      await supabase.from('case_events').insert({
        attempt_id: attemptId,
        event_type: 'hint_revealed',
        payload: {
          section: currentSectionName,
          tier: nextTier,
          hint_text: nextHint.text,
        },
      })
    }

    // Return hint
    return NextResponse.json({
      hint: nextHint.text,
      tier: nextTier,
      remaining_hints: currentSection.hints.length - nextTier,
    })
  } catch (error) {
    console.error('[reveal-hint] Error:', error)
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
