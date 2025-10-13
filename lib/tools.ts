/**
 * Client SDK for Voice V2 API Tools
 * Provides typed wrappers for calling server-mediated tools
 */

import type {
  GetCaseSectionRequest,
  GetCaseSectionResponse,
  RevealHintRequest,
  RevealHintResponse,
  CalcBasicRequest,
  CalcBasicResponse,
  ScoreResponseRequest,
  ScoreResponseResponse,
  AdvanceSectionRequest,
  AdvanceSectionResponse,
  RealtimeToolDefinition,
} from '@/types/cases'

const API_BASE = '/api/voice-tools'

/**
 * Base fetch wrapper with error handling
 */
async function fetchTool<TRequest, TResponse>(
  endpoint: string,
  payload: TRequest
): Promise<TResponse> {
  const response = await fetch(`${API_BASE}/${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `Tool call failed: ${endpoint}`)
  }

  return response.json()
}

// ============================================================================
// Tool Functions
// ============================================================================

/**
 * Get current case section details
 */
export async function getCaseSection(
  request: GetCaseSectionRequest
): Promise<GetCaseSectionResponse> {
  return fetchTool('get-case-section', request)
}

/**
 * Reveal next hint in current section
 */
export async function revealHint(
  request: RevealHintRequest
): Promise<RevealHintResponse> {
  return fetchTool('reveal-hint', request)
}

/**
 * Calculate arithmetic expression safely
 */
export async function calcBasic(
  request: CalcBasicRequest
): Promise<CalcBasicResponse> {
  return fetchTool('calc-basic', request)
}

/**
 * Score candidate's response for current section
 */
export async function scoreResponse(
  request: ScoreResponseRequest
): Promise<ScoreResponseResponse> {
  return fetchTool('score-response', request)
}

/**
 * Advance to next section
 */
export async function advanceSection(
  request: AdvanceSectionRequest
): Promise<AdvanceSectionResponse> {
  return fetchTool('advance-section', request)
}

// ============================================================================
// Realtime API Tool Definitions
// ============================================================================

/**
 * OpenAI Realtime API tool definitions
 * These are used to register tools with the Realtime session
 */
export const REALTIME_TOOL_DEFINITIONS: RealtimeToolDefinition[] = [
  {
    type: 'function',
    name: 'get_case_section',
    description:
      'Fetch current section details and ALL case data (aircraft capacity, routes, prices, utilization, etc.). You MUST call this FIRST before conducting the interview to access case information. Call again when advancing to new sections.',
    parameters: {
      type: 'object',
      properties: {
        caseId: {
          type: 'string',
          description: 'The case UUID',
        },
        attemptId: {
          type: 'string',
          description: 'The attempt UUID for this interview session',
        },
      },
      required: ['caseId', 'attemptId'],
    },
  },
  {
    type: 'function',
    name: 'reveal_hint',
    description:
      'Reveal the next tier hint for the current section. Only use this when the candidate explicitly asks for help or is clearly stuck. Hints progress from generic to specific.',
    parameters: {
      type: 'object',
      properties: {
        attemptId: {
          type: 'string',
          description: 'The attempt UUID',
        },
      },
      required: ['attemptId'],
    },
  },
  {
    type: 'function',
    name: 'calc_basic',
    description:
      'Evaluate arithmetic expressions. You MUST use this tool for ALL calculations - never compute in your head. Supports +, -, *, /, parentheses, and decimals.',
    parameters: {
      type: 'object',
      properties: {
        expr: {
          type: 'string',
          description:
            'Arithmetic expression to evaluate, e.g., "200 * 0.6 * 500" or "(100 + 50) / 2"',
        },
      },
      required: ['expr'],
    },
  },
  {
    type: 'function',
    name: 'score_response',
    description:
      'Score the candidate\'s response for the current section. Call this before advancing to the next section. Extract key numbers and reasoning bullets from their answer.',
    parameters: {
      type: 'object',
      properties: {
        attemptId: {
          type: 'string',
          description: 'The attempt UUID',
        },
        section: {
          type: 'string',
          enum: ['introduction', 'framework', 'analysis', 'synthesis'],
          description: 'The section being scored',
        },
        extracted_numbers: {
          type: 'object',
          description:
            'Key numbers extracted from candidate response, e.g., {"revenue_per_flight": 60000, "profit": 20000}',
          additionalProperties: {
            type: 'number',
          },
        },
        bullets: {
          type: 'array',
          description:
            'Bullet points summarizing candidate\'s key reasoning and insights',
          items: {
            type: 'string',
          },
        },
      },
      required: ['attemptId', 'section', 'extracted_numbers', 'bullets'],
    },
  },
  {
    type: 'function',
    name: 'advance_section',
    description:
      'Move to the next section of the interview. Only call this after scoring the current section and confirming the candidate is ready to proceed.',
    parameters: {
      type: 'object',
      properties: {
        attemptId: {
          type: 'string',
          description: 'The attempt UUID',
        },
      },
      required: ['attemptId'],
    },
  },
]

// ============================================================================
// Tool Handler for Realtime API
// ============================================================================

/**
 * Demo state tracker (for non-authenticated users)
 * Tracks hints used and current section for demo sessions
 */
const demoState = new Map<string, {
  hintsUsed: number
  currentSection: string
}>()

function getDemoState(attemptId: string) {
  if (!demoState.has(attemptId)) {
    demoState.set(attemptId, { hintsUsed: 0, currentSection: 'introduction' })
  }
  return demoState.get(attemptId)!
}

/**
 * Handle tool calls from Realtime API
 * Routes tool calls to appropriate API endpoints
 */
export async function handleRealtimeTool(
  toolName: string,
  toolArgs: Record<string, any>,
  context?: { caseId?: string; currentSection?: string }
): Promise<any> {
  const isDemoAttempt = toolArgs.attemptId?.startsWith('demo-')

  // Inject demo-specific parameters
  if (isDemoAttempt && context) {
    const state = getDemoState(toolArgs.attemptId)

    // Add context for demo mode
    toolArgs = {
      ...toolArgs,
      caseId: context.caseId || toolArgs.caseId,
      currentSection: context.currentSection || state.currentSection,
      hintTier: state.hintsUsed,
    }
  }

  switch (toolName) {
    case 'get_case_section':
      return getCaseSection(toolArgs as GetCaseSectionRequest)

    case 'reveal_hint': {
      const result = await revealHint(toolArgs as RevealHintRequest)
      // Update demo state if hint was revealed
      if (isDemoAttempt && !result.error) {
        const state = getDemoState(toolArgs.attemptId)
        state.hintsUsed++
      }
      return result
    }

    case 'calc_basic':
      return calcBasic(toolArgs as CalcBasicRequest)

    case 'score_response':
      return scoreResponse(toolArgs as ScoreResponseRequest)

    case 'advance_section': {
      const result = await advanceSection(toolArgs as AdvanceSectionRequest)
      // Update demo state if section advanced
      if (isDemoAttempt && result.next_section) {
        const state = getDemoState(toolArgs.attemptId)
        state.currentSection = result.next_section
        state.hintsUsed = 0 // Reset hints for new section
      }
      return result
    }

    default:
      throw new Error(`Unknown tool: ${toolName}`)
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Create a new case attempt
 */
export async function createAttempt(caseId: string, userId: string): Promise<string> {
  const response = await fetch('/api/voice-tools/create-attempt', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ caseId, userId }),
  })

  if (!response.ok) {
    throw new Error('Failed to create attempt')
  }

  const data = await response.json()
  return data.attemptId
}

/**
 * Check if feature is enabled
 */
export function isVoiceV2Enabled(): boolean {
  return process.env.NEXT_PUBLIC_VOICE_SESSION_V2_ENABLED === 'true'
}
