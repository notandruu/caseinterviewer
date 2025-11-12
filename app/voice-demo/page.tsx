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
  const [browserAudioMode, setBrowserAudioMode] = useState(true)
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

  async function playFromRestTTS() {
    try {
      const r = await fetch('/api/tts?text=' + encodeURIComponent('Audio check'))
      if (!r.ok) throw new Error('TTS route failed')
      const buf = await r.arrayBuffer()
      const blob = new Blob([buf], { type: 'audio/mpeg' })
      const url = URL.createObjectURL(blob)
      const a = new Audio()
      a.src = url
      a.controls = true
      document.body.appendChild(a)
      await a.play()
      console.log('[voice-demo] REST TTS playback OK')
    } catch (e) {
      console.error('[voice-demo] REST TTS playback failed', e)
    }
  }

  function hasSpeechSynthesis() {
    return typeof window !== 'undefined' && 'speechSynthesis' in window
  }

  function hasBrowserSTT() {
    return typeof window !== 'undefined' &&
      (('SpeechRecognition' in window) || ('webkitSpeechRecognition' in window))
  }

  function unlockSpeechSynthesis() {
    try {
      if (!hasSpeechSynthesis()) return
      window.speechSynthesis.cancel()
      const u = new SpeechSynthesisUtterance('')
      window.speechSynthesis.speak(u)
    } catch {}
  }

  async function speakOut(text: string, s?: RealtimeSession | null) {
    if (browserAudioMode && hasSpeechSynthesis()) {
      const u = new SpeechSynthesisUtterance(text || 'Audio check')
      u.rate = 1
      u.pitch = 1
      window.speechSynthesis.speak(u)
      return
    }
    if (s) s.speak(text)
  }

  function listenBrowserSTT(timeoutMs = 7000): Promise<string> {
    return new Promise((resolve) => {
      if (!hasBrowserSTT()) return resolve('')

      const Rec = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      const rec = new Rec()
      rec.lang = 'en-US'
      rec.interimResults = false
      rec.maxAlternatives = 1

      let settled = false
      const timer = setTimeout(() => {
        if (!settled) {
          settled = true
          try { rec.stop() } catch {}
          resolve('')
        }
      }, timeoutMs)

      rec.onresult = (e: any) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        const text = e?.results?.[0]?.[0]?.transcript || ''
        resolve(text)
      }
      rec.onerror = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve('')
      }
      rec.onend = () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve('')
      }

      try {
        rec.start()
      } catch {
        clearTimeout(timer)
        resolve('')
      }
    })
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
        s.remoteAudio.play().catch(err => console.warn('[voice-demo] remoteAudio.play blocked:', err))
      }

      unlockSpeechSynthesis()
      console.log('[voice-demo] connection established')
      
      // Dump audio stats 3s after connect
      setTimeout(() => s.dumpInboundAudioStats('post-start'), 3000)
      
      setStatus('idle')
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

      // speak question
      await speakOut(question, activeSess)
      setStatus("listening")

      // wait for transcript
      let finalText = ""
      try {
        if (browserAudioMode) {
          finalText = await listenBrowserSTT(7000)
        } else {
          finalText = await activeSess.waitForFinalTranscript(20000)
        }
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
        <label style={{ marginRight: 12 }}>
          <input
            type="checkbox"
            checked={browserAudioMode}
            onChange={(e) => setBrowserAudioMode(e.target.checked)}
            style={{ marginRight: 6 }}
          />
          Browser audio mode
        </label>

        <button onClick={() => start()} disabled={status !== 'idle'} style={{ marginRight: 8 }}>
          Start
        </button>
        <button onClick={() => nextTurn()} disabled={status !== 'idle' || turnInProgress.current} style={{ marginRight: 8 }}>
          Ask once
        </button>
        <button onClick={() => stop()} disabled={status === 'idle'}>
          Disconnect
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
