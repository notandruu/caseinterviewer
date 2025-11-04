import { NextResponse } from 'next/server'

export async function GET() {
  // Use Echo's API key to enable billing and usage tracking
  const echoApiKey = process.env.ECHO_API_KEY

  if (!echoApiKey) {
    return NextResponse.json(
      { error: 'Echo API key not configured' },
      { status: 500 }
    )
  }

  try {
    // Route through Echo's proxy to enable automatic billing
    const response = await fetch('https://api.echo.dev/v1/openai/realtime/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${echoApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-realtime-preview-2024-12-17',
        voice: 'verse',
      }),
    })

    if (!response.ok) {
      const error = await response.text()
      console.error('Echo API error:', error)
      return NextResponse.json(
        { error: 'Failed to create session' },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error('Error creating realtime session:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
