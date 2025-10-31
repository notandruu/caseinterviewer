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
import { matchSectionFlexible, listSectionCandidates } from '@/lib/compose/sections'

// Canonical aliases to map human-friendly names to internal section keys
const SECTION_ALIASES: Record<string, string> = {
  'case opening': 'opening',
  'opening': 'opening',
  'intro': 'opening',
  'introduction': 'opening',
  'framework': 'framework',
  'analysis': 'analysis',
  'synthesis': 'synthesis',
  'final recommendation': 'final recommendation',
  // math variants seen in cases
  'math': 'math',
  'math_schools': 'math_schools',
  'math: number of schools': 'math_schools',
  'math_market_value': 'math_market_value',
  'math: market value': 'math_market_value',
}

function normalizeIncomingSection(input: string | null | undefined): string | null {
  if (!input) return null
  const s = String(input).trim().toLowerCase()
  return SECTION_ALIASES[s] ?? s
}

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

function devError(err: unknown): string {
  if (process.env.NODE_ENV !== 'production' && err instanceof Error) {
    return `Dev error: ${err.message}`;
  }
  return 'Internal server error';
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Prefer the client's provided section value and normalize it to a canonical key
    const incomingSectionRaw = body?.section as string | undefined
    const incomingSection = normalizeIncomingSection(incomingSectionRaw)
    // Do NOT overwrite body.section — prefer what the client explicitly sent

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
  if (!attemptId || !incomingSection || !analyzer_json) {
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
        // Skip fetching attempt in demo mode, no need to check auth or scores
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
        ;(body as any)._existingScores = attempt.rubric_scores || {}
      }

      // Fetch case rubric and section
      const { data: caseData, error: caseError } = await supabase
        .from('cases')
        .select('sections')
        .eq('id', caseId)
        .single()

      if (caseError || !caseData) return NextResponse.json({ error: 'Case not found' }, { status: 404 })

      const sections = caseData.sections as CaseSection[]
      const sectionsSource = Array.isArray(sections) && sections.length > 0 ? sections : []
      const found = matchSectionFlexible(sectionsSource, incomingSection || '')
      if (!found) {
        const { keys } = listSectionCandidates(sectionsSource)
        const msg = process.env.NODE_ENV !== 'production'
          ? `Section not found: "${incomingSectionRaw ?? incomingSection}". Available: [${keys.join(', ')}]`
          : 'Section not found'
        return NextResponse.json({ error: msg }, { status: 404 })
      }

      // Build minimal CaseState and call Scorer
      let baseState = {}
      if (!isDemoAttempt) {
        baseState = await getCaseStateFromDB(attemptId)
      }
      const targetSection = found.raw as CaseSection
      const state = { 
        ...baseState, 
        currentSection: incomingSection, 
        rubric: normalizeRubricForScorer(targetSection),
        // Add minimal state for demo mode
        isDemoAttempt,
        caseId,
      }

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

      // Only save to DB in non-demo mode
      if (!isDemoAttempt) {
        const sectionScore: SectionScore = {
          scores: mappedScores,
          comments,
          section_passed: passing,
          scored_at: new Date().toISOString(),
        };
        
        try {
          // Update attempt rubric scores
          const existingScores = (body as any)._existingScores || {};
          const updatedScores: RubricScores = { ...existingScores, [incomingSection ?? 'unknown']: sectionScore };
          await supabase
            .from('case_attempts')
            .update({ rubric_scores: updatedScores })
            .eq('id', attemptId);

          // Log scoring event
          await supabase.from('case_events').insert({
            attempt_id: attemptId,
            event_type: 'response_scored_llm',
            payload: { section: incomingSection ?? 'unknown', scorer_json: scorerJson },
          });

          // Persist LLM turn data
          await persistScorerTurn({
            attemptId,
            scorer_json: scorerJson,
            usage,
          });
        } catch (dbError) {
          // Log but continue - demo mode doesn't require successful DB writes
          console.warn('[score-response] Failed to save LLM scoring:', dbError);
        }
      }

      return NextResponse.json({
        scores: mappedScores,
        comments,
        section_passed: passing,
        final_score: Math.round(finalScore),
        via: 'llm',
      })
    }

    // Fallback to original heuristic path
  const validation = validateApiRequest(ScoreResponseRequestSchema, { ...body, section: incomingSection })
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
      .select('sections, ground_truth, vars')
      .eq('id', resolvedCaseId)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const sections = caseData.sections as CaseSection[]
    const sectionsSource = Array.isArray(sections) && sections.length > 0 ? sections : []
    const found = matchSectionFlexible(sectionsSource, vSection)
    if (!found) {
      const { keys } = listSectionCandidates(sectionsSource)
      const msg = process.env.NODE_ENV !== 'production'
        ? `Section not found: "${vSection}". Available: [${keys.join(', ')}]`
        : 'Section not found'
      return NextResponse.json({ error: msg }, { status: 404 })
    }
    const targetSection = found.raw as CaseSection

    // safe defaults if section.rubric is absent
    type Rubric = {
      criteria: { dimension: string; weight: number }[];
      passing_score: number;
    };

    const defaultRubric: Rubric = {
      criteria: [
        { dimension: "quantitative", weight: 0.4 },
        { dimension: "framework", weight: 0.2 },
        { dimension: "insight", weight: 0.2 },
        { dimension: "communication", weight: 0.2 },
      ],
      passing_score: 60,
    };

    // prefer section rubric, then any case-level rubric inside ground_truth, else default
    const rubric: Rubric =
      (targetSection && (targetSection as any).rubric) ||
      ((caseData.ground_truth as any)?.rubric as Rubric) ||
      defaultRubric;

    const groundTruth = (caseData.ground_truth as any) ?? null;
    const expectedCalcs = groundTruth?.calculations ?? null;

    const quantResult = scoreQuantitative(extracted_numbers || {}, expectedCalcs ? { calculations: expectedCalcs } as GroundTruth : null)
    const frameworkResult = scoreFramework(bullets || [], groundTruth)
    const insightResult = scoreInsights(bullets || [])
    const commResult = scoreCommunication(bullets || [])
    const sanityResult = scoreSanityChecks(extracted_numbers || {})

    // Calculate dimension scores and aggregate comments
    const dimensionResults = {
      quantitative: quantResult,
      framework: frameworkResult,
      insight: insightResult,
      communication: commResult,
      sanity_checks: sanityResult,
    };

    const dimensionScores = Object.entries(dimensionResults).reduce(
      (acc, [key, result]) => ({ ...acc, [key]: result.score }),
      {} as Record<string, number>
    );

    const allComments = Object.values(dimensionResults).flatMap(r => r.comments);

    // Calculate weighted final score using rubric criteria
    const { weightedTotal, totalWeight } = rubric.criteria.reduce(
      (acc, criterion) => {
        const dimScore = dimensionScores[criterion.dimension] || dimensionScores.quantitative || 70;
        return {
          weightedTotal: acc.weightedTotal + (dimScore * criterion.weight),
          totalWeight: acc.totalWeight + criterion.weight,
        };
      },
      { weightedTotal: 0, totalWeight: 0 }
    );

    const finalScore = totalWeight > 0 ? weightedTotal / totalWeight : 70;
    const sectionPassed = finalScore >= (rubric.passing_score ?? defaultRubric.passing_score);

    const sectionScore: SectionScore = {
      scores: dimensionScores,
      comments: allComments,
      section_passed: sectionPassed,
      scored_at: new Date().toISOString(),
    };

    if (!vAttemptId.startsWith('demo-')) {
      const existingScores = (body as any)._existingScores || {};
      const updatedScores: RubricScores = {
        ...existingScores,
        [vSection]: sectionScore,
      };

      // Only update attempt if scored
      try {
        const updates: any = { rubric_scores: updatedScores };
        
        // Try to advance section if passed
        if (sectionPassed && Array.isArray(sections)) {
          const sectionOrder = sections.map(s => s.name);
          const currentIdx = sectionOrder.findIndex(s => s === found?.raw?.name);
          if (currentIdx >= 0 && currentIdx < sectionOrder.length - 1) {
            updates.current_section = sectionOrder[currentIdx + 1];
          }
        }

        await supabase
          .from('case_attempts')
          .update(updates)
          .eq('id', vAttemptId);

        await supabase.from('case_events').insert({
          attempt_id: vAttemptId,
          event_type: 'response_scored',
          payload: {
            section: vSection,
            scores: dimensionScores,
            comments: allComments,
            section_passed: sectionPassed,
            extracted_numbers: extracted_numbers || {},
            bullets: bullets || [],
            next_section: updates.current_section,
          },
        });
      } catch (updateError) {
        // Log but continue - don't fail the response if DB updates fail
        console.warn('[score-response] Failed to update attempt/events:', updateError);
      }
    }

    const response = {
      scores: dimensionScores,
      comments: allComments,
      section_passed: sectionPassed,
      final_score: Math.round(finalScore),
      passing_score: rubric.passing_score ?? defaultRubric.passing_score,
    };

    return NextResponse.json(response);

  } catch (error: any) {
    console.error('[score-response] Error:', error);
    return NextResponse.json({ error: devError(error) }, { status: 500 });
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
