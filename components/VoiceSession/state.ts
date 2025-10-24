/**
 * Voice Session State Machine
 *
 * States: agent_speaking -> user_listening -> processing -> agent_speaking
 *
 * Triggers:
 * - TTS_END -> user_listening
 * - SILENCE_DETECTED (>1000ms & RMS<0.01) -> processing
 * - LLM_RESPONSE_READY -> agent_speaking
 * - ERROR -> agent_speaking (show "let's try that again")
 */

import { SessionState, SessionEvent } from './types'

export function reducer(state: SessionState, event: SessionEvent): SessionState {
  switch (state) {
    case 'agent_speaking':
      if (event.type === 'TTS_END') {
        return 'user_listening'
      }
      return state

    case 'user_listening':
      if (event.type === 'SILENCE_DETECTED') {
        return 'processing'
      }
      if (event.type === 'ERROR') {
        return 'agent_speaking' // Return to agent after error
      }
      return state

    case 'processing':
      if (event.type === 'LLM_RESPONSE_READY') {
        return 'agent_speaking'
      }
      if (event.type === 'ERROR') {
        return 'agent_speaking'
      }
      return state

    default:
      return state
  }
}

export const INITIAL_STATE: SessionState = 'agent_speaking'

/**
 * Processing captions (randomized)
 */
const PROCESSING_CAPTIONS = [
  'thinking…',
  'analyzing…',
  'considering…',
  'processing…',
  'evaluating…',
]

export function getProcessingCaption(): string {
  return PROCESSING_CAPTIONS[Math.floor(Math.random() * PROCESSING_CAPTIONS.length)]
}
