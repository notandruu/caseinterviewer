"use client"

import React, { useEffect, useRef, useState } from "react"

const CASE_ID = "00000000-0000-0000-0000-000000000000"
const SECTION = "opening"
const SNIPPET = "Margins down. Find drivers."

type Status = "idle" | "asking" | "speaking" | "listening" | "analyzing"

type VoiceAdapter = {
  speak: (text: string) => Promise<void>
  listen: () => Promise<string>
}

/** Minimal browser STT wrapper using Web Speech API */
type STT = {
  start: (onFinal: (text: string) => void) => void
  stop: () => void
  isSupported: boolean
}

function makeBrowserSTT(): STT {
  const SR: any = (typeof window !== "undefined")
    ? ((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition)
    : null
  const isSupported = !!SR
  let rec: any = null
  let finalText = ""

  function start(onFinal: (text: string) => void) {
    if (!SR) {
      console.warn("[elevenlabs-demo] SpeechRecognition not available on window")
      return
    }
    finalText = ""
    rec = new SR()
    rec.lang = "en-US"
    rec.interimResults = true
    rec.continuous = false

    console.log("[elevenlabs-demo] STT.start called")

    ;(rec as any).onstart = () => {
      console.log("[elevenlabs-demo] STT onstart")
    }

    rec.onresult = (e: any) => {
      console.log("[elevenlabs-demo] STT onresult raw:", e)
      let interim = ""
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript
        if (e.results[i].isFinal) {
          finalText += t
        } else {
          interim += t
        }
      }
      if (interim) {
        console.log("[elevenlabs-demo] STT interim:", interim)
      }
      if (finalText) {
        console.log("[elevenlabs-demo] STT final so far:", finalText)
      }
    }

    rec.onerror = (err: any) => {
      console.error("[elevenlabs-demo] STT onerror:", err)
    }

    rec.onend = () => {
      console.log("[elevenlabs-demo] STT onend, finalText:", finalText.trim())
      onFinal(finalText.trim())
    }

    try {
      rec.start()
    } catch (err) {
      console.error("[elevenlabs-demo] STT start threw:", err)
    }
  }

  function stop() {
    try {
      console.log("[elevenlabs-demo] STT.stop called")
      rec?.stop()
    } catch (e) {
      console.warn("[elevenlabs-demo] STT.stop error:", e)
    }
    rec = null
  }

  return { start, stop, isSupported }
}

