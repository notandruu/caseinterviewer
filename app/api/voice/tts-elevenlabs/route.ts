import { NextRequest } from 'next/server'

export async function GET(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  const voiceId = process.env.ELEVENLABS_VOICE_ID
  const modelId = process.env.ELEVENLABS_TTS_MODEL || 'eleven_multilingual_v2'

  if (!apiKey || !voiceId) {
    return new Response(JSON.stringify({ error: 'Missing ELEVENLABS_API_KEY or ELEVENLABS_VOICE_ID' }), { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const text = searchParams.get('text') || 'Audio check'

  // ElevenLabs streaming TTS endpoint
  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/stream?optimize_streaming_latency=0`

  const r = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'content-type': 'application/json',
      'accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text,
      model_id: modelId,
      // You can tweak these if desired
      voice_settings: { stability: 0.5, similarity_boost: 0.75 }
    })
  })

  if (!r.ok) {
    const errTxt = await r.text().catch(() => '')
    return new Response(JSON.stringify({ error: 'TTS failed', details: errTxt }), { status: 500 })
  }

  // Stream audio back to the browser
  return new Response(r.body, {
    status: 200,
    headers: {
      'content-type': 'audio/mpeg',
      'cache-control': 'no-store'
    }
  })
}