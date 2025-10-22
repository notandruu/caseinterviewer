/**
 * API Tool: record_turn (Compact Structure)
 * Record candidate's response with summary and evaluation tags
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { attemptId, summary, tags } = body

    if (!attemptId || !summary || !tags) {
      return NextResponse.json(
        { error: 'attemptId, summary, and tags are required' },
        { status: 400 }
      )
    }

    // Demo mode: Just return success
    if (attemptId.startsWith('demo-')) {
      return NextResponse.json({
        success: true,
        turn_recorded: true,
      })
    }

    const supabase = await createClient()

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch attempt
    const { data: attempt } = await supabase
      .from('case_attempts')
      .select('user_id, current_line_id, turns')
      .eq('id', attemptId)
      .single()

    if (!attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Append turn to history
    const newTurn = {
      speaker: 'candidate',
      line_id: attempt.current_line_id,
      summary,
      tags,
      timestamp: new Date().toISOString(),
    }

    const updatedTurns = [...(attempt.turns || []), newTurn]

    await supabase
      .from('case_attempts')
      .update({ turns: updatedTurns })
      .eq('id', attemptId)

    return NextResponse.json({
      success: true,
      turn_recorded: true,
    })
  } catch (error) {
    console.error('[record_turn] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
