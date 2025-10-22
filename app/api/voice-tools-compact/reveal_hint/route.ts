/**
 * API Tool: reveal_hint (Compact Structure)
 * Reveal the next tier hint for current line
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Demo state tracker
const demoHintsUsed = new Map<string, number>()

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { attemptId } = body

    if (!attemptId) {
      return NextResponse.json({ error: 'attemptId is required' }, { status: 400 })
    }

    const supabase = await createClient()

    // Check if demo attempt
    const isDemoAttempt = attemptId.startsWith('demo-')

    if (isDemoAttempt) {
      // Demo mode: Track hints in memory
      const currentTier = demoHintsUsed.get(attemptId) || 0

      // Get first case (demo)
      const { data: cases } = await supabase
        .from('cases')
        .select('*')
        .eq('published', true)
        .limit(1)
        .single()

      if (!cases) {
        return NextResponse.json({ error: 'No cases available' }, { status: 404 })
      }

      // Get current line (assume first line for demo)
      const firstSection = cases.sections[0]
      const firstLineId = firstSection.lines[0]
      const lineCard = cases.lines[firstLineId]
      const hints = lineCard.hints || []

      if (currentTier >= hints.length) {
        return NextResponse.json({ error: 'No more hints available' }, { status: 400 })
      }

      const hint = hints[currentTier]
      demoHintsUsed.set(attemptId, currentTier + 1)

      return NextResponse.json({
        hint: hint.text,
        tier: hint.tier,
      })
    }

    // Regular authenticated flow
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch attempt
    const { data: attempt } = await supabase
      .from('case_attempts')
      .select('user_id, case_id, current_line_id, hints_used')
      .eq('id', attemptId)
      .single()

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch case
    const { data: caseData } = await supabase
      .from('cases')
      .select('*')
      .eq('id', attempt.case_id)
      .single()

    if (!caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Get current line hints
    const lineCard = caseData.lines[attempt.current_line_id]
    const hints = lineCard?.hints || []

    // Count hints used for this line
    const hintsUsed = (attempt.hints_used || []).filter(
      (h: any) => h.line_id === attempt.current_line_id
    ).length

    if (hintsUsed >= hints.length) {
      return NextResponse.json({ error: 'No more hints available for this line' }, { status: 400 })
    }

    const hint = hints[hintsUsed]

    // Record hint usage
    const updatedHints = [
      ...(attempt.hints_used || []),
      {
        line_id: attempt.current_line_id,
        tier: hint.tier,
        timestamp: new Date().toISOString(),
      },
    ]

    await supabase
      .from('case_attempts')
      .update({ hints_used: updatedHints })
      .eq('id', attemptId)

    return NextResponse.json({
      hint: hint.text,
      tier: hint.tier,
    })
  } catch (error) {
    console.error('[reveal_hint] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
