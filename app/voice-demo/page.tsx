"use client"

import React, { useEffect, useRef, useState } from "react"
import { connect, RealtimeSession } from "@/lib/voice/realtime"

const CASE_ID = "8bdc791a-7077-4b9b-919b-48858a3b0bcc"
const SECTION = "opening"
const SNIPPET = "Margins down. Find drivers."

type Status = "idle" | "connecting" | "asking" | "listening" | "analyzing" | "branching"

export default function VoiceDemoPage() {
  const [sess, setSess] = useState<RealtimeSession | null>(null)
  const [status, setStatus] = useState<Status>("idle")
  const [lastQuestion, setLastQuestion] = useState<string>("")
  const [lastTranscript, setLastTranscript] = useState<string>("")
  const audioHost = useRef<HTMLDivElement | null>(null)
  const sessRef = useRef<RealtimeSession | null>(null)
  const turnInProgress = useRef(false)

  useEffect(() => {
    return () => {
      if (sessRef.current) sessRef.current.close()
    }
  }, [])

  async function getToken() {
    const resp = await fetch("/api/realtime/token")
    if (!resp.ok) {
      const error = await resp.text()
      console.error("Token fetch failed:", error)
      throw new Error("failed to fetch token")
    }
    return resp.json()
  }

  // Simple retry for 429 and transient network errors
  async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 3): Promise<Response> {
    let lastError: Error | null = null
    for (let i = 0; i < maxRetries; i++) {
      try {
        const resp = await fetch(url, options)
        if (resp.status === 429) {
          const retryAfter = resp.headers.get("Retry-After")
          const delayMs = retryAfter ? parseInt(retryAfter) * 1000 : i === 0 ? 2000 : 5000
          console.warn(`[voice-demo] 429 rate limit, retry ${i + 1}/${maxRetries} after ${delayMs}ms`)
          await new Promise((r) => setTimeout(r, delayMs))
          continue
        }
        return resp
      } catch (err) {
        lastError = err as Error
        if (i < maxRetries - 1) {
          console.warn(`[voice-demo] fetch error, retry ${i + 1}/${maxRetries}`, err)
          await new Promise((r) => setTimeout(r, 1500))
        }
      }
    }
    throw lastError || new Error("fetch failed after retries")
  }

  async function start() {
    if (status !== "idle") {
      console.warn("[voice-demo] start called but status is not idle:", status)
      return
    }
    setStatus("connecting")
    console.log("[voice-demo] starting connection...")
    try {
      const s = await connect(getToken)
      sessRef.current = s
      setSess(s)
      console.log("[voice-demo] connection established")

      // attach remote audio element into DOM
      if (audioHost.current && !audioHost.current.contains(s.remoteAudio)) {
        s.remoteAudio.controls = true
        s.remoteAudio.muted = false
        s.remoteAudio.setAttribute('playsinline', 'true')
        audioHost.current.appendChild(s.remoteAudio)
        // Trigger play to overcome autoplay restrictions
        s.remoteAudio.play().then(
          () => console.log('[voice-demo] remoteAudio.play OK'),
          err => console.warn('[voice-demo] remoteAudio.play blocked:', err)
        )
      }

      // Dump stats 3s after connect to verify audio bytes flowing
      setTimeout(() => s.dumpInboundAudioStats('post-start'), 3000)

      // kick off first turn
      await nextTurn(undefined, s)
    } catch (err) {
      console.error("[voice-demo] failed to connect", err)
      setStatus("idle")
    }
  }

  async function stop() {
    if (sessRef.current) {
      sessRef.current.close()
      sessRef.current = null
      setSess(null)
      setStatus("idle")
      setLastTranscript("")
      setLastQuestion("")
    }
  }

  async function toggleVAD(on: boolean) {
    const s = sessRef.current
    if (!s) return
    if (on) {
      console.log("[voice-demo] enabling server VAD")
      s.updateSession({
        turn_detection: {
          type: "server_vad",
          threshold: 0.5,
          prefix_padding_ms: 300,
          silence_duration_ms: 800,
          create_response: false,
          interrupt_response: true
        }
      })
    } else {
      console.log("[voice-demo] disabling VAD")
      s.updateSession({ turn_detection: { type: "none" } })
    }
  }

  async function askListen5s() {
    if (turnInProgress.current) return
    const s = sessRef.current
    if (!s) return
    turnInProgress.current = true
    try {
      setStatus("asking")
      const iq = await fetchWithRetry("/api/voice-tools/interviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: true, caseId: CASE_ID, section: SECTION, snippet: SNIPPET })
      })
      const q = await iq.json().catch(() => ({ question: "Please respond briefly." }))
      const question = q?.question ?? "Please respond briefly."
      setLastQuestion(question)
      console.log("[voice-demo] interviewer question:", question)

      // Speak, then listen for up to 5s for VAD stop, then read transcript
      s.speak(question)
      setStatus("listening")
      await s.waitForSpeechStop(5000)
      const finalText = await s.waitForFinalTranscript(5000).catch(() => "")
      setLastTranscript(finalText)
      console.log("[voice-demo] 5s window transcript:", finalText)

      if (!finalText || finalText.trim().length === 0) {
        console.warn("[voice-demo] skip analyzer due to empty transcript")
        setStatus("asking")
        return
      }

      setStatus("analyzing")
      const idk = Math.random().toString(36).slice(2)
      const an = await fetchWithRetry("/api/voice-tools/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Idempotency-Key": idk },
        body: JSON.stringify({ demo: true, caseId: CASE_ID, section: SECTION, answer: finalText })
      })
      const a = await an.json().catch(() => ({ next_action: { type: "continue" } }))
      console.log("[voice-demo] analyzer next_action:", a?.next_action)
      setStatus("branching")
    } finally {
      turnInProgress.current = false
    }
  }

  async function nextTurn(nudge?: string | null, providedSess?: RealtimeSession) {
    if (turnInProgress.current) {
      console.warn("[voice-demo] nextTurn already in progress, ignoring")
      return
    }
    turnInProgress.current = true

    try {
      const activeSess = providedSess ?? sessRef.current
      if (!activeSess) throw new Error("session not started")

      setStatus("asking")
      console.log("[voice-demo] calling interviewer...")

      const iq = await fetchWithRetry("/api/voice-tools/interviewer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ demo: true, caseId: CASE_ID, section: SECTION, snippet: SNIPPET, nudge })
      })

      let q: any = null
      try {
        q = await iq.json()
      } catch {
        console.error("[voice-demo] interviewer response not valid JSON, using fallback")
        q = { question: "Please respond briefly." }
      }

      const question = q?.question ?? "Please respond briefly."
      setLastQuestion(question)
      console.log("[voice-demo] interviewer question:", question)

      // 2) speak question
      activeSess.speak(question)
      setStatus("listening")

      // 3) wait for final transcript
      let finalText = ""
      try {
        finalText = await activeSess.waitForFinalTranscript(25000) // give first turn more time
        setLastTranscript(finalText)
        console.log("[voice-demo] transcript received:", finalText)
      } catch (err) {
        console.warn("[voice-demo] transcript timeout, got nothing")
        finalText = ""
      }

      // If empty, do not call analyzer
      if (!finalText || finalText.trim().length === 0) {
        console.warn("[voice-demo] skip analyzer due to empty transcript")
        setStatus("asking")
        turnInProgress.current = false
        return
      }

      setStatus("analyzing")
      console.log("[voice-demo] calling analyzer...")

      const idempotency = Math.random().toString(36).slice(2)
      const an = await fetchWithRetry("/api/voice-tools/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json", "X-Idempotency-Key": idempotency },
        body: JSON.stringify({ demo: true, caseId: CASE_ID, section: SECTION, answer: finalText })
      })

      let a: any = null
      try {
        a = await an.json()
      } catch {
        console.error("[voice-demo] analyzer response not valid JSON, using fallback")
        a = { next_action: { type: "continue" } }
      }

      if (!a?.next_action || typeof a.next_action !== "object" || !a.next_action.type) {
        console.warn("[voice-demo] invalid next_action, using fallback continue")
        a = { next_action: { type: "continue" } }
      }

      console.log("[voice-demo] analyzer next_action:", a.next_action)
      setStatus("branching")

      const next = a.next_action.type

      if (next === "ask_more" || next === "ask_more_question") {
        const nud = a.next_action.nudge ?? null
        turnInProgress.current = false
        await nextTurn(nud, activeSess)
        return
      }

      if (next === "score" || next === "final_score") {
        console.log("[voice-demo] calling scorer...")
        await fetch("/api/voice-tools/score-response", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: "demo-voice-1",
            caseId: CASE_ID,
            section: SECTION,
            use_llm: true,
            analyzer_json: a?.analyzer_json
          })
        })
        setStatus("idle")
        turnInProgress.current = false
        return
      }

      // default continue
      turnInProgress.current = false
      await nextTurn(null, activeSess)
    } catch (err) {
      console.error("[voice-demo] nextTurn error:", err)
      setStatus("idle")
      turnInProgress.current = false
    }
  }

  return (
    <div style={{ padding: 20 }}>
      <h2>Voice v3 Demo</h2>
      <div>status: {status}</div>

      <div style={{ marginTop: 8 }}>
        <button onClick={() => start()} disabled={status !== "idle"} style={{ marginRight: 8 }}>
          Start
        </button>
        <button onClick={() => stop()} disabled={status === "idle"}>
          Disconnect
        </button>
        <button onClick={() => sessRef.current?.speak('Audio check. You should hear me.')} disabled={!sessRef.current} style={{ marginLeft: 12 }}>
          Ping TTS
        </button>
        <button onClick={() => sessRef.current?.dumpInboundAudioStats('click')} disabled={!sessRef.current} style={{ marginLeft: 12 }}>
          Dump audio stats
        </button>
        <button
          onClick={async () => {
            const s = sessRef.current
            if (!s || turnInProgress.current) return
            turnInProgress.current = true
            try {
              s.speak('Please say hello, then pause for two seconds.')
              setStatus('listening')
              await s.waitForSpeechStop(3000).catch(() => {})
              const t = await s.waitForFinalTranscript(4000).catch(() => '')
              console.log('[voice-demo] PTT test transcript:', t)
              setStatus('idle')
            } finally {
              turnInProgress.current = false
            }
          }}
          disabled={!sessRef.current || turnInProgress.current}
          style={{ marginLeft: 12 }}
        >
          PTT test
        </button>
        <button onClick={() => nextTurn()} disabled={status === "idle" || turnInProgress.current} style={{ marginLeft: 12 }}>
          Ask once
        </button>
        <button onClick={() => askListen5s()} disabled={!sessRef.current || turnInProgress.current} style={{ marginLeft: 12 }}>
          Ask + listen 5s
        </button>
        <button onClick={() => toggleVAD(false)} disabled={!sessRef.current} style={{ marginLeft: 12 }}>
          VAD off
        </button>
        <button onClick={() => toggleVAD(true)} disabled={!sessRef.current} style={{ marginLeft: 8 }}>
          VAD on
        </button>
      </div>

      <div ref={audioHost} style={{ marginTop: 16 }} />

      <div style={{ marginTop: 16, fontFamily: "monospace", fontSize: 13, whiteSpace: "pre-wrap" }}>
        <div><strong>Last question:</strong> {lastQuestion || "(none)"}</div>
        <div><strong>Last transcript:</strong> {lastTranscript || "(none)"}</div>
      </div>

      <p style={{ marginTop: 12, color: "#666" }}>
        CASE_ID placeholder: replace with a real case UUID to run realistic demo flows.
      </p>
    </div>
  )
}
