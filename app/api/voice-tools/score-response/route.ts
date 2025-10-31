/**
 * API Tool: score_response
 *
 * Evaluates user's response against section rubric
 * Compares extracted numbers against ground truth
 * Updates attempt's rubric scores and logs event
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import {
  ScoreResponseRequestSchema,
  validateApiRequest,
} from '@/lib/validators/cases'
import type {
  CaseSection,
  GroundTruth,
  RubricScores,
  SectionScore,
} from '@/types/cases'

/**
 * Score quantitative accuracy
 * Compares extracted numbers against ground truth
 */
function scoreQuantitative(
  extractedNumbers: Record<string, number>,
  groundTruth: GroundTruth | null
): { score: number; comments: string[] } {
  const comments: string[] = []

  if (!groundTruth || !groundTruth.calculations) {
    // No ground truth available, skip quantitative scoring
    return { score: 100, comments: ['No quantitative benchmark available'] }
  }

  const expectedCalcs = groundTruth.calculations
  const expectedKeys = Object.keys(expectedCalcs)

  if (expectedKeys.length === 0) {
    return { score: 100, comments: ['No calculations expected'] }
  }

  let correctCount = 0
  let totalCount = expectedKeys.length

  for (const key of expectedKeys) {
    const expected = expectedCalcs[key]
    const actual = extractedNumbers[key]

    if (actual === undefined) {
      comments.push(`Missing calculation: ${key}`)
      continue
    }

    // Allow 5% tolerance for rounding
    const tolerance = Math.abs(expected * 0.05)
    const diff = Math.abs(actual - expected)

    if (diff <= tolerance) {
      correctCount++
    } else {
      comments.push(
        `${key}: Expected ${expected}, got ${actual} (${Math.round(diff / expected * 100)}% off)`
      )
    }
  }

  const score = (correctCount / totalCount) * 100
  return { score, comments }
}

/**
 * Score framework quality
 * Checks if key framework components are present
 */
function scoreFramework(
  bullets: string[],
  groundTruth: GroundTruth | null
): { score: number; comments: string[] } {
  const comments: string[] = []

  if (!groundTruth || !groundTruth.framework_components) {
    // Basic quality check
    if (bullets.length < 2) {
      comments.push('Framework lacks depth (fewer than 2 components)')
      return { score: 60, comments }
    }
    return { score: 80, comments: ['Framework appears structured'] }
  }

  const expectedComponents = groundTruth.framework_components
  const bulletsText = bullets.join(' ').toLowerCase()
  let foundCount = 0

  for (const component of expectedComponents) {
    if (bulletsText.includes(component.toLowerCase())) {
      foundCount++
    } else {
      comments.push(`Missing key component: ${component}`)
    }
  }

  const score = (foundCount / expectedComponents.length) * 100
  return { score, comments }
}

/**
 * Score insights quality
 * Basic heuristics for insight depth
 */
function scoreInsights(bullets: string[]): { score: number; comments: string[] } {
  const comments: string[] = []

  // Heuristics:
  // - At least 2 bullets
  // - Each bullet should be substantive (> 20 chars)
  // - Look for causal language (because, therefore, due to, etc.)

  if (bullets.length < 2) {
    comments.push('Insufficient insights provided (need at least 2)')
    return { score: 50, comments }
  }

  let substantiveCount = 0
  let causalCount = 0
  const causalWords = ['because', 'therefore', 'due to', 'since', 'as a result', 'leads to', 'drives']

  for (const bullet of bullets) {
    if (bullet.length > 20) substantiveCount++

    for (const word of causalWords) {
      if (bullet.toLowerCase().includes(word)) {
        causalCount++
        break
      }
    }
  }

  const substantiveScore = (substantiveCount / bullets.length) * 60
  const causalScore = Math.min((causalCount / bullets.length) * 40, 40)
  const score = substantiveScore + causalScore

  if (substantiveCount < bullets.length) {
    comments.push('Some insights lack depth')
  }
  if (causalCount === 0) {
    comments.push('Consider explaining causality more explicitly')
  }

  return { score, comments }
}

/**
 * Score communication quality
 * Basic heuristics for clarity
 */
function scoreCommunication(bullets: string[]): { score: number; comments: string[] } {
  const comments: string[] = []

  // Heuristics:
  // - Clear structure (bullet points provided)
  // - Reasonable length (not too short, not too verbose)
  // - Avoids jargon overload

  let score = 70 // Base score for providing structured bullets

  if (bullets.length === 0) {
    return { score: 0, comments: ['No structured response provided'] }
  }

  // Check average bullet length
  const avgLength = bullets.reduce((sum, b) => sum + b.length, 0) / bullets.length

  if (avgLength < 15) {
    comments.push('Bullets are too brief, add more detail')
    score -= 20
  } else if (avgLength > 150) {
    comments.push('Bullets are verbose, be more concise')
    score -= 10
  } else {
    score += 20 // Good length
  }

  // Check for structure words
  const structureWords = ['first', 'second', 'third', 'finally', 'additionally', 'moreover']
  const hasStructure = bullets.some((b) =>
    structureWords.some((w) => b.toLowerCase().includes(w))
  )

  if (hasStructure) {
    score += 10
  }

  return { score: Math.max(0, Math.min(100, score)), comments }
}

