"use client"

import React, { useEffect, useRef, useState } from "react"

const CASE_ID = "00000000-0000-0000-0000-000000000000"
const SECTION = "opening"
const SNIPPET = "Margins down. Find drivers."

type Status = "idle" | "asking" | "speaking" | "listening" | "analyzing"

// Case phase progression for demo (expanded to match standard consulting case structure)
type Phase = 
  | "greeting" 
  | "case_prompt" 
  | "clarification" 
  | "framework" 
  | "exploration" 
  | "quant_check" 
  | "creative_check" 
  | "synthesis" 
  | "closing" 
  | "done"

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
  let interimAccum = ""
  let lastResultTs = 0

  const MAX_DURATION_MS = 45000 // allow up to 45s continuous speech
  const SILENCE_MS = 5000 // if no results for 5s, end early
  let durationTimer: any = null
  let silenceTimer: any = null

  function start(onFinal: (text: string) => void) {
    if (!SR) {
      console.warn("[elevenlabs-demo] SpeechRecognition not available on window")
      return
    }
  finalText = ""
  interimAccum = ""
    rec = new SR()
    rec.lang = "en-US"
    rec.interimResults = true
  // continuous true helps capture longer utterances
  rec.continuous = true

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
        interimAccum = interim // overwrite with latest interim snapshot
      }
      if (finalText) {
        console.log("[elevenlabs-demo] STT final so far:", finalText)
      }
      lastResultTs = Date.now()
      // reset silence timer
      if (silenceTimer) clearTimeout(silenceTimer)
      silenceTimer = setTimeout(() => {
        console.log("[elevenlabs-demo] STT silence timeout reached, stopping")
        try { rec.stop() } catch {}
      }, SILENCE_MS)
    }

    rec.onerror = (err: any) => {
      console.warn("[elevenlabs-demo] STT onerror:", err?.error || err?.message || "unknown error")
      // Don't throw, just let onend handle cleanup
    }

    rec.onend = () => {
      if (durationTimer) clearTimeout(durationTimer)
      if (silenceTimer) clearTimeout(silenceTimer)
      const cleanedFinal = finalText.trim()
      const fallback = interimAccum.trim()
      const out = cleanedFinal || fallback
      console.log("[elevenlabs-demo] STT onend output:", out)
      onFinal(out)
    }

    try {
      rec.start()
      lastResultTs = Date.now()
      // duration hard stop
      durationTimer = setTimeout(() => {
        console.log("[elevenlabs-demo] STT max duration reached, stopping")
        try { rec.stop() } catch {}
      }, MAX_DURATION_MS)
      // initial silence timer
      silenceTimer = setTimeout(() => {
        console.log("[elevenlabs-demo] STT initial silence timeout reached, stopping")
        try { rec.stop() } catch {}
      }, SILENCE_MS)
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
    if (durationTimer) clearTimeout(durationTimer)
    if (silenceTimer) clearTimeout(silenceTimer)
  }

  return { start, stop, isSupported }
}

