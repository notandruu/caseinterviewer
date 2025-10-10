'use client'

import { useState, useEffect, useRef, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { Mic } from 'lucide-react'
import { AgentOrb } from './AgentOrb'
import { MicVisualizer } from './MicVisualizer'
import { VoiceSessionProps, TranscriptMessage, CaseStage } from './types'
import { reducer, INITIAL_STATE, getProcessingCaption, getStateCaption } from './state'
import { getMicStream, createAudioAnalyzer, createRMSMeter, createSilenceDetector } from '@/lib/audio/analyzer'
import { createClient } from '@/lib/supabase/client'
import { DataExhibitSlideover } from '@/components/data-exhibit-slideover'
import '../../styles/voice-session.css'

// Telemetry logger
function logEvent(event: string, data?: Record<string, any>) {
  console.log(`[VoiceSession] ${event}`, data || '')
}

// Stage detection keywords
const STAGE_KEYWORDS: Record<CaseStage, string[]> = {
  intro: ['introduce', 'case', 'client', 'situation', 'problem'],
  clarifying: ['clarify', 'question', 'understand', 'confirm', 'ask'],
  structuring: ['structure', 'framework', 'approach', 'organize', 'buckets'],
  analysis: ['analyze', 'data', 'exhibit', 'chart', 'graph', 'number', 'calculation'],
  brainstorming: ['ideas', 'brainstorm', 'options', 'alternatives', 'solutions'],
  synthesis: ['recommend', 'conclusion', 'summary', 'synthesize', 'final']
}

export function VoiceSessionV2({ caseData, interviewId, userId }: VoiceSessionProps) {
  const [sessionState, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [processingCaption, setProcessingCaption] = useState('contemplating…')
  const [isRecording, setIsRecording] = useState(false)
  const [ttsEnergy, setTtsEnergy] = useState(0.5) // For orb pulse during TTS
  const [displayedText, setDisplayedText] = useState('') // For synchronized text animation
  const [caseStage, setCaseStage] = useState<CaseStage>('intro')
  const [showExhibits, setShowExhibits] = useState(false)
  const [textModeEnabled, setTextModeEnabled] = useState(true) // Toggle for text display
  const [timerSeconds, setTimerSeconds] = useState(120) // 2 minutes for structuring
  const [timerActive, setTimerActive] = useState(false)
  const [showTimer, setShowTimer] = useState(true) // Toggle for timer visibility

  const router = useRouter()
  const supabase = createClient()

  // Audio refs
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const silenceDetectorRef = useRef<ReturnType<typeof createSilenceDetector> | null>(null)
  const rmsGetterRef = useRef<(() => number) | null>(null)
  const ttsAnalyserRef = useRef<AnalyserNode | null>(null)
  const ttsAnimationRef = useRef<number>()
  const ELEVEN_DEFAULT_VOICE = useRef<string>('pNInz6obpgDQGcFmaJgB') // Adam
  const textAnimationRef = useRef<NodeJS.Timeout | null>(null)

  const startTimeRef = useRef<Date>(new Date())
  const silenceStartRef = useRef<number | null>(null)

  // Initialize audio and speech recognition
  useEffect(() => {
    const init = async () => {
      try {
        // Initialize Web Speech API
        const SpeechRecognition = window.SpeechRecognition || (window as any).webkitSpeechRecognition
        if (SpeechRecognition) {
          const recognition = new SpeechRecognition()
          recognition.continuous = true
          recognition.interimResults = true
          recognition.lang = 'en-US'

          recognition.onresult = (event: any) => {
            let interim = ''
            let final = ''

            for (let i = event.resultIndex; i < event.results.length; i++) {
              const transcript = event.results[i][0].transcript
              if (event.results[i].isFinal) {
                final += transcript
              } else {
                interim += transcript
              }
            }

            if (final) {
              setCurrentTranscript('')
              handleUserSpeech(final)
            } else {
              setCurrentTranscript(interim)
            }
          }

          recognition.onerror = (e: any) => {
            console.error('[VoiceSessionV2] Speech recognition error:', e.error)
          }

          recognitionRef.current = recognition
        }

        // Initialize TTS
        synthRef.current = window.speechSynthesis

        // Initialize audio analyzer
        const stream = await getMicStream()
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const source = audioContext.createMediaStreamSource(stream)

        const { analyser, getRMS } = createAudioAnalyzer(audioContext, source, {
          fftSize: 512,
          smoothingTimeConstant: 0.8,
        })

        const { getSmoothedRMS } = createRMSMeter(audioContext, source, 0.35)

        const silenceDetector = createSilenceDetector(getSmoothedRMS, {
          silenceThreshold: 0.01,
          silenceDuration: 1000,
        })

        audioContextRef.current = audioContext
        analyserRef.current = analyser
        rmsGetterRef.current = getSmoothedRMS
        silenceDetectorRef.current = silenceDetector

        // Start with welcome message
        speakWelcome()
      } catch (error) {
        console.error('[VoiceSessionV2] Initialization error:', error)
        dispatch({ type: 'ERROR', payload: 'Failed to initialize audio' })
      }
    }

    init()

    return () => {
      recognitionRef.current?.stop()
      synthRef.current?.cancel()
      audioContextRef.current?.close()
      if (audioElementRef.current) {
        audioElementRef.current.pause()
        audioElementRef.current.src = ''
      }
    }
  }, [])

  // Silence detection loop when user is listening
  useEffect(() => {
    if (sessionState !== 'user_listening' || !silenceDetectorRef.current) return

    const interval = setInterval(() => {
      if (silenceDetectorRef.current?.checkSilence()) {
        const silenceDuration = silenceStartRef.current
          ? Date.now() - silenceStartRef.current
          : 0

        logEvent('silence_detected', { duration_ms: silenceDuration })
        dispatch({ type: 'SILENCE_DETECTED' })
        setProcessingCaption(getProcessingCaption())
        silenceStartRef.current = null
      } else if (!silenceStartRef.current && rmsGetterRef.current) {
        const rms = rmsGetterRef.current()
        if (rms < 0.01) {
          silenceStartRef.current = Date.now()
        }
      }
    }, 100)

    return () => clearInterval(interval)
  }, [sessionState])

  // Track state changes
  useEffect(() => {
    logEvent('state_change', { new_state: sessionState })
  }, [sessionState])

  // Timer countdown effect
  useEffect(() => {
    if (!timerActive) return

    const interval = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev <= 1) {
          setTimerActive(false)
          logEvent('timer_expired', { stage: caseStage })
          return 0
        }
        return prev - 1
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [timerActive, caseStage])

  // Auto-start timer when entering structuring stage
  useEffect(() => {
    if (caseStage === 'structuring' && !timerActive && timerSeconds === 120) {
      setTimerActive(true)
      logEvent('timer_started', { stage: caseStage, duration: 120 })
    }
    // Reset timer when leaving structuring stage
    if (caseStage !== 'structuring' && timerActive) {
      setTimerActive(false)
      setTimerSeconds(120)
    }
  }, [caseStage])

  // Auto-start/stop recording based on state
  useEffect(() => {
    if (sessionState === 'user_listening') {
      startRecording()
    } else {
      stopRecording()
    }
  }, [sessionState])

  const speakWelcome = () => {
    const welcomeMessage: TranscriptMessage = {
      role: 'assistant',
      content: caseData.prompt,
      timestamp: new Date(),
    }
    setMessages([welcomeMessage])
    speakText(caseData.prompt)
  }

  const animateTextSync = (text: string, durationMs: number) => {
    // Clear any existing animation
    if (textAnimationRef.current) {
      clearInterval(textAnimationRef.current)
    }

    const words = text.split(' ')
    const msPerWord = durationMs / words.length
    let currentIndex = 0

    setDisplayedText('')

    textAnimationRef.current = setInterval(() => {
      if (currentIndex < words.length) {
        setDisplayedText(words.slice(0, currentIndex + 1).join(' '))
        currentIndex++
      } else {
        if (textAnimationRef.current) {
          clearInterval(textAnimationRef.current)
        }
      }
    }, msPerWord)
  }

  const speakText = async (text: string) => {
    logEvent('tts_start', { text_length: text.length })

    try {
      // Try ElevenLabs first
      const res = await fetch('/api/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text,
          voice_id: ELEVEN_DEFAULT_VOICE.current,
          model_id: 'eleven_turbo_v2',
        }),
      })

      const contentType = res.headers.get('content-type') || ''
      if (res.ok && contentType.includes('audio')) {
        const blob = await res.blob()
        const url = URL.createObjectURL(blob)

        if (!audioElementRef.current) {
          audioElementRef.current = new Audio()
        }

        audioElementRef.current.src = url

        // Wait for metadata to load to get duration
        audioElementRef.current.onloadedmetadata = () => {
          if (audioElementRef.current) {
            const durationMs = audioElementRef.current.duration * 1000
            // Start text animation synchronized with audio duration
            animateTextSync(text, durationMs)
          }
        }

        // Animate orb energy during playback
        let energyInterval: NodeJS.Timeout | null = null

        audioElementRef.current.onplay = () => {
          energyInterval = setInterval(() => {
            const energy = 0.4 + Math.random() * 0.5
            setTtsEnergy(energy)
          }, 150)
        }

        audioElementRef.current.onended = () => {
          if (energyInterval) clearInterval(energyInterval)
          if (textAnimationRef.current) clearInterval(textAnimationRef.current)
          setTtsEnergy(0.5)
          setDisplayedText(text) // Show full text at end
          logEvent('tts_end')
          dispatch({ type: 'TTS_END' })
        }

        await audioElementRef.current.play()
        return
      }

      console.warn('[VoiceSessionV2] TTS not audio, falling back to Web Speech API')
      playLocalTTS(text)
    } catch (error) {
      console.error('[VoiceSessionV2] ElevenLabs TTS failed, falling back:', error)
      playLocalTTS(text)
    }
  }

  const playLocalTTS = (text: string) => {
    if (!synthRef.current) return

    synthRef.current.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.95
    utterance.pitch = 1

    // Estimate duration: ~150 words per minute at 0.95 rate
    const wordCount = text.split(' ').length
    const estimatedDurationMs = (wordCount / 150) * 60 * 1000 * (1 / 0.95)

    let energyInterval: NodeJS.Timeout | null = null

    utterance.onstart = () => {
      // Start text animation with estimated duration
      animateTextSync(text, estimatedDurationMs)

      energyInterval = setInterval(() => {
        const energy = 0.4 + Math.random() * 0.5
        setTtsEnergy(energy)
      }, 150)
    }

    utterance.onend = () => {
      if (energyInterval) clearInterval(energyInterval)
      if (textAnimationRef.current) clearInterval(textAnimationRef.current)
      setTtsEnergy(0.5)
      setDisplayedText(text) // Show full text at end
      logEvent('tts_end')
      dispatch({ type: 'TTS_END' })
    }

    utterance.onerror = (e) => {
      if (energyInterval) clearInterval(energyInterval)
      if (textAnimationRef.current) clearInterval(textAnimationRef.current)
      setTtsEnergy(0.5)
      logEvent('tts_error', { error: e.error })
    }

    synthRef.current.speak(utterance)
  }

  const startRecording = () => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.start()
      setIsRecording(true)
      silenceDetectorRef.current?.reset()
      silenceStartRef.current = null
      logEvent('mic_start')
    } catch (error) {
      // Already started
    }
  }

  const stopRecording = () => {
    if (!recognitionRef.current) return
    try {
      recognitionRef.current.stop()
      setIsRecording(false)
      logEvent('mic_end')
    } catch (error) {
      // Already stopped
    }
  }

  const detectStage = (text: string): CaseStage | null => {
    const lowerText = text.toLowerCase()

    // Check each stage's keywords
    for (const [stage, keywords] of Object.entries(STAGE_KEYWORDS)) {
      const matchCount = keywords.filter(keyword => lowerText.includes(keyword)).length
      if (matchCount >= 2) { // Need at least 2 keyword matches
        return stage as CaseStage
      }
    }
    return null
  }

  const handleUserSpeech = (transcript: string) => {
    const userMessage: TranscriptMessage = {
      role: 'user',
      content: transcript,
      timestamp: new Date(),
    }
    setMessages((prev) => [...prev, userMessage])
    fetchAIResponse(transcript)
  }

  const fetchAIResponse = async (userInput: string) => {
    const startTime = Date.now()
    logEvent('llm_start', { input_length: userInput.length })

    try {
      const res = await fetch('/api/interview/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, { role: 'user', content: userInput }],
          caseContext: caseData,
          interviewId,
        }),
      })

      const data = await res.json()

      if (!data.message) {
        throw new Error('No response from API')
      }

      const duration = Date.now() - startTime
      logEvent('llm_end', { duration_ms: duration, response_length: data.message.length })

      const aiMessage: TranscriptMessage = {
        role: 'assistant',
        content: data.message,
        timestamp: new Date(),
      }

      setMessages((prev) => [...prev, aiMessage])

      // Detect stage from AI response
      const detectedStage = detectStage(data.message)
      if (detectedStage && detectedStage !== caseStage) {
        setCaseStage(detectedStage)
        logEvent('stage_change', { from: caseStage, to: detectedStage })

        // Auto-open exhibits when entering analysis stage
        if (detectedStage === 'analysis') {
          setShowExhibits(true)
          logEvent('exhibits_auto_open', { stage: detectedStage })
        }
      }

      dispatch({ type: 'LLM_RESPONSE_READY', payload: data.message })
      speakText(data.message)
    } catch (error) {
      console.error('[VoiceSessionV2] AI response error:', error)
      logEvent('llm_error', { duration_ms: Date.now() - startTime, error: String(error) })
      const errorMessage = "Let's try that again. Could you please repeat your response?"
      const aiMessage: TranscriptMessage = {
        role: 'assistant',
        content: errorMessage,
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, aiMessage])
      dispatch({ type: 'ERROR', payload: 'Failed to get AI response' })
      speakText(errorMessage)
    }
  }

  const endInterview = async () => {
    stopRecording()
    synthRef.current?.cancel()
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.src = ''
    }

    const duration = Math.floor((Date.now() - startTimeRef.current.getTime()) / 1000)

    if (!interviewId.startsWith('demo-')) {
      await supabase
        .from('interviews')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          duration,
          transcript: messages,
        })
        .eq('id', interviewId)

      await fetch('/api/interview/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ interviewId }),
      })
    }

    router.push(`/interview/${interviewId}/feedback`)
  }

  const getCaption = () => {
    switch (sessionState) {
      case 'agent_speaking':
        return 'speaking…'
      case 'user_listening':
        return 'listening…'
      case 'processing':
        return processingCaption
      default:
        return ''
    }
  }

  const latestMessage = messages[messages.length - 1]
  // Show animated text when agent is speaking, user transcript when listening, or latest message
  const displayText = sessionState === 'agent_speaking'
    ? displayedText
    : currentTranscript || latestMessage?.content || ''

  const getStageLabel = (): string => {
    switch (caseStage) {
      case 'intro': return 'Introduction'
      case 'clarifying': return 'Clarifying Questions'
      case 'structuring': return 'Structuring'
      case 'analysis': return 'Analysis & Data'
      case 'brainstorming': return 'Brainstorming'
      case 'synthesis': return 'Synthesis & Recommendation'
      default: return 'Interview'
    }
  }

  // Sample exhibits (in real app, fetch from database)
  const sampleExhibits = [
    {
      id: '1',
      title: 'Market Size Analysis',
      type: 'chart' as const,
      data: {},
    },
    {
      id: '2',
      title: 'Revenue Breakdown',
      type: 'table' as const,
      data: {},
    },
  ]

  return (
    <div className="vs-screen">
      {/* Header */}
      <div style={{ position: 'absolute', top: '2rem', left: '2rem' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#3A3A3A' }}>
          {caseData.title}
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#555' }}>
          {caseData.industry} • {caseData.difficulty}
        </p>
        <div style={{
          marginTop: '0.5rem',
          padding: '0.25rem 0.75rem',
          backgroundColor: '#F6C342',
          color: '#3A3A3A',
          borderRadius: '1rem',
          fontSize: '0.75rem',
          fontWeight: 500,
          display: 'inline-block',
        }}>
          {getStageLabel()}
        </div>
      </div>

      {/* Data Exhibits Slideover */}
      <DataExhibitSlideover exhibits={sampleExhibits} />

      {/* Settings and End Interview */}
      <div style={{ position: 'absolute', top: '2rem', right: '2rem', display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
        {/* Timer Toggle */}
        <button
          onClick={() => setShowTimer(!showTimer)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: showTimer ? '#F6C342' : 'transparent',
            border: `1px solid ${showTimer ? '#F6C342' : '#555'}`,
            borderRadius: '0.5rem',
            color: showTimer ? '#3A3A3A' : '#555',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 500,
            transition: 'all 200ms ease',
          }}
          title={showTimer ? 'Timer: ON' : 'Timer: OFF (hidden)'}
        >
          {showTimer ? '⏱️ Timer' : '⏱️ Hidden'}
        </button>

        {/* Text Mode Toggle */}
        <button
          onClick={() => setTextModeEnabled(!textModeEnabled)}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: textModeEnabled ? '#F6C342' : 'transparent',
            border: `1px solid ${textModeEnabled ? '#F6C342' : '#555'}`,
            borderRadius: '0.5rem',
            color: textModeEnabled ? '#3A3A3A' : '#555',
            cursor: 'pointer',
            fontSize: '0.75rem',
            fontWeight: 500,
            transition: 'all 200ms ease',
          }}
          title={textModeEnabled ? 'Text mode: ON (easier)' : 'Text mode: OFF (high stakes)'}
        >
          {textModeEnabled ? '📝 Text' : '🎯 No Text'}
        </button>

        {/* End Interview Button */}
        <button
          onClick={endInterview}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: 'transparent',
            border: '1px solid #555',
            borderRadius: '0.5rem',
            color: '#555',
            cursor: 'pointer',
            fontSize: '0.875rem',
          }}
        >
          End Interview
        </button>
      </div>

      {/* Structuring Timer */}
      {caseStage === 'structuring' && showTimer && (
        <div style={{
          position: 'absolute',
          top: '7rem',
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '1rem 2rem',
          backgroundColor: timerSeconds <= 30 ? '#ff6b6b' : '#F6C342',
          borderRadius: '2rem',
          fontSize: '2rem',
          fontWeight: 700,
          color: timerSeconds <= 30 ? '#fff' : '#3A3A3A',
          boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
          transition: 'all 300ms ease',
          animation: timerSeconds <= 10 ? 'vs-timer-pulse 1s infinite' : 'none',
        }}>
          {Math.floor(timerSeconds / 60)}:{(timerSeconds % 60).toString().padStart(2, '0')}
        </div>
      )}

      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3rem' }}>
        {/* Agent Orb */}
        <AgentOrb mode={sessionState} energy={ttsEnergy} />

        {/* Mic Visualizer */}
        {sessionState === 'user_listening' && (
          <MicVisualizer analyser={analyserRef.current} isActive={isRecording} />
        )}

        {/* Transcript Display with horizontal fade - conditionally hidden */}
        {textModeEnabled && (
          <div className="vs-transcript-container">
            <div className="vs-transcript-line vs-fade-in">
              {displayText}
            </div>
          </div>
        )}

        {/* Text Mode Off Message */}
        {!textModeEnabled && sessionState === 'agent_speaking' && (
          <div style={{
            fontSize: '0.875rem',
            color: '#555',
            fontStyle: 'italic',
            textAlign: 'center',
            minHeight: '3.5rem',
            display: 'flex',
            alignItems: 'center',
          }}>
            [High Stakes Mode - Listen Carefully]
          </div>
        )}

        {/* Caption */}
        <div className="vs-caption" aria-live="polite" aria-atomic="true">
          {getCaption()}
        </div>

        {/* Mic Button */}
        <button
          className={`vs-mic-button ${isRecording ? 'vs-mic-button--recording' : ''}`}
          onClick={() => {
            if (isRecording) {
              stopRecording()
            } else {
              startRecording()
            }
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              if (isRecording) {
                stopRecording()
              } else {
                startRecording()
              }
            }
          }}
          aria-label={isRecording ? 'Stop recording' : 'Start recording'}
          aria-pressed={isRecording}
        >
          <Mic size={28} />
        </button>
      </div>
    </div>
  )
}
