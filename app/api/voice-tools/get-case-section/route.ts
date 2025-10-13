/**
 * API Tool: get_case_section
 *
 * Fetches current section details without revealing future sections or answers
 * This enforces section gating and prevents answer leakage
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  GetCaseSectionRequestSchema,
  validateApiRequest,
} from '@/lib/validators/cases'
import type { CaseSection, CaseData } from '@/types/cases'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = validateApiRequest(GetCaseSectionRequestSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { caseId, attemptId } = validation.data

    // Initialize Supabase client
    const supabase = await createClient()

    // Check if this is a demo attempt (starts with "demo-")
    const isDemoAttempt = attemptId.startsWith('demo-')

    let currentSection = 'introduction'

    if (isDemoAttempt) {
      // Demo mode: Allow access without authentication
      // Demo attempts are not stored in database, so we default to introduction section
      console.log('[get-case-section] Demo mode - no auth required')
    } else {
      // Regular authenticated flow
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json(
          { error: 'Unauthorized' },
          { status: 401 }
        )
      }

      // Fetch attempt and verify ownership
      const { data: attempt, error: attemptError } = await supabase
        .from('case_attempts')
        .select('user_id, case_id, current_section')
        .eq('id', attemptId)
        .single()

      if (attemptError || !attempt) {
        return NextResponse.json(
          { error: 'Attempt not found' },
          { status: 404 }
        )
      }

      // Verify user owns this attempt
      if (attempt.user_id !== user.id) {
        return NextResponse.json(
          { error: 'Forbidden: You do not own this attempt' },
          { status: 403 }
        )
      }

      // Verify case ID matches
      if (attempt.case_id !== caseId) {
        return NextResponse.json(
          { error: 'Case ID mismatch' },
          { status: 400 }
        )
      }

      currentSection = attempt.current_section
    }

    // Fetch case (RLS will filter out sensitive fields for non-staff)
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('sections, data_json, title, firm, industry')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json(
        { error: 'Case not found' },
        { status: 404 }
      )
    }

    // Find the current section
    const sections = caseData.sections as CaseSection[]
    const sectionData = sections.find((s) => s.name === currentSection)

    if (!sectionData) {
      return NextResponse.json(
        { error: 'Current section not found in case' },
        { status: 500 }
      )
    }

    // Provide full case data for all sections
    // Note: RLS policies already filter out expected_answer_summary and ground_truth
    // The AI needs all case data (aircraft, routes, prices, etc.) from the start
    const filteredData: CaseData = caseData.data_json

    // Log event (skip for demo attempts since they're not in database)
    if (!isDemoAttempt) {
      await supabase.from('case_events').insert({
        attempt_id: attemptId,
        event_type: 'section_started',
        payload: {
          section: currentSection,
        },
      })
    }

    // Return section details without sensitive information
    return NextResponse.json({
      section: sectionData,
      data: filteredData,
      case_context: {
        title: caseData.title,
        firm: caseData.firm,
        industry: caseData.industry,
      },
    })
  } catch (error) {
    console.error('[get-case-section] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// OPTIONS handler for CORS (if needed)
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
