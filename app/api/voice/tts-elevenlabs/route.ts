import { NextRequest, NextResponse } from 'next/server'

// Environment variables (set in .env.local):
// ELEVENLABS_API_KEY - your ElevenLabs API key
// ELEVENLABS_VOICE_ID - voice ID to use (optional, defaults to Adam)

export async function GET(req: NextRequest) {
  const url = new URL(req.url)
  const text = url.searchParams.get('text') || 'Hello from ElevenLabs placeholder'

  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID || 'pNInz6obpgDQGcFmaJgB' // Adam

  // Placeholder mode when no API key
  if (!apiKey) {
    console.warn('[tts-elevenlabs] No ELEVENLABS_API_KEY found, returning placeholder')
    const emptyAudio = Buffer.from([])
    return new NextResponse(emptyAudio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Debug': 'placeholder-no-api-key',
      },
    })
  }

  try {
    // TODO: Real ElevenLabs API call
    // POST https://api.elevenlabs.io/v1/text-to-speech/{voiceId}
    // Headers: xi-api-key, Content-Type: application/json
    // Body: { text, model_id: "eleven_turbo_v2", voice_settings: {...} }
    // Return audio/mpeg response

    // For now, return placeholder until API key is configured
    console.log('[tts-elevenlabs] API key present but real call not yet implemented')
    const emptyAudio = Buffer.from([])
    return new NextResponse(emptyAudio, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'X-Debug': 'placeholder-implementation-pending',
      },
    })
  } catch (error: any) {
    console.error('[tts-elevenlabs] Error:', error)
    return NextResponse.json(
      { error: 'tts_failed', detail: error.message },
      { status: 500 }
    )
  }
}