/**
 * Perform basic sanity checks
 */
function scoreSanityChecks(
  extractedNumbers: Record<string, number>
): { score: number; comments: string[] } {
  const comments: string[] = []
  let issues = 0

  // Check for obviously wrong values
  for (const [key, value] of Object.entries(extractedNumbers)) {
    if (!isFinite(value)) {
      issues++
      comments.push(`${key}: Non-finite value`)
    }
    if (value < 0 && !key.toLowerCase().includes('loss') && !key.toLowerCase().includes('cost')) {
      issues++
      comments.push(`${key}: Unexpected negative value`)
    }
  }

  // Check for profit = revenue - cost if all present
  const revenue = extractedNumbers.revenue || extractedNumbers.revenue_per_flight
  const cost = extractedNumbers.cost || extractedNumbers.cost_per_flight || extractedNumbers.operating_cost
  const profit = extractedNumbers.profit || extractedNumbers.profit_per_flight

  if (revenue && cost && profit) {
    const expectedProfit = revenue - cost
    const diff = Math.abs(profit - expectedProfit)
    if (diff > Math.abs(expectedProfit * 0.1)) {
      issues++
      comments.push('Profit calculation appears inconsistent with revenue - cost')
    }
  }

  const score = issues === 0 ? 100 : Math.max(0, 100 - issues * 30)
  if (issues === 0) {
    comments.push('All sanity checks passed')
  }

  return { score, comments }
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = validateApiRequest(ScoreResponseRequestSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { attemptId, section, extracted_numbers, bullets } = validation.data

    // Initialize Supabase client
    const supabase = await createClient()

    // Check if this is a demo attempt
    const isDemoAttempt = attemptId.startsWith('demo-')

    let caseId: string

    if (isDemoAttempt) {
      // Demo mode: Get case ID from request body
      const demoBody = body as any
      if (!demoBody.caseId) {
        return NextResponse.json(
          { error: 'caseId required for demo mode' },
          { status: 400 }
        )
      }
      caseId = demoBody.caseId
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
        .select('user_id, case_id, rubric_scores')
        .eq('id', attemptId)
        .single()

      if (attemptError || !attempt) {
        return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
      }

      if (attempt.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      caseId = attempt.case_id

      // Update attempt's rubric_scores (only for authenticated users)
      const existingScores = (attempt.rubric_scores as RubricScores) || {}
      // Store for later use
      ;(body as any)._existingScores = existingScores
    }

    // Fetch case to get ground truth and rubric
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('sections, ground_truth')
      .eq('id', caseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    // Find section rubric
    const sections = caseData.sections as CaseSection[]
    const targetSection = sections.find((s) => s.name === section)

    if (!targetSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    const rubric = targetSection.rubric
    const groundTruth = caseData.ground_truth as GroundTruth | null

    // Score each dimension
    const quantResult = scoreQuantitative(extracted_numbers, groundTruth)
    const frameworkResult = scoreFramework(bullets, groundTruth)
    const insightResult = scoreInsights(bullets)
    const commResult = scoreCommunication(bullets)
    const sanityResult = scoreSanityChecks(extracted_numbers)

    // Compute weighted score based on rubric criteria
    const scores: Record<string, number> = {
      quantitative: quantResult.score,
      framework: frameworkResult.score,
      insight: insightResult.score,
      communication: commResult.score,
      sanity_checks: sanityResult.score,
    }

    // Combine all comments
    const allComments = [
      ...quantResult.comments,
      ...frameworkResult.comments,
      ...insightResult.comments,
      ...commResult.comments,
      ...sanityResult.comments,
    ]

    // Calculate section score based on rubric weights
    let weightedScore = 0
    let totalWeight = 0

    for (const criterion of rubric.criteria) {
      const dimScore = scores[criterion.dimension] || scores.quantitative || 70
      weightedScore += dimScore * criterion.weight
      totalWeight += criterion.weight
    }

    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 70
    const sectionPassed = finalScore >= rubric.passing_score

    // Create section score object
    const sectionScore: SectionScore = {
      scores,
      comments: allComments,
      section_passed: sectionPassed,
      scored_at: new Date().toISOString(),
    }

    // Update database only for non-demo attempts
    if (!isDemoAttempt) {
      // Update attempt's rubric_scores
      const existingScores = (body as any)._existingScores || {}
      const updatedScores: RubricScores = {
        ...existingScores,
        [section]: sectionScore,
      }

      await supabase
        .from('case_attempts')
        .update({ rubric_scores: updatedScores })
        .eq('id', attemptId)

      // Log event
      await supabase.from('case_events').insert({
        attempt_id: attemptId,
        event_type: 'response_scored',
        payload: {
          section,
          scores,
          comments: allComments,
          section_passed: sectionPassed,
          extracted_numbers,
          bullets,
        },
      })
    }

    return NextResponse.json({
      scores,
      comments: allComments,
      section_passed: sectionPassed,
      final_score: Math.round(finalScore),
    })
  } catch (error) {
    console.error('[score-response] Error:', error)
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