export default function ElevenLabsDemoPage() {
  const [useElevenLabs, setUseElevenLabs] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const [lastQuestion, setLastQuestion] = useState("")
  const [lastTranscript, setLastTranscript] = useState("")
  const [lastNextAction, setLastNextAction] = useState("")
  const sttRef = useRef<STT | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && !sttRef.current) {
      sttRef.current = makeBrowserSTT()
      if (!sttRef.current.isSupported) {
        console.warn("[elevenlabs-demo] Browser STT not supported in this browser")
      } else {
        console.log("[elevenlabs-demo] Browser STT is supported")
      }
    }
  }, [])

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
    return { nextAction, analyzerJson: data?.analyzer_json }
  }

  type TurnResult = {
    question: string
    transcript: string
    nextAction: any
    analyzerJson?: any
  }

  async function runTurn(adapter: VoiceAdapter, nudge?: string | null): Promise<TurnResult> {
    // 1) asking
    setStatus("asking")
    const question = await getInterviewerQuestion(nudge)

    // 2) speaking
    setStatus("speaking")
    await adapter.speak(question)

    // 3) listening
    setStatus("listening")
    const transcript = await adapter.listen()

    // 4) if empty transcript, return early
    if (!transcript || transcript.trim().length === 0) {
      console.warn("[elevenlabs-demo] Empty transcript in runTurn, skipping analyzer")
      setStatus("idle")
      return {
        question,
        transcript: "",
        nextAction: { type: "continue" },
      }
    }

    // 5) analyzing
    setStatus("analyzing")
    const { nextAction, analyzerJson } = await analyzeAnswer(transcript)

    // 6) back to idle
    setStatus("idle")

    return {
      question,
      transcript,
      nextAction,
      analyzerJson,
    }
  }

  // ElevenLabs TTS + Browser STT adapter
  const elevenLabsAdapter: VoiceAdapter = {
    speak: async (text: string) => {
      console.log("[elevenlabs-demo] TTS speak:", text)
      const resp = await fetch(`/api/voice/tts-elevenlabs?text=${encodeURIComponent(text)}`)
      const blob = await resp.blob()
      const url = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.crossOrigin = "anonymous"
      try {
        await audio.play()
        console.log("[elevenlabs-demo] TTS audio.play OK")
      } catch (err) {
        console.warn("[elevenlabs-demo] Autoplay blocked. Click anywhere then try again.", err)
      }
    },
    listen: async () => {
      const stt = sttRef.current
      if (!stt?.isSupported) {
        console.warn("[elevenlabs-demo] Browser STT not supported. Returning empty transcript.")
        setLastTranscript("(no STT support)")
        return ""
      }

      console.log("[elevenlabs-demo] listen() starting STT")
      const transcript = await new Promise<string>((resolve) => {
        let resolved = false
        stt.start((text) => {
          if (resolved) return
          resolved = true
          console.log("[elevenlabs-demo] STT final callback:", text)
          resolve(text)
        })
        // safety stop after 10 seconds to be generous
        setTimeout(() => {
          if (resolved) return
          console.log("[elevenlabs-demo] STT timeout reached, stopping")
          stt.stop()
          resolved = true
          resolve("")
        }, 10000)
      })
      setLastTranscript(transcript || "(none)")
      return transcript
    },
  }

  // Text-only adapter for full offline testing
  const textOnlyAdapter: VoiceAdapter = {
    speak: async (text: string) => {
      console.log("[text-only speak]", text)
    },
    listen: async () => {
      const placeholder = "Placeholder answer while testing"
      console.log("[text-only listen] returning placeholder transcript")
      setLastTranscript(placeholder)
      return placeholder
    },
  }

  // Existing "one button" flow (refactored to use runTurn)
  async function runSingleTurn() {
    const adapter: VoiceAdapter = useElevenLabs
      ? elevenLabsAdapter
      : textOnlyAdapter

    const result = await runTurn(adapter)

    // Update UI state
    setLastQuestion(result.question)
    setLastTranscript(result.transcript || "(none)")
    const summary = `${result.nextAction.type}${result.nextAction.nudge ? ` (nudge: ${result.nextAction.nudge})` : ""}`
    setLastNextAction(summary)
  }

  // New: Ask only (no auto listen)
  async function askOnly() {
    const adapter: VoiceAdapter = useElevenLabs
      ? elevenLabsAdapter
      : textOnlyAdapter

    setStatus("asking")
    const question = await getInterviewerQuestion()
    setLastQuestion(question)

    setStatus("speaking")
    await adapter.speak(question)

    // After this, you click "Answer with mic" yourself
    setStatus("idle")
  }

  // New: Answer only (listen + analyze)
  async function answerOnly() {
    const adapter: VoiceAdapter = useElevenLabs
      ? elevenLabsAdapter
      : textOnlyAdapter

    setStatus("listening")
    const transcript = await adapter.listen()

    if (!transcript || transcript.trim().length === 0) {
      console.warn("[elevenlabs-demo] Empty transcript in answerOnly, skipping analyzer")
      setStatus("idle")
      return
    }

    setStatus("analyzing")
    const { nextAction } = await analyzeAnswer(transcript)
    const summary = `${nextAction.type}${nextAction.nudge ? ` (nudge: ${nextAction.nudge})` : ""}`
    setLastNextAction(summary)

    setStatus("idle")
  }

  // New: pure mic test, does not hit interviewer/analyzer at all
  async function testMicSTT() {
    const stt = sttRef.current
    if (!stt?.isSupported) {
      alert("Browser STT not supported. Use Chrome desktop and allow mic access.")
      return
    }
    setStatus("listening")
    console.log("[elevenlabs-demo] testMicSTT: starting STT")
    const transcript = await new Promise<string>((resolve) => {
      let resolved = false
      stt.start((text) => {
        if (resolved) return
        resolved = true
        console.log("[elevenlabs-demo] testMicSTT final:", text)
        resolve(text)
      })
      setTimeout(() => {
        if (resolved) return
        console.log("[elevenlabs-demo] testMicSTT timeout, stopping")
        stt.stop()
        resolved = true
        resolve("")
      }, 10000)
    })
    setLastTranscript(transcript || "(none)")
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
          Use ElevenLabs TTS + Browser STT
        </label>
        {!sttRef.current?.isSupported && (
          <div style={{ marginTop: 8, color: "#b00" }}>
            Browser STT not supported here. Use Chrome desktop and allow mic permission.
          </div>
        )}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
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
          Ask once (auto)
        </button>

        <button
          onClick={askOnly}
          disabled={status !== "idle"}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            cursor: status !== "idle" ? "not-allowed" : "pointer",
            opacity: status !== "idle" ? 0.6 : 1,
          }}
        >
          Ask only
        </button>

        <button
          onClick={answerOnly}
          disabled={status !== "idle"}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            cursor: status !== "idle" ? "not-allowed" : "pointer",
            opacity: status !== "idle" ? 0.6 : 1,
          }}
        >
          Answer with mic
        </button>

        <button
          onClick={testMicSTT}
          disabled={status !== "idle"}
          style={{
            padding: "8px 16px",
            fontSize: 14,
            cursor: status !== "idle" ? "not-allowed" : "pointer",
            opacity: status !== "idle" ? 0.6 : 1,
          }}
        >
          Test mic STT
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
