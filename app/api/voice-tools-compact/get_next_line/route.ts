/**
 * API Tool: get_next_line (Compact Structure)
 * Fetches the next LineCard and updated CaseCard after candidate responds
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
      // Demo mode: Return first line without auth
      const { data: cases } = await supabase
        .from('cases')
        .select('*')
        .eq('published', true)
        .limit(1)
        .single()

      if (!cases) {
        return NextResponse.json({ error: 'No cases available' }, { status: 404 })
      }

      // Return first line from first section
      const firstSection = cases.sections[0]
      const firstLineId = firstSection.lines[0]
      const lineCard = cases.lines[firstLineId]

      const caseCard = {
        case_id: cases.id,
        case_type: cases.case_type,
        title: cases.title,
        objective: cases.objective,
        vars: cases.vars,
        section: firstSection.key,
        line_id: firstLineId,
        evaluation_focus: lineCard.evaluation_focus || [],
      }

      return NextResponse.json({
        caseCard,
        lineCard,
        completed: false,
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
    const { data: attempt, error: attemptError } = await supabase
      .from('case_attempts')
      .select('user_id, case_id, current_section, current_line_id, state')
      .eq('id', attemptId)
      .single()

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    // Verify ownership
    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if completed
    if (attempt.state === 'completed') {
      return NextResponse.json({
        caseCard: null,
        lineCard: null,
        completed: true,
      })
    }

    // Fetch case
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('*')
      .eq('id', attempt.case_id)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Get current line
    const currentLineId = attempt.current_line_id || caseData.sections[0].lines[0]
    const lineCard = caseData.lines[currentLineId]

    if (!lineCard) {
      return NextResponse.json({ error: 'Line not found' }, { status: 404 })
    }

    // Build CaseCard
    const caseCard = {
      case_id: caseData.id,
      case_type: caseData.case_type,
      title: caseData.title,
      objective: caseData.objective,
      vars: caseData.vars,
      section: attempt.current_section,
      line_id: currentLineId,
      evaluation_focus: lineCard.evaluation_focus || [],
    }

    return NextResponse.json({
      caseCard,
      lineCard,
      completed: false,
    })
  } catch (error) {
    console.error('[get_next_line] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
