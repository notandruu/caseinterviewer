/**
 * Voice Session V2 Types
 */

export type SessionState =
  | 'agent_speaking'
  | 'user_listening'
  | 'processing'

export type CaseStage =
  | 'intro'
  | 'clarifying'
  | 'structuring'
  | 'analysis'
  | 'brainstorming'
  | 'synthesis'

export type SessionEvent =
  | { type: 'TTS_END' }
  | { type: 'SILENCE_DETECTED' }
  | { type: 'LLM_RESPONSE_READY'; payload: string }
  | { type: 'ERROR'; payload: string }
  | { type: 'STAGE_CHANGE'; payload: CaseStage }

export interface VoiceSessionProps {
  caseData: {
    id: string
    title: string
    description: string
    prompt: string
    industry: string
    difficulty: string
  }
  interviewId: string
  userId: string
}

export interface TranscriptMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
}
