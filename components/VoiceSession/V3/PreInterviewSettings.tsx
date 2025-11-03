'use client'

/**
 * PreInterviewSettings - Configuration screen before starting voice interview
 * Allows language selection and microphone testing
 */

import { useState, useEffect, useRef } from 'react'
import { getMicStream } from '@/lib/audio/analyzer'
import type { ClientCase } from '@/types/cases'

interface PreInterviewSettingsProps {
  caseData: ClientCase
  onStart: (settings: InterviewSettings) => void
}

export interface InterviewSettings {
  language: string
  voice?: string
  showTranscription: boolean // Toggle for on-screen text display
}

const LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'es', name: 'Español', flag: '🇪🇸' },
  { code: 'fr', name: 'Français', flag: '🇫🇷' },
  { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
  { code: 'zh', name: '中文', flag: '🇨🇳' },
  { code: 'ja', name: '日本語', flag: '🇯🇵' },
  { code: 'pt', name: 'Português', flag: '🇧🇷' },
]

export function PreInterviewSettings({ caseData, onStart }: PreInterviewSettingsProps) {
  const [selectedLanguage, setSelectedLanguage] = useState('en')
  const [showTranscription, setShowTranscription] = useState(() => {
    // Load from localStorage, default to true
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('interview_show_transcription')
      return saved !== null ? saved === 'true' : true
    }
    return true
  })
  const [micPermission, setMicPermission] = useState<'pending' | 'granted' | 'denied'>('pending')
  const [micLevel, setMicLevel] = useState(0)
  const [isTestingMic, setIsTestingMic] = useState(false)
  const micStreamRef = useRef<MediaStream | null>(null)
  const animationFrameRef = useRef<number | null>(null)

  const testMicrophone = async () => {
    try {
      setIsTestingMic(true)
      const stream = await getMicStream()
      micStreamRef.current = stream
      setMicPermission('granted')

      // Set up audio analyzer for visualizer
      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      const dataArray = new Uint8Array(analyser.frequencyBinCount)

      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray)
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length
        setMicLevel(average / 255) // Normalize to 0-1
        animationFrameRef.current = requestAnimationFrame(updateLevel)
      }

      updateLevel()
    } catch (error) {
      console.error('Microphone test failed:', error)
      setMicPermission('denied')
      setIsTestingMic(false)
    }
  }

  const stopMicTest = () => {
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((track) => track.stop())
      micStreamRef.current = null
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
    }
    setIsTestingMic(false)
    setMicLevel(0)
  }

  useEffect(() => {
    return () => {
      stopMicTest()
    }
  }, [])

  const handleStart = () => {
    stopMicTest()
    // Save transcription preference to localStorage
    if (typeof window !== 'undefined') {
      localStorage.setItem('interview_show_transcription', String(showTranscription))
    }
    onStart({ language: selectedLanguage, showTranscription })
  }

  const toggleTranscription = () => {
    const newValue = !showTranscription
    setShowTranscription(newValue)
    // Save immediately on toggle
    if (typeof window !== 'undefined') {
      localStorage.setItem('interview_show_transcription', String(newValue))
    }
  }

  const canStart = micPermission === 'granted'

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4">
      <div className="max-w-2xl w-full">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Interview Setup</h1>
          <p className="text-gray-600">{caseData.title}</p>
          <p className="text-sm text-gray-500 mt-1">
            {caseData.firm} • {caseData.industry} • Level {caseData.difficulty_level}/5
          </p>
        </div>

        {/* Settings Card */}
        <div className="bg-white border border-gray-200 rounded-2xl p-8 shadow-sm">
          {/* Language Selection */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-900 mb-4">
              Interview Language
            </label>
            <div className="grid grid-cols-2 gap-3">
              {LANGUAGES.map((lang) => (
                <button
                  key={lang.code}
                  onClick={() => setSelectedLanguage(lang.code)}
                  className={`
                    flex items-center gap-3 px-4 py-3 rounded-lg border-2 transition-all
                    ${
                      selectedLanguage === lang.code
                        ? 'border-[#2196F3] bg-[#2196F3]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="text-2xl">{lang.flag}</span>
                  <span
                    className={`font-medium ${
                      selectedLanguage === lang.code ? 'text-[#2196F3]' : 'text-gray-700'
                    }`}
                  >
                    {lang.name}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Transcription Toggle */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-900 mb-4">
              Display Mode
            </label>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-sm font-medium text-gray-900">
                      Show On-Screen Transcription
                    </span>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${showTranscription ? 'bg-green-100 text-green-800' : 'bg-gray-200 text-gray-700'}`}>
                      {showTranscription ? 'Enabled' : 'Disabled'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-600 leading-relaxed">
                    {showTranscription
                      ? "You'll see text as the interviewer speaks. Good for practice."
                      : "Verbal-only mode: no text displayed. Simulates a real interview where you must listen carefully."}
                  </p>
                </div>
                <button
                  onClick={toggleTranscription}
                  className={`
                    relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent
                    transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#2196F3] focus:ring-offset-2
                    ${showTranscription ? 'bg-[#2196F3]' : 'bg-gray-300'}
                  `}
                  role="switch"
                  aria-checked={showTranscription}
                >
                  <span
                    className={`
                      pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0
                      transition duration-200 ease-in-out
                      ${showTranscription ? 'translate-x-5' : 'translate-x-0'}
                    `}
                  />
                </button>
              </div>

              {!showTranscription && (
                <div className="mt-3 pt-3 border-t border-gray-200">
                  <div className="flex items-start gap-2">
                    <svg className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-xs text-amber-800">
                      <strong>Challenge Mode:</strong> You'll need to listen carefully and take notes.
                      This mode is recommended for advanced preparation.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Microphone Test */}
          <div className="mb-8">
            <label className="block text-sm font-semibold text-gray-900 mb-4">
              Microphone Check
            </label>

            {micPermission === 'pending' && (
              <div className="text-center py-8">
                <div className="mb-4">
                  <svg
                    className="w-12 h-12 mx-auto text-gray-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  We need access to your microphone to conduct the interview
                </p>
                <button
                  onClick={testMicrophone}
                  className="px-6 py-2 bg-[#2196F3] text-white rounded-lg hover:bg-[#1976D2] transition-colors"
                >
                  Test Microphone
                </button>
              </div>
            )}

            {micPermission === 'granted' && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-medium text-green-900">
                    Microphone Active
                  </span>
                </div>

                {/* Mic level visualizer */}
                {isTestingMic && (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600">Speak to test your microphone:</p>
                    <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#2196F3] transition-all duration-100"
                        style={{ width: `${micLevel * 100}%` }}
                      />
                    </div>
                  </div>
                )}

                <button
                  onClick={isTestingMic ? stopMicTest : testMicrophone}
                  className="mt-3 text-sm text-[#2196F3] hover:underline"
                >
                  {isTestingMic ? 'Stop Test' : 'Test Again'}
                </button>
              </div>
            )}

            {micPermission === 'denied' && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-center gap-3 mb-2">
                  <svg
                    className="w-5 h-5 text-red-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                  <span className="text-sm font-medium text-red-900">
                    Microphone Access Denied
                  </span>
                </div>
                <p className="text-xs text-red-700 mb-3">
                  Please allow microphone access in your browser settings and try again.
                </p>
                <button
                  onClick={testMicrophone}
                  className="text-sm text-red-600 hover:underline"
                >
                  Try Again
                </button>
              </div>
            )}
          </div>

          {/* Interview Info */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <h3 className="font-semibold text-sm text-gray-900 mb-2">What to Expect</h3>
            <ul className="text-xs text-gray-700 space-y-1">
              <li>• Voice-based case interview with AI interviewer</li>
              <li>• Four sections: Introduction → Framework → Analysis → Synthesis</li>
              <li>• Speak naturally, the AI will guide you through each section</li>
              <li>• You can ask for hints if you get stuck</li>
              <li>• The interview typically takes 20-30 minutes</li>
            </ul>
          </div>

          {/* Start Button */}
          <button
            onClick={handleStart}
            disabled={!canStart}
            className={`
              w-full py-4 rounded-lg font-semibold text-white transition-all
              ${
                canStart
                  ? 'bg-[#2196F3] hover:bg-[#1976D2] cursor-pointer'
                  : 'bg-gray-300 cursor-not-allowed'
              }
            `}
          >
            {canStart ? 'Start Interview' : 'Complete Microphone Check First'}
          </button>
        </div>

        {/* Footer */}
        <div className="text-center mt-6">
          <button
            onClick={() => window.history.back()}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ← Back to Dashboard
          </button>
        </div>
      </div>
    </div>
  )
}
