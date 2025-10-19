/**
 * Type definitions for Voice V2 case interview system
 * These types mirror the Supabase schema and provide strong typing for the application
 */

// ============================================================================
// Core Case Types
// ============================================================================

export interface Case {
  id: string
  title: string
  firm: string | null
  industry: string | null
  difficulty_level: number
  version: number
  language: string
  summary: string | null
  expected_framework: string | null
  expected_answer_summary: string | null // Staff-only, should be filtered by RLS
  key_insights: string[] | null
  data_json: CaseData
  ground_truth: GroundTruth | null // Should never be exposed to AI
  constraints: Record<string, any> | null
  sections: CaseSection[]
  evaluation_rubric: EvaluationRubric | null
  analysis_chart: AnalysisChart | null // Chart displayed during analysis section
  created_by: string | null
  created_at: string
  updated_at: string
  published: boolean
  disclosure_rules: DisclosureRules
  search_vector?: any // Generated column, not directly used
}

/**
 * Client-safe version of Case (filters out staff-only fields)
 */
export interface ClientCase extends Omit<Case, 'expected_answer_summary' | 'ground_truth'> {
  // These fields are stripped for non-staff users
}

// ============================================================================
// Chart Types (for Analysis Section)
// ============================================================================

/**
 * Chart data displayed during the analysis section
 */
export type AnalysisChart =
  | ChartConfig
  | ImageChart
  | StorageChart
  | MultiChart
  | null

/**
 * Chart configuration for dynamic rendering (Recharts, Chart.js, etc.)
 */
export interface ChartConfig {
  type: 'chart'
  library: 'recharts' | 'chartjs' | 'plotly'
  chartType: 'bar' | 'line' | 'pie' | 'area' | 'scatter'
  title: string
  description?: string
  config: {
    data: any[]
    xAxis?: any
    yAxis?: any
    bars?: any[]
    lines?: any[]
    areas?: any[]
    tooltip?: any
    legend?: any
    colors?: string[]
    [key: string]: any
  }
}

/**
 * Static image chart (URL to image)
 */
export interface ImageChart {
  type: 'image'
  url: string
  alt: string
  width?: number
  height?: number
}

/**
 * Chart stored in Supabase Storage
 */
export interface StorageChart {
  type: 'storage'
  bucket: string
  path: string
  alt: string
  width?: number
  height?: number
}

/**
 * Multiple charts displayed together
 */
export interface MultiChart {
  type: 'multi'
  charts: (ChartConfig | ImageChart | StorageChart)[]
}

// ============================================================================
// Case Section Types
// ============================================================================

export interface CaseSection {
  name: SectionName
  goal: string
  prompt: string
  time_limit_sec: number
  hints: Hint[]
  rubric: SectionRubric
}

export type SectionName = 'introduction' | 'framework' | 'analysis' | 'synthesis'

export interface Hint {
  tier: number
  text: string
}

export interface SectionRubric {
  criteria: RubricCriterion[]
  passing_score: number
}

export interface RubricCriterion {
  dimension: string
  weight: number
  description: string
}

// ============================================================================
// Case Data Types
// ============================================================================

/**
 * Flexible structure for case data
 * Actual shape depends on the specific case
 */
export type CaseData = Record<string, any>

/**
 * Ground truth for scoring
 * Contains expected calculations and framework components
 */
export interface GroundTruth {
  calculations?: Record<string, number>
  framework_components?: string[]
  [key: string]: any
}

// ============================================================================
// Evaluation Types
// ============================================================================

export interface EvaluationRubric {
  dimensions: EvaluationDimension[]
  passing_threshold: number
}

export interface EvaluationDimension {
  name: string
  weight: number
}

export interface DisclosureRules {
  expected_answer_visibility: 'staff_only' | 'post_completion' | 'never'
  hints_policy: 'tiered' | 'unlimited' | 'none'
  ground_truth_exposure: 'never_to_ai' | 'synthesis_only'
}

// ============================================================================
// Attempt Types
// ============================================================================

export interface CaseAttempt {
  id: string
  user_id: string
  case_id: string
  started_at: string
  completed_at: string | null
  current_section: SectionName
  total_score: number | null
  rubric_scores: RubricScores
  transcript: TranscriptEntry[]
  hints_used: HintUsage[]
  state: AttemptState
  metadata: Record<string, any>
  created_at: string
  updated_at: string
}

