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
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,
          create_response: false,
          interrupt_response: true
        },
        input_audio_transcription: { model: "gpt-4o-mini-transcribe" },
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
