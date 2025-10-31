/**
 * Zod validators for Voice V2 case interview system
 * Provides runtime validation of payloads from database and API calls
 */

import { z } from 'zod'

// ============================================================================
// Section and Core Case Validators
// ============================================================================

export const SectionNameSchema = z.enum(['introduction', 'framework', 'analysis', 'synthesis'])

export const HintSchema = z.object({
  tier: z.number().int().positive(),
  text: z.string().min(1),
})

export const RubricCriterionSchema = z.object({
  dimension: z.string(),
  weight: z.number().min(0).max(1),
  description: z.string(),
})

export const SectionRubricSchema = z.object({
  criteria: z.array(RubricCriterionSchema),
  passing_score: z.number().min(0).max(100),
})

export const CaseSectionSchema = z.object({
  name: SectionNameSchema,
  goal: z.string(),
  prompt: z.string(),
  time_limit_sec: z.number().int().positive(),
  hints: z.array(HintSchema),
  rubric: SectionRubricSchema,
})

export const DisclosureRulesSchema = z.object({
  expected_answer_visibility: z.enum(['staff_only', 'post_completion', 'never']),
  hints_policy: z.enum(['tiered', 'unlimited', 'none']),
  ground_truth_exposure: z.enum(['never_to_ai', 'synthesis_only']),
})

export const EvaluationDimensionSchema = z.object({
  name: z.string(),
  weight: z.number().min(0).max(1),
})

export const EvaluationRubricSchema = z.object({
  dimensions: z.array(EvaluationDimensionSchema),
  passing_threshold: z.number().min(0).max(100),
})

export const CaseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  firm: z.string().nullable(),
  industry: z.string().nullable(),
  difficulty_level: z.number().int().min(1).max(5),
  version: z.number().int().positive(),
  language: z.string(),
  summary: z.string().nullable(),
  expected_framework: z.string().nullable(),
  expected_answer_summary: z.string().nullable(),
  key_insights: z.array(z.string()).nullable(),
  data_json: z.record(z.any()),
  ground_truth: z.record(z.any()).nullable(),
  constraints: z.record(z.any()).nullable(),
  sections: z.array(CaseSectionSchema),
  evaluation_rubric: EvaluationRubricSchema.nullable(),
  created_by: z.string().uuid().nullable(),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  published: z.boolean(),
  disclosure_rules: DisclosureRulesSchema,
})

// ============================================================================
// Attempt and Event Validators
// ============================================================================

export const AttemptStateSchema = z.enum(['in_progress', 'completed', 'abandoned'])

export const TranscriptEntrySchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  timestamp: z.string().datetime(),
  section: SectionNameSchema.optional(),
})

export const HintUsageSchema = z.object({
  section: SectionNameSchema,
  tier: z.number().int().positive(),
  timestamp: z.string().datetime(),
})

export const SectionScoreSchema = z.object({
  scores: z.record(z.number()),
  comments: z.array(z.string()),
  section_passed: z.boolean(),
  scored_at: z.string().datetime(),
})

export const RubricScoresSchema = z.record(SectionScoreSchema)

export const CaseAttemptSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
  case_id: z.string().uuid(),
  started_at: z.string().datetime(),
  completed_at: z.string().datetime().nullable(),
  current_section: SectionNameSchema,
  total_score: z.number().nullable(),
  rubric_scores: RubricScoresSchema,
  transcript: z.array(TranscriptEntrySchema),
  hints_used: z.array(HintUsageSchema),
  state: AttemptStateSchema,
  metadata: z.record(z.any()),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
})

export const EventTypeSchema = z.enum([
  'section_started',
  'hint_revealed',
  'calculation_performed',
  'response_scored',
  'section_advanced',
  'attempt_completed',
  'attempt_abandoned',
])

export const CaseEventSchema = z.object({
  id: z.number().int().positive(),
  attempt_id: z.string().uuid(),
  event_type: EventTypeSchema,
  payload: z.record(z.any()),
  created_at: z.string().datetime(),
})

// ============================================================================
// API Request/Response Validators
// ============================================================================

// Helper: Accept both UUID and demo IDs (demo-*)
const attemptIdOrDemo = z.string().refine(
  (val) => {
    // Allow demo IDs (start with "demo-") or valid UUIDs
    return val.startsWith('demo-') || z.string().uuid().safeParse(val).success
  },
  { message: 'Must be a valid UUID or demo ID (starts with "demo-")' }
)

// get_case_section
export const GetCaseSectionRequestSchema = z.object({
  caseId: z.string().uuid(),
  attemptId: attemptIdOrDemo,
}).passthrough() // Allow extra fields for demo mode (currentSection, etc.)

export const GetCaseSectionResponseSchema = z.object({
  section: CaseSectionSchema,
  data: z.record(z.any()),
})

// reveal_hint
export const RevealHintRequestSchema = z.object({
  attemptId: attemptIdOrDemo,
}).passthrough() // Allow extra fields for demo mode (caseId, currentSection, hintTier)

export const RevealHintResponseSchema = z.object({
  hint: z.string(),
  tier: z.number().int().positive(),
})

// calc_basic
export const CalcBasicRequestSchema = z.object({
  expr: z.string().min(1).max(500), // Limit expression length
})

