import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY! });

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const text = url.searchParams.get('text') || 'Testing browser audio playback';

    const speech = await client.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'verse',
      input: text,
      response_format: 'mp3',
    });

    const buf = Buffer.from(await speech.arrayBuffer());
    return new Response(buf, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'no-store',
      },
    });
  } catch (err: any) {
    console.error('TTS route error:', err);
    return new Response(
      JSON.stringify({ error: 'tts_failed', detail: String(err?.message || err) }),
      { status: 500, headers: { 'Content-Type': 'application/json' } },
    );
  }
}