/**
 * Web Audio API utilities for microphone analysis
 */

export interface AudioAnalyzerConfig {
  fftSize?: number
  smoothingTimeConstant?: number
  silenceThreshold?: number
  silenceDuration?: number
}

const DEFAULT_CONFIG: Required<AudioAnalyzerConfig> = {
  fftSize: 512,
  smoothingTimeConstant: 0.8,
  silenceThreshold: 0.01,
  silenceDuration: 1000, // ms
}

/**
 * Get microphone stream
 */
export async function getMicStream(): Promise<MediaStream> {
  try {
    return await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      }
    })
  } catch (error) {
    console.error('[AudioAnalyzer] Failed to get mic stream:', error)
    throw new Error('Microphone access denied')
  }
}

/**
 * Create RMS (Root Mean Square) meter for audio level detection
 * Returns smoothed RMS value [0, 1]
 */
export function createRMSMeter(
  audioContext: AudioContext,
  source: MediaStreamAudioSourceNode,
  alpha: number = 0.35 // EMA smoothing factor
): {
  getRMS: () => number
  getSmoothedRMS: () => number
  cleanup: () => void
} {
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 512
  analyser.smoothingTimeConstant = 0.8

  source.connect(analyser)

  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)

  let smoothedRMS = 0

  const getRMS = (): number => {
    analyser.getByteTimeDomainData(dataArray)

    let sum = 0
    for (let i = 0; i < bufferLength; i++) {
      const normalized = (dataArray[i] - 128) / 128
      sum += normalized * normalized
    }

    return Math.sqrt(sum / bufferLength)
  }

  const getSmoothedRMS = (): number => {
    const currentRMS = getRMS()
    // Exponential Moving Average (EMA)
    smoothedRMS = alpha * currentRMS + (1 - alpha) * smoothedRMS
    return smoothedRMS
  }

  const cleanup = () => {
    source.disconnect(analyser)
  }

  return { getRMS, getSmoothedRMS, cleanup }
}

/**
 * Silence detector with configurable threshold and duration
 */
export function createSilenceDetector(
  getRMS: () => number,
  config: Partial<AudioAnalyzerConfig> = {}
): {
  checkSilence: () => boolean
  reset: () => void
  cleanup: () => void
} {
  const { silenceThreshold, silenceDuration } = { ...DEFAULT_CONFIG, ...config }

  let silenceStartTime: number | null = null
  let isSilent = false

  const checkSilence = (): boolean => {
    const rms = getRMS()
    const now = Date.now()

    if (rms < silenceThreshold) {
      if (silenceStartTime === null) {
        silenceStartTime = now
      } else if (now - silenceStartTime >= silenceDuration) {
        if (!isSilent) {
          isSilent = true
          return true // Silence detected
        }
      }
    } else {
      // Reset when sound detected
      silenceStartTime = null
      isSilent = false
    }

    return false
  }

  const reset = () => {
    silenceStartTime = null
    isSilent = false
  }

  const cleanup = () => {
    reset()
  }

  return { checkSilence, reset, cleanup }
}

/**
 * Complete audio analyzer with frequency data for visualization
 */
export function createAudioAnalyzer(
  audioContext: AudioContext,
  source: MediaStreamAudioSourceNode,
  config: Partial<AudioAnalyzerConfig> = {}
): {
  analyser: AnalyserNode
  getFrequencyData: () => Uint8Array
  getRMS: () => number
  cleanup: () => void
} {
  const { fftSize, smoothingTimeConstant } = { ...DEFAULT_CONFIG, ...config }

  const analyser = audioContext.createAnalyser()
  analyser.fftSize = fftSize
  analyser.smoothingTimeConstant = smoothingTimeConstant

  source.connect(analyser)

  const bufferLength = analyser.frequencyBinCount
  const dataArray = new Uint8Array(bufferLength)
  const timeDataArray = new Uint8Array(bufferLength)

  const getFrequencyData = (): Uint8Array => {
    analyser.getByteFrequencyData(dataArray)
    return dataArray
  }

  const getRMS = (): number => {
    analyser.getByteTimeDomainData(timeDataArray)

    let sum = 0
    for (let i = 0; i < bufferLength; i++) {
      const normalized = (timeDataArray[i] - 128) / 128
      sum += normalized * normalized
    }

    return Math.sqrt(sum / bufferLength)
  }

  const cleanup = () => {
    source.disconnect(analyser)
  }

  return { analyser, getFrequencyData, getRMS, cleanup }
}
