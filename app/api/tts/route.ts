import { NextRequest } from "next/server";

const ELEVEN = process.env.ELEVENLABS_API_KEY;

export async function POST(req: NextRequest) {
  if (!ELEVEN) {
    return new Response(JSON.stringify({ error: "ELEVENLABS_API_KEY not set" }), { status: 500 });
  }

  const { text, voice_id, model_id } = await req.json();
  const vid = voice_id || "pNInz6obpgDQGcFmaJgB"; // Adam
  const mid = model_id || "eleven_turbo_v2";

  const r = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${vid}`, {
    method: "POST",
    headers: {
      "xi-api-key": ELEVEN,
      "accept": "audio/mpeg",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      text,
      model_id: mid,
      voice_settings: { stability: 0.5, similarity_boost: 0.75 },
    }),
  });

  if (!r.ok) {
    const err = await r.text();
    return new Response(err, { status: r.status, headers: { "content-type": "application/json" } });
  }

  const buf = Buffer.from(await r.arrayBuffer());
  return new Response(buf, { status: 200, headers: { "content-type": "audio/mpeg" } });
}