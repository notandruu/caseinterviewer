/**
 * API Tool: calc_basic (Compact Structure)
 * Safely evaluate arithmetic expressions
 */

import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { expr } = body

    if (!expr || typeof expr !== 'string') {
      return NextResponse.json({ error: 'expr is required and must be a string' }, { status: 400 })
    }

    // Sanitize expression - allow only numbers, operators, parentheses, and decimal points
    const sanitized = expr.replace(/[^0-9+\-*/().\s]/g, '')

    if (sanitized !== expr) {
      return NextResponse.json(
        { error: 'Invalid characters in expression. Only numbers and +, -, *, /, (, ), . are allowed.' },
        { status: 400 }
      )
    }

    // Evaluate safely using Function constructor (safer than eval)
    try {
      const result = new Function(`return ${sanitized}`)()

      if (typeof result !== 'number' || !isFinite(result)) {
        return NextResponse.json({ error: 'Expression did not evaluate to a valid number' }, { status: 400 })
      }

      return NextResponse.json({ result })
    } catch (evalError) {
      return NextResponse.json({ error: 'Invalid arithmetic expression' }, { status: 400 })
    }
  } catch (error) {
    console.error('[calc_basic] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