export type AttemptState = 'in_progress' | 'completed' | 'abandoned'

export interface RubricScores {
  [section: string]: SectionScore
}

export interface SectionScore {
  scores: {
    [dimension: string]: number
  }
  comments: string[]
  section_passed: boolean
  scored_at: string
}

export interface TranscriptEntry {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  section?: SectionName
}

export interface HintUsage {
  section: SectionName
  tier: number
  timestamp: string
}

// ============================================================================
// Event Types
// ============================================================================

export interface CaseEvent {
  id: number
  attempt_id: string
  event_type: EventType
  payload: EventPayload
  created_at: string
}

export type EventType =
  | 'section_started'
  | 'hint_revealed'
  | 'calculation_performed'
  | 'response_scored'
  | 'section_advanced'
  | 'attempt_completed'
  | 'attempt_abandoned'

export type EventPayload = Record<string, any>

// Specific event payloads
export interface SectionStartedPayload {
  section: SectionName
}

export interface HintRevealedPayload {
  section: SectionName
  tier: number
  hint_text: string
}

export interface CalculationPerformedPayload {
  expression: string
  result: number
  section: SectionName
}

export interface ResponseScoredPayload {
  section: SectionName
  scores: Record<string, number>
  comments: string[]
  section_passed: boolean
  extracted_numbers: Record<string, number>
  bullets: string[]
}

export interface SectionAdvancedPayload {
  from_section: SectionName
  to_section: SectionName
}

// ============================================================================
// API Request/Response Types
// ============================================================================

// get_case_section
export interface GetCaseSectionRequest {
  caseId: string
  attemptId: string
}

export interface GetCaseSectionResponse {
  section: CaseSection
  data: CaseData // Filtered based on section
}

// reveal_hint
export interface RevealHintRequest {
  attemptId: string
}

export interface RevealHintResponse {
  hint: string
  tier: number
}

// calc_basic
export interface CalcBasicRequest {
  expr: string
}

export interface CalcBasicResponse {
  result: number
}

// score_response
export interface ScoreResponseRequest {
  attemptId: string
  section: SectionName
  extracted_numbers: Record<string, number>
  bullets: string[]
}

export interface ScoreResponseResponse {
  scores: {
    quantitative?: number
    framework?: number
    insight?: number
    communication?: number
    sanity_checks?: number
    [key: string]: number | undefined
  }
  comments: string[]
  section_passed: boolean
}

// advance_section
export interface AdvanceSectionRequest {
  attemptId: string
}

export interface AdvanceSectionResponse {
  next_section: SectionName | null
}

// ============================================================================
// Realtime API Types
// ============================================================================

export interface RealtimeToolDefinition {
  type: 'function'
  name: string
  description: string
  parameters: {
    type: 'object'
    properties: Record<string, any>
    required: string[]
  }
}

export interface RealtimeToolCall {
  id: string
  name: string
  arguments: string // JSON string
}

export interface RealtimeToolResponse {
  tool_call_id: string
  output: string // JSON string
}

// ============================================================================
// UI State Types
// ============================================================================

export interface VoiceSessionState {
  caseId: string
  attemptId: string
  currentSection: SectionName
  isConnected: boolean
  isRecording: boolean
  transcript: TranscriptEntry[]
  hintsUsed: number
  totalHintsAvailable: number
  sectionProgress: SectionProgress[]
}

export interface SectionProgress {
  name: SectionName
  status: 'locked' | 'current' | 'completed'
  score?: number
}

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Helper to extract just the section names from a case
 */
export type ExtractSectionNames<T extends Case> = T['sections'][number]['name']

/**
 * Type guard to check if a user can see expected answer
 */
export function canSeeExpectedAnswer(
  userRole: 'staff' | 'learner',
  disclosureRules: DisclosureRules,
  attemptState: AttemptState
): boolean {
  if (userRole === 'staff') return true
  if (disclosureRules.expected_answer_visibility === 'never') return false
  if (disclosureRules.expected_answer_visibility === 'post_completion' && attemptState === 'completed') return true
  return false
}

/**
 * Type guard to check if more hints are available
 */
export function canRevealHint(
  section: CaseSection,
  hintsUsedInSection: number
): boolean {
  return hintsUsedInSection < section.hints.length
}
