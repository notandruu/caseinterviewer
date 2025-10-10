'use client'

import { useState, useEffect, useRef, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { Mic } from 'lucide-react'
import { AgentOrb } from './AgentOrb'
import { MicVisualizer } from './MicVisualizer'
import { VoiceSessionProps, TranscriptMessage } from './types'
import { reducer, INITIAL_STATE, getProcessingCaption, getStateCaption } from './state'
import { getMicStream, createAudioAnalyzer, createRMSMeter, createSilenceDetector } from '@/lib/audio/analyzer'
import { createClient } from '@/lib/supabase/client'
import '../../styles/voice-session.css'

// Telemetry logger
function logEvent(event: string, data?: Record<string, any>) {
  console.log(`[VoiceSession] ${event}`, data || '')
}

export function VoiceSessionV2({ caseData, interviewId, userId }: VoiceSessionProps) {
  const [sessionState, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [currentTranscript, setCurrentTranscript] = useState('')
  const [processingCaption, setProcessingCaption] = useState('contemplating…')
  const [isRecording, setIsRecording] = useState(false)
  const [ttsEnergy, setTtsEnergy] = useState(0.5) // For orb pulse during TTS

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

  const speakText = (text: string) => {
    if (!synthRef.current || !audioContextRef.current) return

    logEvent('tts_start', { text_length: text.length })

    synthRef.current.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    utterance.rate = 0.95
    utterance.pitch = 1

    // Animate orb energy during TTS
    // Note: Web Speech API doesn't provide audio stream for analysis,
    // so we simulate energy based on speech timing
    let energyInterval: NodeJS.Timeout | null = null

    utterance.onstart = () => {
      // Simulate energy pulses during speech
      energyInterval = setInterval(() => {
        // Randomize energy between 0.4 and 0.9 to create pulse effect
        const energy = 0.4 + Math.random() * 0.5
        setTtsEnergy(energy)
      }, 150) // Update every 150ms for smooth pulse
    }

    utterance.onend = () => {
      if (energyInterval) {
        clearInterval(energyInterval)
      }
      setTtsEnergy(0.5) // Reset to neutral
      logEvent('tts_end')
      dispatch({ type: 'TTS_END' })
    }

    utterance.onerror = (e) => {
      if (energyInterval) {
        clearInterval(energyInterval)
      }
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
  const displayText = currentTranscript || latestMessage?.content || ''

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
      </div>

      {/* End Interview Button */}
      <button
        onClick={endInterview}
        style={{
          position: 'absolute',
          top: '2rem',
          right: '2rem',
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

      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3rem' }}>
        {/* Agent Orb */}
        <AgentOrb mode={sessionState} energy={ttsEnergy} />

        {/* Mic Visualizer */}
        {sessionState === 'user_listening' && (
          <MicVisualizer analyser={analyserRef.current} isActive={isRecording} />
        )}

        {/* Transcript Display */}
        <div className="vs-transcript-line vs-fade-in">
          {displayText}
        </div>

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
