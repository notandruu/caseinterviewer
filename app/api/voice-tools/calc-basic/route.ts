/**
 * API Tool: calc_basic
 *
 * Safely evaluates arithmetic expressions
 * Prevents AI from hallucinating calculations by externalizing all math
 */

import { NextRequest, NextResponse } from 'next/server'
import {
  CalcBasicRequestSchema,
  validateApiRequest,
  isSafeExpression,
  sanitizeExpression,
} from '@/lib/validators/cases'

/**
 * Safe math evaluator
 * Only allows basic arithmetic operations: +, -, *, /, (), numbers, and decimals
 */
function evaluateExpression(expr: string): number {
  // Sanitize expression
  const sanitized = sanitizeExpression(expr)

  // Validate expression is safe
  if (!isSafeExpression(sanitized)) {
    throw new Error('Unsafe or invalid expression')
  }

  // Additional security: check for disallowed patterns
  const disallowedPatterns = [
    /\b(eval|function|return|while|for|if|else|switch)\b/i,
    /[;&|`${}[\]]/,
    /\.\./,
    /__/,
  ]

  for (const pattern of disallowedPatterns) {
    if (pattern.test(sanitized)) {
      throw new Error('Expression contains disallowed patterns')
    }
  }

  // Parse and evaluate safely
  try {
    // Use Function constructor with strict mode and limited scope
    // This is safer than eval() but still requires careful validation
    const fn = new Function('return (' + sanitized + ')')
    const result = fn()

    // Validate result is a finite number
    if (typeof result !== 'number' || !isFinite(result)) {
      throw new Error('Result is not a valid finite number')
    }

    return result
  } catch (error) {
    throw new Error('Failed to evaluate expression: ' + (error as Error).message)
  }
}

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json()
    const validation = validateApiRequest(CalcBasicRequestSchema, body)

    if (!validation.success) {
      return NextResponse.json(
        { error: 'Invalid request', details: validation.error.errors },
        { status: 400 }
      )
    }

    const { expr } = validation.data

    // Evaluate expression
    let result: number
    try {
      result = evaluateExpression(expr)
    } catch (error) {
      return NextResponse.json(
        {
          error: 'Calculation failed',
          details: (error as Error).message,
          expression: expr,
        },
        { status: 400 }
      )
    }

    // Round to reasonable precision (avoid floating point issues)
    const roundedResult = Math.round(result * 100000) / 100000

    // Log calculation (in production, you might want to log to attempt)
    console.log('[calc-basic]', { expr, result: roundedResult })

    return NextResponse.json({
      result: roundedResult,
      expression: expr,
    })
  } catch (error) {
    console.error('[calc-basic] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

// GET endpoint for testing (not used in production)
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams
  const expr = searchParams.get('expr')

  if (!expr) {
    return NextResponse.json(
      {
        error: 'Missing expression',
        usage: 'GET /api/voice-tools/calc-basic?expr=2+2',
      },
      { status: 400 }
    )
  }

  try {
    const result = evaluateExpression(expr)
    return NextResponse.json({ result, expression: expr })
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 }
    )
  }
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  })
}
