/**
 * Feature flags for gradual rollout
 */

export const features = {
  /**
   * Voice Session V2 - Redesigned interview experience
   * Default: false (V1 active)
   */
  voiceSessionV2: process.env.NEXT_PUBLIC_VOICE_SESSION_V2_ENABLED === 'true',
} as const

/**
 * Helper to check if Voice Session V2 is enabled
 */
export function isV2Enabled(): boolean {
  return features.voiceSessionV2
}
