"use client"

import React, { useState } from "react"

const CASE_ID = "00000000-0000-0000-0000-000000000000"
const SECTION = "opening"
const SNIPPET = "Margins down. Find drivers."

type Status = "idle" | "asking" | "speaking" | "listening" | "analyzing"

type VoiceAdapter = {
  speak: (text: string) => Promise<void>
  listen: () => Promise<string>
}

export default function ElevenLabsDemoPage() {
  const [useElevenLabs, setUseElevenLabs] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const [lastQuestion, setLastQuestion] = useState("")
  const [lastTranscript, setLastTranscript] = useState("")
  const [lastNextAction, setLastNextAction] = useState("")

  async function getInterviewerQuestion(nudge?: string | null): Promise<string> {
    const resp = await fetch("/api/voice-tools/interviewer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        demo: true,
        caseId: CASE_ID,
        section: SECTION,
        snippet: SNIPPET,
        nudge: nudge || undefined,
      }),
    })

    const data = await resp.json().catch(() => ({}))
    const question = data?.question || "Please respond briefly."
    setLastQuestion(question)
    return question
  }

  async function analyzeAnswer(answer: string) {
    const idempotencyKey = Math.random().toString(36).slice(2, 12)
    const resp = await fetch("/api/voice-tools/analyze", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        demo: true,
        caseId: CASE_ID,
        section: SECTION,
        answer,
      }),
    })

    const data = await resp.json().catch(() => ({}))
    const nextAction = data?.next_action || { type: "continue" }
    const summary = `${nextAction.type}${nextAction.nudge ? ` (nudge: ${nextAction.nudge})` : ""}`
    setLastNextAction(summary)
    return nextAction
  }

  const elevenLabsAdapter: VoiceAdapter = {
    speak: async (text: string) => {
      const resp = await fetch(
        `/api/voice/tts-elevenlabs?text=${encodeURIComponent(text)}`
      )
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      await audio.play()
    },
    listen: async () => {
      const resp = await fetch("/api/voice/stt-elevenlabs", { method: "POST" })
      const data = await resp.json()
      const transcript = data?.transcript || ""
      setLastTranscript(transcript)
      return transcript
    },
  }

  const textOnlyAdapter: VoiceAdapter = {
    speak: async (text: string) => {
      console.log("[text-only speak]", text)
    },
    listen: async () => {
      const placeholder = "Placeholder answer while testing"
      setLastTranscript(placeholder)
      return placeholder
    },
  }

  async function runSingleTurn() {
    setStatus("asking")
    const question = await getInterviewerQuestion()

    const adapter: VoiceAdapter = useElevenLabs
      ? elevenLabsAdapter
      : textOnlyAdapter

    setStatus("speaking")
    await adapter.speak(question)

    setStatus("listening")
    const transcript = await adapter.listen()

    if (!transcript || transcript.trim().length === 0) {
      console.warn("[elevenlabs-demo] Empty transcript, skipping analyzer")
      setStatus("idle")
      return
    }

    setStatus("analyzing")
    await analyzeAnswer(transcript)

    setStatus("idle")
  }

  return (
    <div style={{ padding: 20, maxWidth: 800 }}>
      <h2>ElevenLabs Voice Demo</h2>

      <div style={{ marginTop: 16, padding: 12, background: "#f5f5f5", borderRadius: 4 }}>
        <div><strong>Status:</strong> {status}</div>
      </div>

      <div style={{ marginTop: 16 }}>
        <label style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <input
            type="checkbox"
            checked={useElevenLabs}
            onChange={(e) => setUseElevenLabs(e.target.checked)}
          />
          Use ElevenLabs
        </label>
      </div>

      <div style={{ marginTop: 16 }}>
        <button
          onClick={runSingleTurn}
          disabled={status !== "idle"}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            cursor: status !== "idle" ? "not-allowed" : "pointer",
            opacity: status !== "idle" ? 0.6 : 1,
          }}
        >
          Ask once
        </button>
      </div>

      <div style={{ marginTop: 24 }}>
        <div style={{ marginBottom: 12 }}>
          <strong>Last question:</strong>
          <div style={{ marginTop: 4, color: "#666", fontFamily: "monospace", fontSize: 13 }}>
            {lastQuestion || "(none)"}
          </div>
        </div>

        <div style={{ marginBottom: 12 }}>
          <strong>Last transcript:</strong>
          <div style={{ marginTop: 4, color: "#666", fontFamily: "monospace", fontSize: 13 }}>
            {lastTranscript || "(none)"}
          </div>
        </div>

        <div>
          <strong>Last next_action:</strong>
          <div style={{ marginTop: 4, color: "#666", fontFamily: "monospace", fontSize: 13 }}>
            {lastNextAction || "(none)"}
          </div>
        </div>
      </div>
    </div>
  )
}
