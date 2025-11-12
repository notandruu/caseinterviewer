import { NextRequest, NextResponse } from 'next/server'

// Environment variables (set in .env.local):
// ELEVENLABS_API_KEY - your ElevenLabs API key

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY

  // Placeholder mode when no API key
  if (!apiKey) {
    console.warn('[stt-elevenlabs] No ELEVENLABS_API_KEY found, returning placeholder transcript')
    return NextResponse.json({
      transcript: 'Placeholder transcript (no ElevenLabs API key yet)',
    })
  }

  try {
    // TODO: Real ElevenLabs STT API call
    // Parse audio from request body
    // POST to ElevenLabs STT endpoint
    // Return { transcript: string }

    // For now, return placeholder until API key is configured and STT implementation is complete
    console.log('[stt-elevenlabs] API key present but real STT call not yet implemented')
    return NextResponse.json({
      transcript: 'Placeholder transcript (implementation pending)',
    })
  } catch (error: any) {
    console.error('[stt-elevenlabs] Error:', error)
    return NextResponse.json(
      { error: 'stt_failed', detail: error.message, transcript: '' },
      { status: 500 }
    )
  }
}
