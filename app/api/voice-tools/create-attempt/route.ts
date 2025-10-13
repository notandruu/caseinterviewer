/**
 * API: create-attempt
 *
 * Creates a new case attempt for a user
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'

const CreateAttemptSchema = z.object({
  caseId: z.string().uuid(),
  userId: z.string().uuid(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const validation = CreateAttemptSchema.safeParse(body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { caseId, userId } = validation.data

    const supabase = await createClient()

    // Verify user is authenticated
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user || user.id !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify case exists and is published
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('id, published')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData || !caseData.published) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Create attempt
    const { data: attempt, error: attemptError } = await supabase
      .from('case_attempts')
      .insert({
        user_id: userId,
        case_id: caseId,
        current_section: 'introduction',
        state: 'in_progress',
      })
      .select('id')
      .single()

    if (attemptError || !attempt) {
      console.error('[create-attempt] Error:', attemptError)
      return NextResponse.json(
        { error: 'Failed to create attempt' },
        { status: 500 }
      )
    }

    return NextResponse.json({ attemptId: attempt.id })
  } catch (error) {
    console.error('[create-attempt] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
