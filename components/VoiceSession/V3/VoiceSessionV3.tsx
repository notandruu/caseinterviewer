'use client'

/**
 * VoiceSessionV3 - Voice interview with Realtime API + Server-Mediated Tools
 * Follows V1 UI theme with AgentOrb and MicVisualizer
 */

import { useState, useEffect, useRef, useReducer } from 'react'
import { useRouter } from 'next/navigation'
import { AgentOrb } from '../AgentOrb'
import { MicVisualizer } from '../MicVisualizer'
import { reducer, INITIAL_STATE } from '../state'
import { getMicStream, createAudioAnalyzer } from '@/lib/audio/analyzer'
import { REALTIME_TOOL_DEFINITIONS, handleRealtimeTool } from '@/lib/tools'
import { TimelineSidebar } from './TimelineSidebar'
import { HintsCounter } from './HintsCounter'
import { FrameworkTimer } from './FrameworkTimer'
import type { ClientCase, SectionName, TranscriptEntry } from '@/types/cases'
import '../../../styles/voice-session.css'

interface VoiceSessionV3Props {
  caseData: ClientCase
  attemptId: string
  userId: string
  language?: string
  showTranscription?: boolean
}

function logEvent(event: string, data?: Record<string, any>) {
  console.log(`[VoiceSessionV3] ${event}`, data || '')
}