export default function ElevenLabsDemoPage() {
  const [useElevenLabs, setUseElevenLabs] = useState(false)
  const [status, setStatus] = useState<Status>("idle")
  const [lastQuestion, setLastQuestion] = useState("")
  const [lastTranscript, setLastTranscript] = useState("")
  const [lastNextActionType, setLastNextActionType] = useState("")
  const [lastNextActionNudge, setLastNextActionNudge] = useState<string | null>(null)
  const [lastAnalyzerReady, setLastAnalyzerReady] = useState<string | null>(null)
  const [turnCount, setTurnCount] = useState(0)
  const [phase, setPhase] = useState<Phase>("greeting")
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

  async function getInterviewerQuestion(opts?: { nudge?: string | null; phase?: Phase; lastQuestion?: string; lastTranscript?: string | null; analyzerReady?: string | null; nextActionType?: string | null }): Promise<string> {
    const resp = await fetch("/api/voice-tools/interviewer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        demo: true,
        caseId: CASE_ID,
        section: SECTION,
        // omit snippet to avoid bias; server provides background when needed
        nudge: opts?.nudge ?? undefined,
        phase: opts?.phase ?? undefined,
        last_question: opts?.lastQuestion ?? undefined,
        last_transcript: opts?.lastTranscript ?? undefined,
        analyzer_readiness: opts?.analyzerReady ?? undefined,
        next_action_type: opts?.nextActionType ?? undefined,
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
    const next_action = data?.next_action || { type: "continue" }
    const analyzer_json = data?.analyzer_json || undefined
    return { next_action, analyzer_json }
  }

  type TurnResult = {
    question: string
    transcript: string
    next_action: any
    analyzer_json?: any
  }

  // Helper to get human-friendly phase label
  function getPhaseLabel(p: Phase): string {
    const labels: Record<Phase, string> = {
      greeting: "Greeting",
      case_prompt: "Case Prompt",
      clarification: "Clarification",
      framework: "Framework",
      exploration: "Exploration",
      quant_check: "Quantitative Check",
      creative_check: "Creative Check",
      synthesis: "Synthesis",
      closing: "Closing",
      done: "Complete"
    }
    return labels[p] || p
  }

  // Helper to get phase hint (optional guidance for candidate)
  function getPhaseHint(p: Phase): string | null {
    const hints: Partial<Record<Phase, string>> = {
      clarification: "Ask clarifying questions about the case",
      framework: "Outline your structure or framework",
      exploration: "Dive into your chosen branch of analysis",
      quant_check: "Work through the quantitative problem",
      creative_check: "Handle the curveball or edge case",
      synthesis: "Synthesize findings into a recommendation"
    }
    return hints[p] || null
  }

  // Pure helper to compute next phase based on analyzer signals
  function computeNextPhase(
    current: Phase,
    next_action: any | null | undefined,
    analyzer_json: any | null | undefined
  ): Phase {
    if (current === "done") return "done"
    
    const readiness: string | undefined = analyzer_json?.readiness
    const sectionEnd: boolean = analyzer_json?.section_end === true
    const actionType: string | undefined = next_action?.type

    // greeting → case_prompt (automatic after first turn)
    if (current === "greeting") return "case_prompt"
    
    // case_prompt → clarification (automatic after presenting case)
    if (current === "case_prompt") return "clarification"
    
    // clarification → framework (when candidate ready to structure)
    if (current === "clarification" && readiness === "good_to_progress") return "framework"
    
    // framework → exploration (when framework established)
    if (current === "framework" && readiness === "good_to_progress") return "exploration"
    
    // exploration → quant_check (on explicit signal or after sufficient exploration)
    if (current === "exploration") {
      if (actionType === "insert_quant_check") return "quant_check"
      if (readiness === "good_to_progress") return "quant_check" // fallback heuristic
    }
    
    // quant_check → creative_check (after quantitative work complete)
    if (current === "quant_check" && readiness === "good_to_progress") return "creative_check"
    
    // creative_check → synthesis (on explicit signal)
    if (current === "creative_check") {
      if (actionType === "ready_to_synthesize" || readiness === "good_to_progress") return "synthesis"
    }
    
    // synthesis → closing (when synthesis complete or scoring triggered)
    if (current === "synthesis" && (sectionEnd || actionType === "score" || actionType === "final_score")) {
      return "closing"
    }
    
    // closing → done (after final remarks)
    if (current === "closing" && (sectionEnd || actionType === "score" || actionType === "final_score")) {
      return "done"
    }
    
    // Never go backwards, stay in current phase if no transition criteria met
    return current
  }

  async function runTurn(adapter: VoiceAdapter, nudge?: string | null): Promise<TurnResult> {
    // 1) asking
    setStatus("asking")
  const question = await getInterviewerQuestion({ nudge, phase, lastQuestion, lastTranscript, analyzerReady: lastAnalyzerReady, nextActionType: lastNextActionType })

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
        next_action: { type: "continue" },
      }
    }

    // 5) analyzing
    setStatus("analyzing")
    const { next_action, analyzer_json } = await analyzeAnswer(transcript)

    // 6) back to idle
    setStatus("idle")

    return {
      question,
      transcript,
      next_action,
      analyzer_json,
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
          console.log("[elevenlabs-demo] STT final callback (aggregated):", text)
          resolve(text)
        })
        // fallback hard timeout beyond internal max duration (slightly bigger than STT's own)
        const HARD_TIMEOUT_MS = 47000
        setTimeout(() => {
          if (resolved) return
          console.log("[elevenlabs-demo] HARD timeout reached, forcing stop")
          stt.stop()
          resolved = true
          resolve("")
        }, HARD_TIMEOUT_MS)
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

  // Helper to update UI state from TurnResult
  function updateUIFromResult(result: TurnResult) {
    setLastQuestion(result.question)
    setLastTranscript(result.transcript || "(none)")
    setLastNextActionType(result.next_action?.type || "(none)")
    setLastNextActionNudge(result.next_action?.nudge || null)
    setLastAnalyzerReady(result.analyzer_json?.readiness || null)
  }

  // Existing "one button" flow (refactored to use runTurn)
  async function runSingleTurn() {
    const adapter: VoiceAdapter = useElevenLabs
      ? elevenLabsAdapter
      : textOnlyAdapter

    try {
      setTurnCount(1)
      const result = await runTurn(adapter)
      updateUIFromResult(result)
      setPhase((prev) => computeNextPhase(prev, result.next_action, result.analyzer_json))
    } catch (err) {
      console.warn("[elevenlabs-demo] runSingleTurn error:", err)
    } finally {
      // Ensure we always return to idle even on error
      setStatus("idle")
    }
  }

  // Multi-turn loop
  async function runLoop(maxTurns = 4) {
    const adapter: VoiceAdapter = useElevenLabs
      ? elevenLabsAdapter
      : textOnlyAdapter
    
    let nudge: string | null = null
    let currentPhase = phase
    setTurnCount(0)

    for (let i = 0; i < maxTurns; i++) {
      setTurnCount(i + 1)
  const result = await runTurn(adapter, nudge)
      updateUIFromResult(result)
      const nextPhase = computeNextPhase(currentPhase, result.next_action, result.analyzer_json)
      setPhase(nextPhase)
      currentPhase = nextPhase

      // Check for empty transcript (user didn't speak)
      if (!result.transcript || result.transcript.trim().length === 0) {
        console.log("[elevenlabs-demo] Empty transcript, stopping loop")
        break
      }

  const nextType = result.next_action?.type
  const nextNudge = result.next_action?.nudge ?? null
  // Always carry forward nudge from latest turn (even if not ask_more) so interviewer can adapt
  nudge = nextNudge
      const sectionEnd = result.analyzer_json?.section_end === true

      // Stop if analyzer says section is done
      if (sectionEnd) {
        console.log("[elevenlabs-demo] section_end=true, stopping loop")
        break
      }

      // Stop if analyzer wants to score
      if (nextType === "score" || nextType === "final_score") {
        console.log("[elevenlabs-demo] next_action.type is score, stopping loop")
        break
      }

      // Continue with nudge if ask_more
      if (nextType === "ask_more" || nextType === "ask_more_question") {
        console.log("[elevenlabs-demo] ask_more continuing with nudge:", nudge)
      } else if (nextType === "continue") {
        // keep nudge cleared if action explicitly continue without guidance
        if (!nextNudge) nudge = null
      }

      // Stop if phase reached done
      if (currentPhase === "done") {
        console.log("[elevenlabs-demo] Phase done, stopping loop")
        break
      }
    }

    setStatus("idle")
  }

  // New: Ask only (no auto listen)
  async function askOnly() {
    const adapter: VoiceAdapter = useElevenLabs
      ? elevenLabsAdapter
      : textOnlyAdapter

    setStatus("asking")
  const question = await getInterviewerQuestion({ phase, lastQuestion })
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

    try {
      setStatus("listening")
      const transcript = await adapter.listen()

      if (!transcript || transcript.trim().length === 0) {
        console.warn("[elevenlabs-demo] Empty transcript in answerOnly, skipping analyzer")
        setLastTranscript("(none)")
        return
      }

      setStatus("analyzing")
      const { next_action, analyzer_json } = await analyzeAnswer(transcript)

      // Reuse existing UI updater with a synthetic TurnResult to preserve lastQuestion
      updateUIFromResult({
        question: lastQuestion,
        transcript,
        next_action,
        analyzer_json,
      })

      // Increment turn count (do not reset)
      setTurnCount((prev) => (prev ? prev + 1 : 1))
      setPhase((prev) => computeNextPhase(prev, next_action, analyzer_json))
    } catch (err) {
      console.warn("[elevenlabs-demo] answerOnly error:", err)
    } finally {
      setStatus("idle")
    }
  }

  // Debug loop handler to de-emphasize auto mode
  async function handleRunLoop() {
    try {
      setStatus("asking")
      setTurnCount(0)
      await runLoop(4)
    } catch (err) {
      console.warn("[elevenlabs-demo] runLoop error:", err)
    }
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
        {turnCount > 0 && (
          <div style={{ marginTop: 4 }}><strong>Turn:</strong> {turnCount}</div>
        )}
        <div style={{ marginTop: 4 }}><strong>Phase:</strong> {getPhaseLabel(phase)}</div>
        {getPhaseHint(phase) && (
          <div style={{ marginTop: 4, fontSize: 14, color: "#555", fontStyle: "italic" }}>
            {getPhaseHint(phase)}
          </div>
        )}
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

      {/* Debug section to de-emphasize auto loop */}
      <div style={{ marginTop: 8, opacity: 0.8 }}>
        <button
          onClick={handleRunLoop}
          disabled={status !== "idle"}
          style={{
            padding: "6px 12px",
            fontSize: 13,
            cursor: status !== "idle" ? "not-allowed" : "pointer",
            opacity: status !== "idle" ? 0.6 : 1,
          }}
        >
          Debug: Run loop (up to 4 turns)
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

        <div style={{ marginBottom: 12 }}>
          <strong>Last next_action:</strong>
          <div style={{ marginTop: 4, color: "#666", fontFamily: "monospace", fontSize: 13 }}>
            <div>type: {lastNextActionType || "(none)"}</div>
            <div>nudge: {lastNextActionNudge || "(none)"}</div>
          </div>
        </div>

        <div>
          <strong>Analyzer readiness:</strong>
          <div style={{ marginTop: 4, color: "#666", fontFamily: "monospace", fontSize: 13 }}>
            {lastAnalyzerReady || "(unknown)"}
          </div>
        </div>
      </div>
    </div>
  )
}
