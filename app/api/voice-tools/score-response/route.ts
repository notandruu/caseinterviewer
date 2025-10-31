/**
 * API Tool: score_response
 *
 * Evaluates user's response against section rubric
 * Compares extracted numbers against ground truth
 * Updates attempt's rubric scores and logs event
 *
 * v2 addition:
 * - Optional LLM scoring path using Scorer agent when body.use_llm === true
 *   and body.analyzer_json is provided. Falls back to original heuristics
 *   otherwise. Response shape stays the same.
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

// v2 imports
import { runScorer } from '@/lib/agents/scorer'
import { getCaseStateFromDB, persistScorerTurn } from '@/lib/supabase/queries'

/**
 * Score quantitative accuracy
 * Compares extracted numbers against ground truth
 */
function scoreQuantitative(
  extractedNumbers: Record<string, number>,
  groundTruth: GroundTruth | null
): { score: number; comments: string[] } {
  const comments: string[] = []

  if (!groundTruth || !ground_truth_has_calcs(groundTruth)) {
    return { score: 100, comments: ['No quantitative benchmark available'] }
  }

  const expectedCalcs = groundTruth.calculations!
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

    const tolerance = Math.abs(expected * 0.05)
    const diff = Math.abs(actual - expected)

    if (diff <= tolerance) {
      correctCount++
    } else {
      const pct = expected !== 0 ? Math.round((diff / expected) * 100) : 0
      comments.push(`${key}: Expected ${expected}, got ${actual} (${pct}% off)`)
    }
  }

  const score = (correctCount / totalCount) * 100
  return { score, comments }
}
function ground_truth_has_calcs(gt: GroundTruth | null): gt is GroundTruth & { calculations: Record<string, number> } {
  return !!gt && !!(gt as any).calculations && typeof (gt as any).calculations === 'object'
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

  if (!groundTruth || !Array.isArray((groundTruth as any).framework_components)) {
    if (bullets.length < 2) {
      comments.push('Framework lacks depth (fewer than 2 components)')
      return { score: 60, comments }
    }
    return { score: 80, comments: ['Framework appears structured'] }
  }

  const expectedComponents = (groundTruth as any).framework_components as string[]
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

  let score = 70

  if (bullets.length === 0) {
    return { score: 0, comments: ['No structured response provided'] }
  }

  const avgLength = bullets.reduce((sum, b) => sum + b.length, 0) / bullets.length

  if (avgLength < 15) {
    comments.push('Bullets are too brief, add more detail')
    score -= 20
  } else if (avgLength > 150) {
    comments.push('Bullets are verbose, be more concise')
    score -= 10
  } else {
    score += 20
  }

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
  if (issues === 0) comments.push('All sanity checks passed')

  return { score, comments }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Optional LLM path
    const use_llm = !!body?.use_llm
    const analyzer_json = body?.analyzer_json
    const attemptId = body?.attemptId as string | undefined
    const section = body?.section as string | undefined

    // Initialize Supabase
    const supabase = await createClient()

    // Demo detection
    const isDemoAttempt = !!attemptId && attemptId.startsWith('demo-')
    let caseId: string

    if (use_llm) {
      // LLM path requires attemptId, section, analyzer_json
      if (!attemptId || !section || !analyzer_json) {
        return NextResponse.json(
          { error: 'attemptId, section, and analyzer_json required when use_llm is true' },
          { status: 400 }
        )
      }

      if (isDemoAttempt) {
        const demoCaseId = body?.caseId as string | undefined
        if (!demoCaseId) {
          return NextResponse.json({ error: 'caseId required for demo mode' }, { status: 400 })
        }
        caseId = demoCaseId
      } else {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser()
        if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

        const { data: attempt, error: attemptError } = await supabase
          .from('case_attempts')
          .select('user_id, case_id, rubric_scores')
          .eq('id', attemptId)
          .single()

        if (attemptError || !attempt) return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
        if (attempt.user_id !== user.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

        caseId = attempt.case_id
        ;(body as any)._existingScores = (attempt as any).rubric_scores || {}
      }

      // Fetch case rubric and section
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select('sections')
        .eq('id', caseId)
        .single()

      if (caseError || !caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

      const sections = caseData.sections as CaseSection[]
      const targetSection = sections.find((s) => s.name === section)
      if (!targetSection) return NextResponse.json({ error: 'Section not found' }, { status: 404 })

      // Build minimal CaseState and call Scorer
      const baseState = await getCaseStateFromDB(attemptId)
      const state = { ...baseState, currentSection: section, rubric: normalizeRubricForScorer(targetSection) }

      const { json: scorerJson, usage, rawText } = await runScorer(state as any, analyzer_json)

      if (!scorerJson) {
        await persistScorerTurn({
          attemptId,
          scorer_json: rawText || 'invalid-json',
          usage,
        })
        return NextResponse.json({ error: 'Invalid scorer JSON' }, { status: 502 })
      }

      // Map Scorer buckets (0..5) to 0..100 per dimension for compatibility
      const mappedScores: Record<string, number> = {}
      const comments: string[] = []
      for (const b of scorerJson.buckets) {
        mappedScores[b.name] = Math.max(0, Math.min(100, b.score * 20))
        if (b.rationale && b.rationale.trim().length > 0) comments.push(`${b.name}: ${b.rationale}`)
      }

      const finalScore = Math.max(0, Math.min(100, scorerJson.total))
      const passing = typeof (targetSection as any).rubric?.passing_score === 'number'
        ? finalScore >= (targetSection as any).rubric.passing_score
        : finalScore >= 70

      const sectionScore: SectionScore = {
        scores: mappedScores,
        comments,
        section_passed: passing,
        scored_at: new Date().toISOString(),
      }

      if (!isDemoAttempt) {
        const existingScores = (body as any)._existingScores || {}
        const updatedScores: RubricScores = { ...existingScores, [section]: sectionScore }

        await supabase
          .from('case_attempts')
          .update({ rubric_scores: updatedScores })
          .eq('id', attemptId)

        await supabase.from('case_events').insert({
          attempt_id: attemptId,
          event_type: 'response_scored_llm',
          payload: { section, scorer_json: scorerJson },
        })
      }

      await persistScorerTurn({
        attemptId,
        scorer_json: scorerJson,
        usage,
      })

      return NextResponse.json({
        scores: mappedScores,
        comments,
        section_passed: passing,
        final_score: Math.round(finalScore),
        via: 'llm',
      })
    }

    // Fallback to original heuristic path
    const validation = validateApiRequest(ScoreResponseRequestSchema, body)
    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { attemptId: vAttemptId, section: vSection, extracted_numbers, bullets } = validation.data

    let resolvedCaseId: string
    if (vAttemptId.startsWith('demo-')) {
      const demoBody = body as any
      if (!demoBody.caseId) {
        return NextResponse.json({ error: 'caseId required for demo mode' }, { status: 400 })
      }
      resolvedCaseId = demoBody.caseId
    } else {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser()

      if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }

      const { data: attempt, error: attemptError } = await supabase
        .from('case_attempts')
        .select('user_id, case_id, rubric_scores')
        .eq('id', vAttemptId)
        .single()

      if (attemptError || !attempt) {
        return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
      }
      if (attempt.user_id !== user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }

      resolvedCaseId = attempt.case_id
      ;(body as any)._existingScores = (attempt as any).rubric_scores || {}
    }

    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('sections, ground_truth')
      .eq('id', resolvedCaseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const sections = caseData.sections as CaseSection[]
    const targetSection = sections.find((s) => s.name === vSection)

    if (!targetSection) {
      return NextResponse.json({ error: 'Section not found' }, { status: 404 })
    }

    const rubric = targetSection.rubric
    const groundTruth = caseData.ground_truth as GroundTruth | null

    const quantResult = scoreQuantitative(extracted_numbers, groundTruth)
    const frameworkResult = scoreFramework(bullets, groundTruth)
    const insightResult = scoreInsights(bullets)
    const commResult = scoreCommunication(bullets)
    const sanityResult = scoreSanityChecks(extracted_numbers)

    const scores: Record<string, number> = {
      quantitative: quantResult.score,
      framework: frameworkResult.score,
      insight: insightResult.score,
      communication: commResult.score,
      sanity_checks: sanityResult.score,
    }

    const allComments = [
      ...quantResult.comments,
      ...frameworkResult.comments,
      ...insightResult.comments,
      ...commResult.comments,
      ...sanityResult.comments,
    ]

    let weightedScore = 0
    let totalWeight = 0

    for (const criterion of rubric.criteria) {
      const dimScore = scores[criterion.dimension] || scores.quantitative || 70
      weightedScore += dimScore * criterion.weight
      totalWeight += criterion.weight
    }

    const finalScore = totalWeight > 0 ? weightedScore / totalWeight : 70
    const sectionPassed = finalScore >= rubric.passing_score

    const sectionScore: SectionScore = {
      scores,
      comments: allComments,
      section_passed: sectionPassed,
      scored_at: new Date().toISOString(),
    }

    if (!vAttemptId.startsWith('demo-')) {
      const existingScores = (body as any)._existingScores || {}
      const updatedScores: RubricScores = {
        ...existingScores,
        [vSection]: sectionScore,
      }

      await supabase
        .from('case_attempts')
        .update({ rubric_scores: updatedScores })
        .eq('id', vAttemptId)

      await supabase.from('case_events').insert({
        attempt_id: vAttemptId,
        event_type: 'response_scored',
        payload: {
          section: vSection,
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

/** Convert your section rubric to the simple Scorer rubric shape */
function normalizeRubricForScorer(section: CaseSection) {
  // Expecting section.rubric.criteria: [{ dimension, weight }, ...]
  // Map to categories with names and weights
  const criteria = (section as any).rubric?.criteria ?? []
  const cats = criteria.map((c: any) => ({
    name: String(c.dimension || 'dimension'),
    weight: Number(c.weight || 1),
    desc: '',
  }))
  return { categories: cats }
}
