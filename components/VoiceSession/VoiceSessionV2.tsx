'use client'

import { useState, useEffect, useRef, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { Mic } from 'lucide-react'
import { AgentOrb } from './AgentOrb'
import { MicVisualizer } from './MicVisualizer'
import { InterviewTimeline } from './InterviewTimeline'
import { VoiceSessionProps, TranscriptMessage, CaseStage } from './types'
import { reducer, INITIAL_STATE } from './state'
import { getMicStream, createAudioAnalyzer } from '@/lib/audio/analyzer'
import { createClient } from '@/lib/supabase/client'
import { DataExhibitSlideover } from '@/components/data-exhibit-slideover'
import '../../styles/voice-session.css'

// Telemetry logger
function logEvent(event: string, data?: Record<string, any>) {
  console.log(`[VoiceSession] ${event}`, data || '')
}

// Detect stage based on conversation keywords
function detectStage(text: string, currentStage: CaseStage, allMessages: TranscriptMessage[]): CaseStage {
  const lowerText = text.toLowerCase()

  // Count messages to help with stage transitions
  const messageCount = allMessages.length

  // Stage 1 -> 2: Introduction to Framework
  if (currentStage === 'intro' && (
    lowerText.includes('framework') ||
    lowerText.includes('how would you approach') ||
    lowerText.includes('how do you approach') ||
    lowerText.includes('structure') ||
    lowerText.includes('walk me through') ||
    lowerText.includes('walk through') ||
    lowerText.includes('break down') ||
    lowerText.includes('break this down') ||
    lowerText.includes('organize your thoughts') ||
    lowerText.includes('structured thinking') ||
    // Also transition after a few exchanges
    messageCount > 6
  )) {
    return 'structuring'
  }

  // Stage 2 -> 3: Framework to Analysis
  if (currentStage === 'structuring' && (
    lowerText.includes('data') ||
    lowerText.includes('numbers') ||
    lowerText.includes('exhibit') ||
    lowerText.includes('information') ||
    lowerText.includes('let me share') ||
    lowerText.includes('here are some') ||
    lowerText.includes('take a look') ||
    lowerText.includes('calculations') ||
    lowerText.includes('calculate') ||
    lowerText.includes('quantitative') ||
    lowerText.includes('math') ||
    lowerText.includes('figure') ||
    // Also transition after framework discussion
    messageCount > 12
  )) {
    return 'analysis'
  }

  // Stage 3 -> 4: Analysis to Synthesis
  if (currentStage === 'analysis' && (
    lowerText.includes('recommendation') ||
    lowerText.includes('what would you recommend') ||
    lowerText.includes('what do you recommend') ||
    lowerText.includes('synthesis') ||
    lowerText.includes('final thoughts') ||
    lowerText.includes('conclusion') ||
    lowerText.includes('summarize') ||
    lowerText.includes('sum up') ||
    lowerText.includes('bring it all together') ||
    lowerText.includes('what should') ||
    lowerText.includes('next steps') ||
    // Also transition after sufficient analysis
    messageCount > 20
  )) {
    return 'synthesis'
  }

  return currentStage
}

export function VoiceSessionV2({ caseData, interviewId, userId }: VoiceSessionProps) {
  const [sessionState, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [messages, setMessages] = useState<TranscriptMessage[]>([])
  const [displayedText, setDisplayedText] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [ttsEnergy, setTtsEnergy] = useState(0.2)
  const [error, setError] = useState<string | null>(null)
  const [currentStage, setCurrentStage] = useState<CaseStage>('intro')

  // For word-by-word animation synced with audio
  const fullTranscriptRef = useRef<string>('')
  const currentTranscriptRef = useRef<string>('')
  const audioSyncIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const previousWordCountRef = useRef(0)

  const router = useRouter()
  const supabase = createClient()

  // WebRTC and Realtime API refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const micStreamRef = useRef<MediaStream | null>(null)
  const energyIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const isInitializingRef = useRef(false)
  const isInitializedRef = useRef(false)
  const speechStartTimeRef = useRef<number | null>(null)
  const MIN_SPEECH_DURATION_MS = 400  // Minimum duration to consider as actual speech

  const startTimeRef = useRef<Date>(new Date())

  // Sync text display with audio playback position
  const syncTextWithAudio = (audioElement: HTMLAudioElement) => {
    // Clear any existing sync first to prevent multiple intervals
    if (audioSyncIntervalRef.current) {
      clearInterval(audioSyncIntervalRef.current)
      audioSyncIntervalRef.current = null
      logEvent('cleared_previous_sync')
    }

    // Try to get transcript from either source
    const transcript = fullTranscriptRef.current || currentTranscriptRef.current
    if (!transcript) {
      logEvent('sync_failed', { reason: 'no_transcript', full: fullTranscriptRef.current, current: currentTranscriptRef.current })
      return
    }

    logEvent('sync_started', { transcriptLength: transcript.length, preview: transcript.substring(0, 50) })

    const words = transcript.split(' ')
    const totalWords = words.length

    // Reset word count for this new sync
    previousWordCountRef.current = 0

    // Estimate word timing (average speaking rate: 150 words per minute)
    const estimatedDuration = (totalWords / 150) * 60
    let startTime = Date.now()

    // Update displayed text based on audio playback position or estimated timing
    const updateText = () => {
      // Always use the latest accumulated transcript
      const latestTranscript = fullTranscriptRef.current || currentTranscriptRef.current
      if (!latestTranscript) return

      const latestWords = latestTranscript.split(' ')
      const latestTotalWords = latestWords.length

      const currentTime = audioElement.currentTime
      const duration = audioElement.duration

      let progress = 0

      if (duration && isFinite(duration) && duration > 0) {
        // Use actual audio progress if available
        progress = Math.min(currentTime / duration, 1)
      } else {
        // Fallback: use elapsed time with estimated duration
        const elapsed = (Date.now() - startTime) / 1000
        const estimatedDuration = (latestTotalWords / 150) * 60
        progress = Math.min(elapsed / estimatedDuration, 1)
      }

      // Calculate how many words should be visible
      const wordsToShow = Math.max(1, Math.ceil(progress * latestTotalWords))

      // Detect word changes and create extra pulse
      if (wordsToShow !== previousWordCountRef.current) {
        previousWordCountRef.current = wordsToShow
        // Create a stronger pulse on word change
        setTtsEnergy(0.95 + Math.random() * 0.05) // Extra high energy spike
      }

      const displayedWords = latestWords.slice(0, wordsToShow).join(' ')
      setDisplayedText(displayedWords)

      // If audio ended or we've shown everything, stop
      if (audioElement.ended || progress >= 0.99) {
        setDisplayedText(latestTranscript)
        if (audioSyncIntervalRef.current) {
          clearInterval(audioSyncIntervalRef.current)
        }
      }
    }

    // Update every 100ms for smooth animation
    audioSyncIntervalRef.current = setInterval(updateText, 100)

    // Initial update
    updateText()
  }

  // Initialize Realtime API connection
  useEffect(() => {
    // Prevent multiple simultaneous initializations
    if (isInitializingRef.current || isInitializedRef.current) {
      logEvent('init_skipped', { initializing: isInitializingRef.current, initialized: isInitializedRef.current })
      return
    }

    let isCancelled = false

    const init = async () => {
      isInitializingRef.current = true
      try {
        if (isCancelled) return
        // Get ephemeral token from our API
        const tokenResponse = await fetch('/api/realtime/token')
        if (isCancelled) return
        if (!tokenResponse.ok) {
          throw new Error('Failed to get session token')
        }
        const { client_secret } = await tokenResponse.json()

        if (isCancelled) return
        // Set up WebRTC peer connection
        const pc = new RTCPeerConnection()
        peerConnectionRef.current = pc

        // Set up audio element for receiving audio
        const audioEl = document.createElement('audio')
        audioEl.autoplay = true
        audioElementRef.current = audioEl

        // Handle incoming audio tracks
        pc.ontrack = (e) => {
          logEvent('audio_track_received')
          audioEl.srcObject = e.streams[0]

          // Start when audio plays
          audioEl.onplay = () => {
            dispatch({ type: 'LLM_RESPONSE_READY', payload: '' })

            // Start energy animation for speaking
            if (energyIntervalRef.current) clearInterval(energyIntervalRef.current)
            energyIntervalRef.current = setInterval(() => {
              const energy = 0.5 + Math.random() * 0.4
              setTtsEnergy(energy)
            }, 100)
          }

          audioEl.onended = () => {
            if (energyIntervalRef.current) clearInterval(energyIntervalRef.current)
            if (audioSyncIntervalRef.current) clearInterval(audioSyncIntervalRef.current)
            setTtsEnergy(0.2) // Low energy when not speaking
            // Show full transcript when audio ends
            const finalTranscript = fullTranscriptRef.current || currentTranscriptRef.current
            if (finalTranscript) {
              setDisplayedText(finalTranscript)
              logEvent('audio_ended_showing_full_transcript', { length: finalTranscript.length })
            }
            dispatch({ type: 'TTS_END' })
          }
        }

        // Get user microphone
        const stream = await getMicStream()
        if (isCancelled) {
          stream.getTracks().forEach(track => track.stop())
          return
        }
        micStreamRef.current = stream
        stream.getTracks().forEach((track) => pc.addTrack(track, stream))

        // Set up audio analyzer for visualizer
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const source = audioContext.createMediaStreamSource(stream)
        const { analyser } = createAudioAnalyzer(audioContext, source, {
          fftSize: 512,
          smoothingTimeConstant: 0.8,
        })
        audioContextRef.current = audioContext
        analyserRef.current = analyser

        // Set up data channel for events
        const dc = pc.createDataChannel('oai-events')
        dataChannelRef.current = dc

        dc.addEventListener('open', () => {
          logEvent('data_channel_opened')

          // Configure the session with case interview instructions using structured prompts
          const dataContext = caseData.data_json ? JSON.stringify(caseData.data_json, null, 2) : '{}'

          const sessionConfig = {
            type: 'session.update',
            session: {
              model: 'gpt-4o-realtime-preview-2024-12-17',
              modalities: ['text', 'audio'],
              instructions: `# Role & Objective
You are an expert ${caseData.firm || 'consulting'} case interviewer conducting a realistic case interview.

**Case:** ${caseData.title}
**Firm:** ${caseData.firm || 'Top Consulting Firm'}
**Industry:** ${caseData.industry}
**Difficulty Level:** ${caseData.difficulty_level || 3}/5
**Summary:** ${caseData.summary || ''}

# Personality & Tone
Professional, challenging yet supportive, detail-oriented interviewer.
Formal but friendly. Push for clarity and structured thinking.
Keep responses concise (2-3 sentences max).

# Structured Interview Flow
Follow this exact progression through the interview stages:

## Stage 1: Introduction
${caseData.prompt_introduction || 'Introduce the case to the candidate.'}

## Stage 2: Framework Development
${caseData.prompt_framework || 'Ask the candidate to walk through their framework.'}

## Stage 3: Analysis & Data
${caseData.prompt_analysis || 'Present data and guide analysis.'}

**Case Data Available:**
\`\`\`json
${dataContext}
\`\`\`

## Stage 4: Synthesis & Recommendation
${caseData.prompt_synthesis || 'Ask for final recommendation and reasoning.'}

# Expected Framework
${caseData.expected_framework || 'Revenue → Costs → Profitability'}

# Key Insights to Guide Toward
${caseData.key_insights?.map((insight: string, i: number) => `${i + 1}. ${insight}`).join('\n') || 'No specific insights provided'}

# Instructions
- Move through stages naturally based on candidate progress
- Provide the case data when they reach the analysis stage
- Challenge assumptions and test structured thinking
- Guide without giving direct answers
- Keep the conversation flowing naturally

# Language
Respond only in English. Speak at a natural, professional pace.

Begin by greeting the candidate warmly and then deliver the introduction from Stage 1.`,
              voice: 'shimmer',
              turn_detection: {
                type: 'server_vad',
                threshold: 0.7,  // Increased from 0.5 to reduce sensitivity to background noise
                prefix_padding_ms: 500,  // Increased to capture more context before speech
                silence_duration_ms: 1200,  // Increased from 500ms to avoid cutting off user mid-sentence
              },
            },
          }
          dc.send(JSON.stringify(sessionConfig))
          setIsRecording(true)

          // Trigger the agent to speak first with an initial greeting
          setTimeout(() => {
            const createResponse = {
              type: 'response.create',
              response: {
                modalities: ['text', 'audio'],
                instructions: 'Begin by greeting the candidate warmly and delivering the case introduction from Stage 1.'
              }
            }
            dc.send(JSON.stringify(createResponse))
            logEvent('triggered_initial_greeting')
          }, 500)
        })

        dc.addEventListener('message', (e) => {
          try {
            const event = JSON.parse(e.data)
            logEvent('realtime_event', { type: event.type })

            // Handle different event types
            switch (event.type) {
              case 'conversation.item.created':
                if (event.item.type === 'message') {
                  const content = event.item.content?.[0]
                  if (content?.type === 'audio') {
                    // Audio being played - store transcript for word-by-word animation
                    const text = content.transcript || ''
                    if (text && event.item.role === 'assistant') {
                      // Store full transcript for animation when audio plays
                      fullTranscriptRef.current = text
                      logEvent('transcript_from_item', { length: text.length, preview: text.substring(0, 50) })

                      const aiMessage: TranscriptMessage = {
                        role: 'assistant',
                        content: text,
                        timestamp: new Date(),
                      }

                      // Update messages and detect stage transition with updated messages
                      setMessages((prev) => {
                        const updatedMessages = [...prev, aiMessage]

                        // Detect stage transition with updated message count
                        setCurrentStage((prevStage) => {
                          const newStage = detectStage(text, prevStage, updatedMessages)
                          if (newStage !== prevStage) {
                            logEvent('stage_changed', { from: prevStage, to: newStage, messageCount: updatedMessages.length })
                          }
                          return newStage
                        })

                        return updatedMessages
                      })
                    }
                  } else if (content?.type === 'input_audio') {
                    // User spoke
                    dispatch({ type: 'SILENCE_DETECTED' })
                  }
                }
                break

              case 'response.audio_transcript.delta':
                // Accumulate transcript for audio sync
                if (event.delta) {
                  currentTranscriptRef.current += event.delta
                }
                break

              case 'output_audio_buffer.stopped':
                // Audio playback stopped - reduce orb energy
                if (energyIntervalRef.current) {
                  clearInterval(energyIntervalRef.current)
                  energyIntervalRef.current = null
                }
                setTtsEnergy(0.2)
                break

              case 'output_audio_buffer.started':
                // Audio is starting - trigger sync and animation
                logEvent('audio_buffer_started', {
                  transcriptLength: currentTranscriptRef.current.length,
                  hasSyncInterval: !!audioSyncIntervalRef.current
                })

                // Start orb animation for speaking
                if (energyIntervalRef.current) clearInterval(energyIntervalRef.current)
                energyIntervalRef.current = setInterval(() => {
                  const energy = 0.5 + Math.random() * 0.4
                  setTtsEnergy(energy)
                }, 100)

                // Only start sync if we don't already have one running
                if (audioElementRef.current && currentTranscriptRef.current && !audioSyncIntervalRef.current) {
                  // Small delay to ensure audio element is ready
                  setTimeout(() => {
                    if (audioElementRef.current && !audioSyncIntervalRef.current) {
                      syncTextWithAudio(audioElementRef.current)
                    }
                  }, 100)
                }
                break

              case 'response.audio_transcript.done':
                // Full transcript available - just store it, don't display yet (let sync handle it)
                const fullText = event.transcript || currentTranscriptRef.current
                if (fullText) {
                  fullTranscriptRef.current = fullText
                  currentTranscriptRef.current = fullText  // Update current ref too
                  logEvent('transcript_ready', { length: fullText.length, preview: fullText.substring(0, 50) })

                  // Detect stage transition from full transcript
                  setCurrentStage((prevStage) => {
                    const newStage = detectStage(fullText, prevStage, messages)
                    if (newStage !== prevStage) {
                      logEvent('stage_changed', { from: prevStage, to: newStage, messageCount: messages.length })
                    }
                    return newStage
                  })
                  // Don't display full text here - let the sync interval or audio.onended handle it
                }
                break

              case 'response.audio_transcript.started':
                // Clear everything when new response starts
                setDisplayedText('')
                fullTranscriptRef.current = ''
                currentTranscriptRef.current = ''
                previousWordCountRef.current = 0
                setTtsEnergy(0.2) // Low energy before speaking
                // Stop any existing sync
                if (audioSyncIntervalRef.current) {
                  clearInterval(audioSyncIntervalRef.current)
                  audioSyncIntervalRef.current = null
                }
                break

              case 'input_audio_buffer.speech_started':
                logEvent('user_speech_started')
                speechStartTimeRef.current = Date.now()
                dispatch({ type: 'USER_STARTED_SPEAKING' })
                break

              case 'input_audio_buffer.speech_stopped':
                // Filter out very short audio bursts (likely background noise)
                const speechDuration = speechStartTimeRef.current
                  ? Date.now() - speechStartTimeRef.current
                  : 0

                logEvent('user_speech_stopped', { duration: speechDuration })

                // If speech was too short, cancel the input to prevent agent from responding to noise
                if (speechDuration < MIN_SPEECH_DURATION_MS) {
                  logEvent('speech_too_short_filtered', { duration: speechDuration })
                  // Cancel the current response by truncating the audio buffer
                  if (dataChannelRef.current?.readyState === 'open') {
                    dataChannelRef.current.send(JSON.stringify({
                      type: 'input_audio_buffer.clear'
                    }))
                  }
                }

                speechStartTimeRef.current = null
                break

              case 'response.created':
                // New response starting - clear any previous text and sync
                setDisplayedText('')
                fullTranscriptRef.current = ''
                currentTranscriptRef.current = ''
                previousWordCountRef.current = 0
                setTtsEnergy(0.3) // Lower energy when response is being generated
                // Stop any existing sync
                if (audioSyncIntervalRef.current) {
                  clearInterval(audioSyncIntervalRef.current)
                  audioSyncIntervalRef.current = null
                }
                break

              case 'response.done':
                // Response completed - ensure full text is shown and cleanup
                const finalText = fullTranscriptRef.current || currentTranscriptRef.current
                if (finalText && displayedText !== finalText) {
                  setDisplayedText(finalText)
                  logEvent('response_done_showing_final', { length: finalText.length })
                }
                setTtsEnergy(0.2) // Low energy when done
                dispatch({ type: 'TTS_END' })
                break

              case 'error':
                logEvent('realtime_error', { error: event.error })
                setError(event.error?.message || 'An error occurred')
                break
            }
          } catch (err) {
            logEvent('event_parse_error', { error: String(err) })
          }
        })

        dc.addEventListener('close', () => {
          logEvent('data_channel_closed')
          setIsRecording(false)
        })

        // Create and set local offer
        const offer = await pc.createOffer()
        if (isCancelled) return
        await pc.setLocalDescription(offer)
        if (isCancelled) return

        // Send offer to OpenAI
        const sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${client_secret.value}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        })
        if (isCancelled) return

        if (!sdpResponse.ok) {
          throw new Error('Failed to connect to OpenAI Realtime API')
        }

        const answerSdp = await sdpResponse.text()
        if (isCancelled) return
        await pc.setRemoteDescription({
          type: 'answer',
          sdp: answerSdp,
        })
        if (isCancelled) return

        logEvent('realtime_connected')
        isInitializedRef.current = true
      } catch (error) {
        logEvent('initialization_error', { error: String(error) })
        setError(error instanceof Error ? error.message : 'Failed to initialize')
        dispatch({ type: 'ERROR', payload: 'Failed to connect to Realtime API' })
      } finally {
        isInitializingRef.current = false
      }
    }

    init()

    return () => {
      // Signal cancellation to stop any in-progress initialization
      isCancelled = true

      // Reset initialization state
      isInitializingRef.current = false
      isInitializedRef.current = false
      speechStartTimeRef.current = null

      if (dataChannelRef.current) {
        dataChannelRef.current.close()
      }
      if (peerConnectionRef.current) {
        peerConnectionRef.current.close()
      }
      if (audioElementRef.current) {
        audioElementRef.current.pause()
        audioElementRef.current.srcObject = null
      }
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop())
      }
      if (energyIntervalRef.current) {
        clearInterval(energyIntervalRef.current)
      }
      if (audioSyncIntervalRef.current) {
        clearInterval(audioSyncIntervalRef.current)
      }
    }
  }, [caseData])

  const endInterview = async () => {
    if (dataChannelRef.current) {
      dataChannelRef.current.close()
    }
    if (peerConnectionRef.current) {
      peerConnectionRef.current.close()
    }
    if (audioElementRef.current) {
      audioElementRef.current.pause()
      audioElementRef.current.srcObject = null
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop())
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
        return 'listening…' // Don't show thinking state
      default:
        return isRecording ? 'ready…' : 'connecting…'
    }
  }

  // Sample exhibits
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
      {/* Interview Timeline - Hide on mobile/tablet */}
      <div className="hidden md:block">
        <InterviewTimeline currentStage={currentStage} />
      </div>

      {/* Header */}
      <div className="absolute top-4 left-4 md:top-8 md:left-8 max-w-[calc(100%-8rem)] md:max-w-none">
        <h1 className="text-base md:text-xl font-semibold text-gray-800 truncate">
          {caseData.title}
        </h1>
        <p className="text-xs md:text-sm text-gray-600 truncate">
          {caseData.industry} • {caseData.difficulty}
        </p>
      </div>

      {/* Data Exhibits Slideover - Hide on mobile */}
      <div className="hidden md:block">
        <DataExhibitSlideover exhibits={sampleExhibits} />
      </div>

      {/* End Interview Button */}
      <div className="absolute top-4 right-4 md:top-8 md:right-8">
        <button
          onClick={endInterview}
          className="px-3 py-2 md:px-4 md:py-2.5 bg-transparent border border-gray-500 rounded-lg text-gray-600 hover:bg-gray-50 text-xs md:text-sm font-medium transition-colors"
        >
          End
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-red-50 border border-red-200 rounded-lg p-4 text-red-700 max-w-[90%] md:max-w-md text-sm md:text-base">
          {error}
        </div>
      )}

      {/* Mobile Stage Indicator - Show only on mobile */}
      <div className="md:hidden absolute top-16 left-4 right-4 flex justify-center">
        <div className="bg-white/80 backdrop-blur-sm px-3 py-1.5 rounded-full border border-gray-200">
          <span className="text-xs font-medium text-gray-600 capitalize">{currentStage}</span>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col items-center gap-8 md:gap-12 w-full px-4">
        {/* Agent Orb with pop-in animation */}
        <div className="vs-orb-container">
          <AgentOrb mode={sessionState} energy={ttsEnergy} />
        </div>

        {/* Mic Visualizer */}
        {isRecording && (
          <MicVisualizer analyser={analyserRef.current} isActive={true} />
        )}

        {/* Transcript Display */}
        <div className="vs-transcript-container">
          <div className="vs-transcript-line vs-fade-in">
            {displayedText}
          </div>
        </div>

        {/* Caption */}
        <div className="vs-caption" aria-live="polite" aria-atomic="true">
          {getCaption()}
        </div>

        {/* Status Indicator */}
        <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600">
          <div
            className={`w-2 h-2 rounded-full ${isRecording ? 'bg-green-400 animate-pulse' : 'bg-gray-400'}`}
          />
          <span className="hidden sm:inline">{isRecording ? 'Connected - Speak anytime' : 'Connecting...'}</span>
          <span className="sm:hidden">{isRecording ? 'Connected' : 'Connecting...'}</span>
        </div>
      </div>
    </div>
  )
}