export function VoiceSessionV3({ caseData, attemptId, userId, language = 'en', showTranscription: initialShowTranscription = true }: VoiceSessionV3Props) {
  const [sessionState, dispatch] = useReducer(reducer, INITIAL_STATE)
  const [messages, setMessages] = useState<TranscriptEntry[]>([])
  const [displayedText, setDisplayedText] = useState('')
  const [fullTranscript, setFullTranscript] = useState('')
  const [isRecording, setIsRecording] = useState(false)
  const [ttsEnergy, setTtsEnergy] = useState(0.5)
  const [error, setError] = useState<string | null>(null)
  const [currentSection, setCurrentSection] = useState<SectionName>('introduction')
  const [hintsUsed, setHintsUsed] = useState(0)
  const [totalHints, setTotalHints] = useState(0)
  const [showTranscription, setShowTranscription] = useState(initialShowTranscription)

  const router = useRouter()

  // WebRTC and Realtime API refs
  const peerConnectionRef = useRef<RTCPeerConnection | null>(null)
  const dataChannelRef = useRef<RTCDataChannel | null>(null)
  const audioElementRef = useRef<HTMLAudioElement | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null) // Mic analyser
  const audioOutputAnalyserRef = useRef<AnalyserNode | null>(null) // AI voice analyser
  const micStreamRef = useRef<MediaStream | null>(null)
  const energyIntervalRef = useRef<NodeJS.Timeout | null>(null)
  const startTimeRef = useRef<Date>(new Date())
  const isInitializedRef = useRef(false)
  const hasTriggeredGreetingRef = useRef(false)
  const isCleaningUpRef = useRef(false)
  const currentResponseIdRef = useRef<string | null>(null)

  // Initialize Realtime API connection with tool support - RUNS ONCE
  useEffect(() => {
    // Prevent double initialization (strict mode, hot reload, or re-renders)
    if (isInitializedRef.current) {
      logEvent('initialization_skipped', { reason: 'already_initialized' })
      return
    }

    logEvent('setting_initialized_flag')
    isInitializedRef.current = true

    const init = async () => {
      try {
        logEvent('initializing')

        // Get ephemeral token from our API
        const tokenResponse = await fetch('/api/realtime/token')
        if (!tokenResponse.ok) {
          throw new Error('Failed to get session token')
        }
        const { client_secret } = await tokenResponse.json()

        // Set up audio context FIRST (needed for analyzers)
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        audioContextRef.current = audioContext

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

          // Set up audio analyzer for AI voice output (for orb animation)
          try {
            const outputSource = audioContext.createMediaStreamSource(e.streams[0])
            const outputAnalyser = audioContext.createAnalyser()
            outputAnalyser.fftSize = 256
            outputAnalyser.smoothingTimeConstant = 0.8
            outputSource.connect(outputAnalyser)
            audioOutputAnalyserRef.current = outputAnalyser
            logEvent('audio_output_analyser_created')
          } catch (err) {
            logEvent('audio_analyser_error', { error: String(err) })
          }

          // Start energy animation when audio plays - use REAL audio analysis
          audioEl.onplay = () => {
            logEvent('audio_playing')
            dispatch({ type: 'LLM_RESPONSE_READY', payload: '' })

            // Clear any existing interval
            if (energyIntervalRef.current) {
              clearInterval(energyIntervalRef.current)
            }

            // Analyze real audio output for mouth-like animation
            const analyzeAudio = () => {
              if (!audioOutputAnalyserRef.current) {
                // Fallback to random animation if analyser not available
                const energy = 0.5 + Math.random() * 0.3
                setTtsEnergy(energy)
                return
              }

              const dataArray = new Uint8Array(audioOutputAnalyserRef.current.frequencyBinCount)
              audioOutputAnalyserRef.current.getByteFrequencyData(dataArray)

              // Calculate energy from frequency data (0-255)
              const sum = dataArray.reduce((a, b) => a + b, 0)
              const average = sum / dataArray.length

              // Log for debugging - remove after confirming it works
              if (Math.random() < 0.1) { // Log ~10% of samples to avoid spam
                logEvent('audio_energy_sample', { average, sum, hasAnalyser: true })
              }

              // Normalize to 0-1 range, with some baseline
              // Increase sensitivity for better visual feedback
              const energy = Math.min(1, 0.4 + (average / 128) * 0.6)
              setTtsEnergy(energy)
            }

            // Start orb animation - 20fps for smooth mouth-like movement
            energyIntervalRef.current = setInterval(analyzeAudio, 50)
            logEvent('orb_animation_started')
          }

          audioEl.onended = () => {
            logEvent('audio_ended')
            if (energyIntervalRef.current) {
              clearInterval(energyIntervalRef.current)
              energyIntervalRef.current = null
            }
            setTtsEnergy(0.5)
            dispatch({ type: 'TTS_END' })
          }

          audioEl.onpause = () => {
            logEvent('audio_paused')
            if (energyIntervalRef.current) {
              clearInterval(energyIntervalRef.current)
              energyIntervalRef.current = null
            }
            setTtsEnergy(0.5)
          }
        }

        // Get user microphone
        const stream = await getMicStream()
        micStreamRef.current = stream
        stream.getTracks().forEach((track) => pc.addTrack(track, stream))

        // Set up audio analyzer for mic visualizer
        const source = audioContext.createMediaStreamSource(stream)
        const { analyser } = createAudioAnalyzer(audioContext, source, {
          fftSize: 512,
          smoothingTimeConstant: 0.8,
        })
        analyserRef.current = analyser

        // Set up data channel for events
        const dc = pc.createDataChannel('oai-events')
        dataChannelRef.current = dc

        dc.addEventListener('open', async () => {
          logEvent('data_channel_opened')

          // Get initial section details
          const sectionResponse = await fetch('/api/voice-tools/get-case-section', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ caseId: caseData.id, attemptId }),
          })

          if (!sectionResponse.ok) {
            throw new Error('Failed to get section details')
          }

          const sectionData = await sectionResponse.json()
          const section = sectionData.section
          setTotalHints(section.hints?.length || 0)

          // Map language code to full name for instructions
          const languageMap: Record<string, string> = {
            'en': 'English',
            'es': 'Spanish',
            'fr': 'French',
            'de': 'German',
            'zh': 'Chinese',
            'ja': 'Japanese',
            'pt': 'Portuguese',
          }
          const languageName = languageMap[language] || 'English'

          // Configure the session with tools - SINGLE SESSION UPDATE
          const sessionConfig = {
            type: 'session.update',
            session: {
              model: 'gpt-4o-realtime-preview-2024-12-17',
              modalities: ['text', 'audio'],
              instructions: `# CRITICAL: LANGUAGE REQUIREMENT
YOU MUST speak, respond, and conduct this ENTIRE interview ONLY in ${languageName}.
Never switch to any other language. All your responses must be in ${languageName}.

# Role & Identity
You are an expert ${caseData.firm || 'consulting'} case interviewer conducting a realistic case interview in ${languageName}.

**Case:** ${caseData.title}
**Firm:** ${caseData.firm || 'Top Consulting Firm'}
**Industry:** ${caseData.industry}
**Difficulty Level:** ${caseData.difficulty_level}/5
**Case ID:** ${caseData.id}
**Attempt ID:** ${attemptId}

# WORKFLOW - START HERE
When the interview starts, follow these steps IN ORDER:

STEP 1: Immediately call get_case_section(caseId: "${caseData.id}", attemptId: "${attemptId}")
- This fetches essential case data you need (aircraft capacity, routes, prices, utilization, etc.)
- Wait for the response

STEP 2: After receiving the case data, immediately greet the candidate and begin:
- Greet them warmly: "Welcome! I'm your interviewer today for the ${caseData.title} case."
- Then deliver the section prompt you received from get_case_section
- Ask if they're ready to begin

STEP 3: Listen to their response and guide them through the case

# Critical Constraints
1. **Never reveal answers.** The expected_answer_summary is only for the server to grade. You must never access it or mention it.
2. **Use calc_basic for ALL arithmetic.** You MUST NOT compute numbers in your head. Call calc_basic("expression") for every calculation.
3. **Use hints only via reveal_hint.** Never give hints directly. If the candidate asks for help, call reveal_hint(attemptId).
4. **Follow section order strictly:** Introduction → Framework → Analysis → Synthesis.
5. **Scoring rules:**
   - Do NOT score the Introduction section
   - DO score Framework, Analysis, and Synthesis sections before advancing
   - Call score_response with extracted numbers and bullet reasoning for scored sections
6. **If interrupted while speaking**, stop, listen, briefly acknowledge, and continue.
7. **Section Transitions:**
   - After completing the Analysis section, score their response, then IMMEDIATELY advance and deliver the Synthesis prompt
   - DO NOT ask "Would you like to explore any more ideas?" or similar questions
   - Use a neutral transition (e.g., "Let's move to the final question" or "Thank you") and move directly to the synthesis question
   - NO positive affirmations during transitions

# Current Section Info
**Section:** ${section.name}
**Goal:** ${section.goal}
**Section Prompt:** ${section.prompt}

# Personality & Tone
You are a neutral, professional interviewer maintaining high standards.

**Content Guidelines:**
- **No positive affirmations**: Avoid "Good point," "Exactly," "Great," "Nice," "Well done," "Excellent thinking," etc.
- **No validating language**: Do not praise or affirm the candidate's responses during the interview
- **Neutral acknowledgments only**: Use "I see," "Understood," "Let's move on," or simply proceed to the next question
- **Exception**: You may use neutral transitions like "Thank you" or "Let's continue" when advancing sections
- **Professional distance**: Maintain the tone of a rigorous, competent interviewer who is evaluating, not coaching
- **Concise responses**: Keep responses to 2-3 sentences max unless explaining complex data
- **Push for clarity**: Ask follow-up questions if reasoning is unclear, but without praise

**Voice & Delivery (Critical for Natural Speech):**
- **Sound human and conversational**: Speak like a real person, not a robot reading a script
- **Use natural pacing**: Vary your speed — slow down for important points, speed up slightly for transitions
- **Add subtle vocal variety**: Use slight pitch changes to emphasize key words and maintain engagement
- **Natural pauses**: Include brief, natural pauses between thoughts (not robotic uniform spacing)
- **Conversational inflections**: Use upward inflections for questions, downward for statements
- **Section transitions**: Add warmth during transitions — let your voice signal "we're moving forward together"
- **Thinking sounds**: Occasional natural sounds like "Mm," "Alright," or brief pauses before responding add realism
- **Emotional authenticity**: Sound like you're genuinely listening and thinking, not just executing a script
- **Avoid monotone**: Each sentence should have natural rhythm and flow, like a real conversation

# Tools Available
- **get_case_section**: Fetch case data and section details (CALL THIS FIRST!)
- **reveal_hint**: Progressive hints (use sparingly, only when candidate is stuck)
- **calc_basic**: Arithmetic calculator (REQUIRED for all math)
- **score_response**: Score current section before advancing
- **advance_section**: Move to next section (only after scoring)`,
              voice: 'verse', // Expressive, natural, warm voice for human-like engagement
              turn_detection: {
                type: 'server_vad',
                threshold: 0.5,
                prefix_padding_ms: 300,
                silence_duration_ms: 500,
              },
              tools: REALTIME_TOOL_DEFINITIONS,
              tool_choice: 'auto',
            },
          }

          dc.send(JSON.stringify(sessionConfig))
          logEvent('session_config_sent')

          // Give the session a moment to configure, then trigger initial greeting ONCE
          setTimeout(() => {
            if (!hasTriggeredGreetingRef.current && !isCleaningUpRef.current) {
              hasTriggeredGreetingRef.current = true

              // Create a conversation item that prompts the AI to start
              // This is required by the Realtime API - it needs a conversation item before responding
              dc.send(JSON.stringify({
                type: 'conversation.item.create',
                item: {
                  type: 'message',
                  role: 'user',
                  content: [
                    {
                      type: 'input_text',
                      text: 'Begin the interview'
                    }
                  ]
                }
              }))

              // Now trigger the AI to respond
              dc.send(JSON.stringify({
                type: 'response.create',
                response: {
                  modalities: ['text', 'audio']
                }
              }))

              setIsRecording(true)
              logEvent('session_configured_greeting_triggered')
            }
          }, 500)
        })

        dc.addEventListener('message', async (e) => {
          try {
            const event = JSON.parse(e.data)
            logEvent('realtime_event', { type: event.type })

            // Handle different event types
            switch (event.type) {
              case 'response.created':
                // New response starting - clear old text and track response ID
                logEvent('response_created', { response_id: event.response?.id })
                currentResponseIdRef.current = event.response?.id || null
                setDisplayedText('')
                setFullTranscript('')
                break

              case 'conversation.item.created':
                if (event.item.type === 'message') {
                  const content = event.item.content?.[0]
                  if (content?.type === 'audio') {
                    const text = content.transcript || ''
                    if (text && event.item.role === 'assistant') {
                      const aiMessage: TranscriptEntry = {
                        role: 'assistant',
                        content: text,
                        timestamp: new Date().toISOString(),
                        section: currentSection,
                      }
                      setMessages((prev) => [...prev, aiMessage])
                    }
                  } else if (content?.type === 'input_audio') {
                    dispatch({ type: 'SILENCE_DETECTED' })
                  }
                }
                break

              case 'response.audio_transcript.delta':
                // Display text immediately as it arrives
                setDisplayedText((prev) => prev + event.delta)
                setFullTranscript((prev) => prev + event.delta)
                break

              case 'response.audio_transcript.done':
                // Full transcript received - ensure it's displayed
                if (event.transcript) {
                  setFullTranscript(event.transcript)
                  setDisplayedText(event.transcript)
                }
                break

              case 'response.output_item.done':
                // Save final transcript to messages
                if (event.item?.content?.[0]?.transcript) {
                  const finalTranscript = event.item.content[0].transcript
                  const aiMessage: TranscriptEntry = {
                    role: 'assistant',
                    content: finalTranscript,
                    timestamp: new Date().toISOString(),
                    section: currentSection,
                  }
                  setMessages((prev) => {
                    // Avoid duplicates - check if last message is the same
                    const lastMsg = prev[prev.length - 1]
                    if (lastMsg?.content === finalTranscript && lastMsg?.role === 'assistant') {
                      return prev
                    }
                    return [...prev, aiMessage]
                  })
                }
                break

              case 'input_audio_buffer.speech_started':
                logEvent('user_speech_started')
                dispatch({ type: 'USER_STARTED_SPEAKING' })
                break

              case 'input_audio_buffer.speech_stopped':
                logEvent('user_speech_stopped')
                // User finished speaking, now processing
                dispatch({ type: 'SILENCE_DETECTED' })
                break

              case 'response.audio.delta':
                // Audio chunks arriving
                dispatch({ type: 'LLM_RESPONSE_READY', payload: '' })
                break

              case 'response.audio.done':
                // Audio generation complete
                break

              case 'response.done':
                // Response complete, back to listening
                dispatch({ type: 'TTS_END' })
                break

              // TOOL CALLING EVENTS
              case 'response.function_call_arguments.done':
                logEvent('tool_call_received', { name: event.name, call_id: event.call_id })
                try {
                  const toolArgs = JSON.parse(event.arguments)
                  // Pass context for demo mode
                  const toolContext = {
                    caseId: caseData.id,
                    currentSection: currentSection,
                  }
                  const toolResult = await handleRealtimeTool(event.name, toolArgs, toolContext)

                  // Handle special tool responses
                  if (event.name === 'advance_section' && toolResult.next_section) {
                    setCurrentSection(toolResult.next_section)

                    // Fetch new section details
                    const newSectionResponse = await fetch('/api/voice-tools/get-case-section', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ caseId: caseData.id, attemptId }),
                    })

                    if (newSectionResponse.ok) {
                      const newSectionData = await newSectionResponse.json()
                      setTotalHints(newSectionData.section.hints?.length || 0)
                      setHintsUsed(0)
                    }
                  } else if (event.name === 'reveal_hint') {
                    setHintsUsed((prev) => prev + 1)
                  } else if (event.name === 'advance_section' && toolResult.completed) {
                    // Interview completed
                    logEvent('interview_completed')
                  }

                  // Send tool result back to Realtime API
                  const toolResponse = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: event.call_id,
                      output: JSON.stringify(toolResult),
                    },
                  }
                  dc.send(JSON.stringify(toolResponse))

                  // Trigger response generation
                  dc.send(JSON.stringify({ type: 'response.create' }))
                } catch (toolError) {
                  logEvent('tool_error', { error: String(toolError) })
                  const errorResponse = {
                    type: 'conversation.item.create',
                    item: {
                      type: 'function_call_output',
                      call_id: event.call_id,
                      output: JSON.stringify({
                        error: String(toolError),
                      }),
                    },
                  }
                  dc.send(JSON.stringify(errorResponse))
                  dc.send(JSON.stringify({ type: 'response.create' }))
                }
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
        await pc.setLocalDescription(offer)

        // Send offer to OpenAI
        const sdpResponse = await fetch('https://api.openai.com/v1/realtime', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${client_secret.value}`,
            'Content-Type': 'application/sdp',
          },
          body: offer.sdp,
        })

        if (!sdpResponse.ok) {
          throw new Error('Failed to connect to OpenAI Realtime API')
        }

        const answerSdp = await sdpResponse.text()
        await pc.setRemoteDescription({
          type: 'answer',
          sdp: answerSdp,
        })

        logEvent('realtime_connected')
      } catch (error) {
        logEvent('initialization_error', { error: String(error) })
        setError(error instanceof Error ? error.message : 'Failed to initialize')
        dispatch({ type: 'ERROR', payload: 'Failed to connect to Realtime API' })
      }
    }

    init()

    return () => {
      // Prevent re-initialization during cleanup
      isCleaningUpRef.current = true
      logEvent('cleanup_started')

      // Close data channel first to stop receiving messages
      if (dataChannelRef.current) {
        try {
          dataChannelRef.current.close()
          dataChannelRef.current = null
        } catch (e) {
          logEvent('cleanup_error', { component: 'data_channel', error: String(e) })
        }
      }

      // Close peer connection
      if (peerConnectionRef.current) {
        try {
          peerConnectionRef.current.close()
          peerConnectionRef.current = null
        } catch (e) {
          logEvent('cleanup_error', { component: 'peer_connection', error: String(e) })
        }
      }

      // Stop audio element
      if (audioElementRef.current) {
        try {
          audioElementRef.current.pause()
          audioElementRef.current.srcObject = null
          audioElementRef.current = null
        } catch (e) {
          logEvent('cleanup_error', { component: 'audio_element', error: String(e) })
        }
      }

      // Close audio context
      if (audioContextRef.current) {
        try {
          audioContextRef.current.close()
          audioContextRef.current = null
        } catch (e) {
          logEvent('cleanup_error', { component: 'audio_context', error: String(e) })
        }
      }

      // Stop microphone tracks
      if (micStreamRef.current) {
        try {
          micStreamRef.current.getTracks().forEach((track) => track.stop())
          micStreamRef.current = null
        } catch (e) {
          logEvent('cleanup_error', { component: 'mic_stream', error: String(e) })
        }
      }

      // Clear intervals
      if (energyIntervalRef.current) {
        clearInterval(energyIntervalRef.current)
        energyIntervalRef.current = null
      }

      logEvent('cleanup_completed')

      // DO NOT reset isInitializedRef - this prevents re-initialization on remount
      // isInitializedRef stays true for the lifetime of this component instance
    }
  }, [])

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
      micStreamRef.current.getTracks().forEach((track) => track.stop())
    }

    router.push(`/dashboard`)
  }

  const getCaption = () => {
    switch (sessionState) {
      case 'agent_speaking':
        return 'Interviewer speaking'
      case 'user_listening':
        return 'You can speak anytime'
      case 'processing':
        return 'Processing your response...'
      default:
        return isRecording ? 'Live conversation - speak freely' : 'Connecting to interviewer...'
    }
  }

  const getCaptionColor = () => {
    switch (sessionState) {
      case 'agent_speaking':
        return '#2196F3' // Blue when interviewer speaks
      case 'user_listening':
        return '#10b981' // Green when ready to listen
      case 'processing':
        return '#f59e0b' // Amber when thinking
      default:
        return isRecording ? '#10b981' : '#9ca3af'
    }
  }

  return (
    <div className="vs-screen">
      {/* Timeline Sidebar */}
      <TimelineSidebar currentSection={currentSection} />

      {/* Header */}
      <div style={{ position: 'absolute', top: '2rem', left: '50%', transform: 'translateX(-50%)', textAlign: 'center' }}>
        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, color: '#3A3A3A' }}>
          {caseData.title}
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#555' }}>
          {caseData.industry} • {caseData.firm} • Level {caseData.difficulty_level}/5
        </p>
      </div>

      {/* Framework Timer - Only for Hard (4) and Expert (5) difficulty */}
      <FrameworkTimer
        isActive={currentSection === 'framework'}
        difficultyLevel={caseData.difficulty_level}
      />

      {/* Hints Counter */}
      <HintsCounter used={hintsUsed} total={totalHints} />

      {/* Controls - Top Right - Hidden on small mobile to avoid overlap */}
      <div className="hidden sm:flex absolute top-4 md:top-8 left-4 md:left-auto md:right-8 gap-2 items-center z-[999]">
        {/* Transcription Toggle */}
        <button
          onClick={() => {
            const newValue = !showTranscription
            setShowTranscription(newValue)
            if (typeof window !== 'undefined') {
              localStorage.setItem('interview_show_transcription', String(newValue))
            }
          }}
          className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs md:text-sm cursor-pointer transition-colors"
          style={{
            backgroundColor: showTranscription ? 'transparent' : '#FEF3C7',
            borderColor: showTranscription ? '#555' : '#F59E0B',
            color: showTranscription ? '#555' : '#92400E',
          }}
          title={showTranscription ? 'Hide transcription (Verbal-only mode)' : 'Show transcription'}
        >
          <span className="text-sm">{showTranscription ? '👁️' : '🎧'}</span>
          <span className="hidden md:inline">{showTranscription ? 'Text' : 'Audio Only'}</span>
        </button>

        {/* End Interview Button */}
        <button
          onClick={endInterview}
          className="px-3 py-2 bg-transparent border border-gray-600 rounded-lg text-gray-600 cursor-pointer text-xs md:text-sm hover:bg-gray-50 transition-colors"
        >
          <span className="hidden md:inline">End Interview</span>
          <span className="md:hidden">End</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            backgroundColor: '#fee',
            border: '1px solid #fcc',
            borderRadius: '0.5rem',
            padding: '1rem',
            color: '#c00',
          }}
        >
          {error}
        </div>
      )}

      {/* Main content */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3rem' }}>
        {/* Agent Orb */}
        <AgentOrb mode={sessionState} energy={ttsEnergy} />

        {/* Mic Visualizer */}
        {isRecording && <MicVisualizer analyser={analyserRef.current} isActive={true} />}

        {/* Transcript Display - Streaming with Fade (Limited to ~3 lines) */}
        <div style={{
          width: '100%',
          maxWidth: '800px',
          height: '120px',
          display: 'flex',
          flexDirection: 'column-reverse',
          overflow: 'hidden',
          position: 'relative',
          padding: '0 2rem',
        }}>
          <div style={{
            fontSize: '1.125rem',
            lineHeight: '1.75rem',
            textAlign: 'center',
            color: '#1f2937',
            whiteSpace: 'pre-wrap',
            wordWrap: 'break-word',
            maxWidth: '100%',
            WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 100%)',
            maskImage: 'linear-gradient(to bottom, transparent 0%, black 25%, black 100%)',
            paddingTop: '2rem',
          }}>
            {showTranscription ? displayedText : (displayedText ? '🎧 Listening mode active' : '')}
          </div>
        </div>

        {/* Dynamic Status Indicator - Tooltip Style */}
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.5rem',
            padding: '0.5rem 1rem',
            backgroundColor: 'rgba(255, 255, 255, 0.95)',
            borderRadius: '9999px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            fontSize: '0.875rem',
            fontWeight: 500,
            color: getCaptionColor(),
            transition: 'all 0.3s ease',
            border: `1px solid ${getCaptionColor()}20`,
          }}
          aria-live="polite"
          aria-atomic="true"
        >
          <div
            style={{
              width: '0.5rem',
              height: '0.5rem',
              borderRadius: '50%',
              backgroundColor: getCaptionColor(),
              animation: sessionState === 'agent_speaking' || sessionState === 'processing'
                ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
                : 'none',
            }}
          />
          <span>{getCaption()}</span>
        </div>
      </div>
    </div>
  )
}