export const CalcBasicResponseSchema = z.object({
  result: z.number(),
})

// score_response
export const ScoreResponseRequestSchema = z.object({
  attemptId: attemptIdOrDemo,
  section: z.string().min(1).transform(s => s.trim()), // accept any label, we normalize later
  extracted_numbers: z.record(z.number()).default({}),
  bullets: z.array(z.string()).default([]),
}).passthrough() // Allow extra fields for demo mode (caseId, use_llm, analyzer_json)

export const ScoreResponseResponseSchema = z.object({
  scores: z.object({
    quantitative: z.number().optional(),
    framework: z.number().optional(),
    insight: z.number().optional(),
    communication: z.number().optional(),
    sanity_checks: z.number().optional(),
  }).catchall(z.number()),
  comments: z.array(z.string()),
  section_passed: z.boolean(),
})

// advance_section
export const AdvanceSectionRequestSchema = z.object({
  attemptId: attemptIdOrDemo,
}).passthrough() // Allow extra fields for demo mode (currentSection)

export const AdvanceSectionResponseSchema = z.object({
  next_section: SectionNameSchema.nullable(),
})

// ============================================================================
// Specific Event Payload Validators
// ============================================================================

export const SectionStartedPayloadSchema = z.object({
  section: SectionNameSchema,
})

export const HintRevealedPayloadSchema = z.object({
  section: SectionNameSchema,
  tier: z.number().int().positive(),
  hint_text: z.string(),
})

export const CalculationPerformedPayloadSchema = z.object({
  expression: z.string(),
  result: z.number(),
  section: SectionNameSchema,
})

export const ResponseScoredPayloadSchema = z.object({
  section: SectionNameSchema,
  scores: z.record(z.number()),
  comments: z.array(z.string()),
  section_passed: z.boolean(),
  extracted_numbers: z.record(z.number()),
  bullets: z.array(z.string()),
})

export const SectionAdvancedPayloadSchema = z.object({
  from_section: SectionNameSchema,
  to_section: SectionNameSchema,
})

// ============================================================================
// Validation Helper Functions
// ============================================================================

/**
 * Validates and parses case data from database
 * Throws if validation fails
 */
export function validateCase(data: unknown) {
  return CaseSchema.parse(data)
}

/**
 * Validates case data safely, returns error if invalid
 */
export function safeParseCas(data: unknown) {
  return CaseSchema.safeParse(data)
}

/**
 * Validates attempt data
 */
export function validateAttempt(data: unknown) {
  return CaseAttemptSchema.parse(data)
}

/**
 * Validates event payload based on event type
 */
export function validateEventPayload(eventType: string, payload: unknown) {
  switch (eventType) {
    case 'section_started':
      return SectionStartedPayloadSchema.parse(payload)
    case 'hint_revealed':
      return HintRevealedPayloadSchema.parse(payload)
    case 'calculation_performed':
      return CalculationPerformedPayloadSchema.parse(payload)
    case 'response_scored':
      return ResponseScoredPayloadSchema.parse(payload)
    case 'section_advanced':
      return SectionAdvancedPayloadSchema.parse(payload)
    default:
      // Generic payload validation
      return z.record(z.any()).parse(payload)
  }
}

/**
 * Validates API request and returns typed result
 */
export function validateApiRequest<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; error: z.ZodError } {
  const result = schema.safeParse(data)
  if (result.success) {
    return { success: true, data: result.data }
  } else {
    return { success: false, error: result.error }
  }
}

/**
 * Validates that a section exists in a case
 */
export function validateSectionExists(
  sections: z.infer<typeof CaseSectionSchema>[],
  sectionName: string
): boolean {
  return sections.some((s) => s.name === sectionName)
}

/**
 * Validates that rubric scores sum to reasonable values
 */
export function validateRubricWeights(
  criteria: z.infer<typeof RubricCriterionSchema>[]
): boolean {
  const sum = criteria.reduce((acc, c) => acc + c.weight, 0)
  return Math.abs(sum - 1.0) < 0.01 // Allow small floating point error
}

/**
 * Sanitizes expression for calculator
 * Removes potentially dangerous characters
 */
export function sanitizeExpression(expr: string): string {
  // Allow only: numbers, operators, parentheses, spaces, and decimal points
  return expr.replace(/[^0-9+\-*/().\s]/g, '')
}

/**
 * Validates that a calculation expression is safe
 */
export function isSafeExpression(expr: string): boolean {
  const sanitized = sanitizeExpression(expr)
  // Check for basic validity
  if (sanitized.length === 0 || sanitized.length > 500) return false
  // Check for balanced parentheses
  let count = 0
  for (const char of sanitized) {
    if (char === '(') count++
    if (char === ')') count--
    if (count < 0) return false
  }
  return count === 0
}

// ============================================================================
// Type Exports (for convenience)
// ============================================================================

export type ValidatedCase = z.infer<typeof CaseSchema>
export type ValidatedAttempt = z.infer<typeof CaseAttemptSchema>
export type ValidatedEvent = z.infer<typeof CaseEventSchema>
export type ValidatedSection = z.infer<typeof CaseSectionSchema>
export type ValidatedSectionName = z.infer<typeof SectionNameSchema>
