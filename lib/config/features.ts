export const features = { voiceSessionV2: process.env.NEXT_PUBLIC_VOICE_SESSION_V2_ENABLED === 'true' } as const; export function isV2Enabled(): boolean { return features.voiceSessionV2 }
