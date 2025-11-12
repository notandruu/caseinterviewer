import { NextResponse } from "next/server";

export async function GET() {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY" },
        { status: 500 }
      );
    }

    const resp = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
        "OpenAI-Beta": "realtime=v1"
      },
      body: JSON.stringify({
        model: "gpt-4o-realtime-preview-2024-12-17",
        voice: "verse",
        input_audio_transcription: { model: "gpt-4o-mini-transcribe" },
        turn_detection: {
          type: "server_vad",
          create_response: true,
          interrupt_response: true
        },
        temperature: 0.6,
        max_response_output_tokens: 128
      })
    });

    const data = await resp.json();
    if (!data?.client_secret?.value) {
      return NextResponse.json(
        { error: "Invalid session response", raw: data },
        { status: 500 }
      );
    }

    return NextResponse.json({
      client_secret: { value: data.client_secret.value }
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message ?? "session error" },
      { status: 500 }
    );
  }
}
