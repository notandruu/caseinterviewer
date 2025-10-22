/**
 * Compact Tool Definitions for CaseCard/LineCard Structure
 * Simplified turn-based API tools
 */

import type { RealtimeToolDefinition } from '@/types/cases'

export const COMPACT_TOOL_DEFINITIONS: RealtimeToolDefinition[] = [
  {
    type: 'function',
    name: 'get_next_line',
    description:
      'Fetch the next LineCard and updated CaseCard after candidate responds. Call this after each candidate turn to get the next interviewer line.',
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
    name: 'reveal_hint',
    description:
      'Reveal the next tier hint for the current section. Only use this when the candidate explicitly asks for help or is clearly stuck.',
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
    name: 'record_turn',
    description:
      'Record the candidate\'s response with a summary and evaluation tags. Call this after candidate responds and before getting next line.',
    parameters: {
      type: 'object',
      properties: {
        attemptId: {
          type: 'string',
          description: 'The attempt UUID',
        },
        summary: {
          type: 'string',
          description:
            'Brief summary of candidate response in ≤2 bullets, e.g., "- Structured TAM approach\n- Missed units in final calc"',
        },
        tags: {
          type: 'array',
          description:
            'Evaluation tags from the evaluation_focus, e.g., ["good_structure", "missed_units"]',
          items: {
            type: 'string',
          },
        },
      },
      required: ['attemptId', 'summary', 'tags'],
    },
  },
]

// ============================================================================
// Compact Tool Handler
// ============================================================================

/**
 * Handle tool calls for compact CaseCard/LineCard structure
 */
export async function handleCompactTool(
  toolName: string,
  toolArgs: Record<string, any>
): Promise<any> {
  // Map tool names to API endpoints
  const toolMap: Record<string, string> = {
    'get_next_line': '/api/voice-tools-compact/get_next_line',
    'calc_basic': '/api/voice-tools-compact/calc_basic',
    'reveal_hint': '/api/voice-tools-compact/reveal_hint',
    'record_turn': '/api/voice-tools-compact/record_turn',
  }

  const endpoint = toolMap[toolName]
  if (!endpoint) {
    throw new Error(`Unknown tool: ${toolName}`)
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(toolArgs),
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || `Tool call failed: ${toolName}`)
  }

  return response.json()
}

// ============================================================================
// Type Definitions
// ============================================================================

export interface CaseCard {
  case_id: string
  case_type: string
  title: string
  objective: string
  vars: Record<string, number>
  section: string
  line_id: string
  evaluation_focus: string[]
}

export interface LineCard {
  speaker: 'interviewer' | 'candidate'
  text: string
  expects_response: boolean
  response_type?:
    | 'confirmation'
    | 'framework'
    | 'questions'
    | 'estimate'
    | 'calculation'
    | 'synthesis'
  next_preview?: string[]
}

export interface GetNextLineResponse {
  caseCard: CaseCard
  lineCard: LineCard
  completed: boolean // true if interview is complete
}

export interface RecordTurnResponse {
  success: boolean
  turn_recorded: boolean
}

export interface CalcBasicResponse {
  result: number
}

export interface RevealHintResponse {
  hint: string
  tier: number
}
