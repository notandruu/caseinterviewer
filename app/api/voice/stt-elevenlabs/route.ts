import { NextRequest } from 'next/server'

export async function POST(req: NextRequest) {
  const apiKey = process.env.ELEVENLABS_API_KEY
  if (!apiKey) return new Response(JSON.stringify({ error: 'Missing ELEVENLABS_API_KEY' }), { status: 500 })

  // For later: expect raw audio bytes or multipart form with file
  // const arrayBuf = await req.arrayBuffer()
  // const audioBlob = new Blob([arrayBuf], { type: 'audio/webm' }) // or audio/mpeg depending on recorder

  // Placeholder so the loop runs
  return new Response(JSON.stringify({ transcript: 'Placeholder transcript (browser STT active)' }), {
    headers: { 'content-type': 'application/json' }
  })
}
