/**
 * API Tool: generate_feedback
 *
 * Uses Echo to generate personalized feedback based on user's actual responses
 * Compares user responses against case ground truth and rubric
 * This is where Echo credits are spent - generating valuable AI feedback
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getOpenAI } from '@/lib/openai/server'
import type { GroundTruth, CaseSection, RubricScores } from '@/types/cases'

export async function POST(request: NextRequest) {
  try {
    const { attemptId } = await request.json()

    const supabase = await createClient()

    // Authenticate user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch attempt with transcript
    const { data: attempt, error: attemptError } = await supabase
      .from('case_attempts')
      .select('user_id, case_id, transcript, metadata')
      .eq('id', attemptId)
      .single()

    if (attemptError || !attempt) {
      return NextResponse.json({ error: 'Attempt not found' }, { status: 404 })
    }

    if (attempt.user_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Fetch case with ground truth and sections
    const { data: caseData, error: caseError } = await supabase
      .from('cases')
      .select('title, ground_truth, sections, difficulty_level')
      .eq('id', attempt.case_id)
      .single()

    if (caseError || !caseData) {
      return NextResponse.json({ error: 'Case not found' }, { status: 404 })
    }

    const groundTruth = caseData.ground_truth as GroundTruth | null
    const sections = caseData.sections as CaseSection[]
    const transcript = attempt.transcript as any[] || []

    // Extract user responses by section from transcript
    const userResponses = extractResponsesBySection(transcript)

    const openai = getOpenAI()

    const feedbackResponse = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [{
        role: 'system',
        content: `You are an expert case interview evaluator. Analyze this user's performance and provide detailed, constructive feedback.

**Case:** ${caseData.title} (Difficulty: ${caseData.difficulty_level}/5)

**Ground Truth & Model Answers:**
${JSON.stringify(groundTruth, null, 2)}

**Section Rubrics:**
${JSON.stringify(sections.map(s => ({ name: s.name, rubric: s.rubric })), null, 2)}

**User's Actual Responses:**
${JSON.stringify(userResponses, null, 2)}

**Full Interview Transcript:**
${transcript.map(t => `${t.role}: ${t.content}`).join('\n')}

---

**Your Task:**
Provide detailed, personalized feedback for each section. Compare user's actual responses against the model answers and rubric.

**Return JSON in this exact format:**
{
  "framework": {
    "score": 75,
    "section_passed": true,
    "strengths": ["point 1", "point 2"],
    "weaknesses": ["point 1", "point 2"],
    "specific_feedback": "Detailed paragraph about their framework approach...",
    "improvement_tips": ["tip 1", "tip 2"]
  },
  "analysis": {
    "score": 68,
    "section_passed": true,
    "strengths": [...],
    "weaknesses": [...],
    "specific_feedback": "...",
    "improvement_tips": [...]
  },
  "synthesis": {
    "score": 82,
    "section_passed": true,
    "strengths": [...],
    "weaknesses": [...],
    "specific_feedback": "...",
    "improvement_tips": [...]
  },
  "overall_assessment": "High-level summary of performance...",
  "next_steps": ["actionable recommendation 1", "actionable recommendation 2"]
}

**Scoring Guidelines:**
- 90-100: Exceptional - Exceeds consulting standards
- 80-89: Strong - Ready for real interviews
- 70-79: Good - Minor improvements needed
- 60-69: Fair - Needs focused practice
- Below 60: Needs significant improvement

Be honest but constructive. Focus on specific examples from their responses.`
      }],
      max_tokens: 12000,
      temperature: 0.3, // Lower temperature for consistent scoring
    })

    const feedbackData = JSON.parse(feedbackResponse.choices[0].message.content || '{}')

    // Transform into RubricScores format
    const rubricScores: RubricScores = {}

    for (const [sectionName, feedback] of Object.entries(feedbackData)) {
      if (sectionName === 'overall_assessment' || sectionName === 'next_steps') continue

      const sectionFeedback = feedback as any

      rubricScores[sectionName] = {
        scores: {
          overall: sectionFeedback.score || 70,
        },
        comments: [
          ...sectionFeedback.strengths.map((s: string) => `✓ ${s}`),
          ...sectionFeedback.weaknesses.map((w: string) => `⚠ ${w}`),
          ...sectionFeedback.improvement_tips.map((t: string) => `💡 ${t}`),
        ],
        section_passed: sectionFeedback.section_passed,
        scored_at: new Date().toISOString(),
        detailed_feedback: sectionFeedback.specific_feedback,
      }
    }

    // Calculate total score
    const totalScore = Object.values(feedbackData)
      .filter((v: any) => typeof v === 'object' && v.score)
      .reduce((sum: number, v: any) => sum + v.score, 0) / 3

    // Update attempt with feedback
    await supabase
      .from('case_attempts')
      .update({
        rubric_scores: rubricScores,
        total_score: Math.round(totalScore),
        metadata: {
          ...attempt.metadata,
          overall_assessment: feedbackData.overall_assessment,
          next_steps: feedbackData.next_steps,
          feedback_generated_at: new Date().toISOString(),
        },
        state: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', attemptId)

    // Log event
    await supabase.from('case_events').insert({
      attempt_id: attemptId,
      event_type: 'feedback_generated',
      payload: {
        total_score: Math.round(totalScore),
        rubric_scores: rubricScores,
        overall_assessment: feedbackData.overall_assessment,
      },
    })

    return NextResponse.json({
      success: true,
      total_score: Math.round(totalScore),
      rubric_scores: rubricScores,
      overall_assessment: feedbackData.overall_assessment,
      next_steps: feedbackData.next_steps,
    })

  } catch (error: any) {
    console.error('[generate-feedback] Error:', error)

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * Extract user's responses organized by section from transcript
 */
function extractResponsesBySection(transcript: any[]) {
  const responses: Record<string, string[]> = {
    framework: [],
    analysis: [],
    synthesis: [],
  }

  let currentSection = 'framework'

  for (const entry of transcript) {
    // Track section changes
    if (entry.section) {
      currentSection = entry.section.toLowerCase()
    }

    // Collect user responses (not assistant)
    if (entry.role === 'user' && entry.content) {
      if (!responses[currentSection]) {
        responses[currentSection] = []
      }
      responses[currentSection].push(entry.content)
    }
  }

  // Combine responses per section into single strings
  return {
    framework: responses.framework.join('\n\n'),
    analysis: responses.analysis.join('\n\n'),
    synthesis: responses.synthesis.join('\n\n'),
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
