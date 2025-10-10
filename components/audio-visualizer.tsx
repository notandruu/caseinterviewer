"use client"

import { useEffect, useRef, useState } from "react"

interface AudioVisualizerProps {
  isActive: boolean
  isListening: boolean
}

export function AudioVisualizer({ isActive, isListening }: AudioVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const audioContextRef = useRef<AudioContext | null>(null)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)
  const [micPermissionGranted, setMicPermissionGranted] = useState(false)

  // Initialize audio context and analyzer when listening starts
  useEffect(() => {
    if (!isListening) return

    const initAudio = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true })

        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
        const analyser = audioContext.createAnalyser()
        const microphone = audioContext.createMediaStreamSource(stream)

        analyser.fftSize = 128 // Smaller for smoother bars
        const bufferLength = analyser.frequencyBinCount
        const dataArray = new Uint8Array(bufferLength)

        microphone.connect(analyser)

        audioContextRef.current = audioContext
        analyserRef.current = analyser
        dataArrayRef.current = dataArray
        setMicPermissionGranted(true)
      } catch (err) {
        console.error("Error accessing microphone:", err)
      }
    }

    initAudio()

    return () => {
      if (audioContextRef.current) {
        audioContextRef.current.close()
      }
    }
  }, [isListening])

  // Draw visualization
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const bars = 40
    const barWidth = canvas.width / bars
    const centerY = canvas.height / 2

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      if (isListening && analyserRef.current && dataArrayRef.current) {
        // Get frequency data from microphone
        analyserRef.current.getByteFrequencyData(dataArrayRef.current)

        for (let i = 0; i < bars; i++) {
          // Map bar index to frequency data (use lower frequencies for voice)
          const dataIndex = Math.floor(i * dataArrayRef.current.length / bars)
          const amplitude = dataArrayRef.current[dataIndex] / 255 // Normalize 0-1

          // Calculate bar height based on actual audio input
          const maxHeight = canvas.height * 0.7
          const minHeight = 2 // Minimum height for flat line
          const height = amplitude > 0.05 ? amplitude * maxHeight : minHeight

          const x = i * barWidth
          const y = centerY - height / 2

          // Color based on amplitude (green when speaking, gray when silent)
          if (amplitude > 0.1) {
            ctx.fillStyle = "rgb(34, 197, 94)" // Green
          } else {
            ctx.fillStyle = "rgb(209, 213, 219)" // Gray
          }

          ctx.fillRect(x + barWidth * 0.2, y, barWidth * 0.6, height)
        }
      } else if (isListening) {
        // Flat line when waiting for mic permission
        for (let i = 0; i < bars; i++) {
          const x = i * barWidth
          const y = centerY - 1
          ctx.fillStyle = "rgb(209, 213, 219)"
          ctx.fillRect(x + barWidth * 0.2, y, barWidth * 0.6, 2)
        }
      }

      animationRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [isListening, micPermissionGranted])

  return (
    <div className="relative flex flex-col items-center gap-4">
      <div className="relative flex items-center justify-center">
        <div className="relative h-64 w-64">
          {/* Main blob circle */}
          <div
            className={`absolute inset-0 rounded-full bg-yellow-400 transition-all duration-300 ${
              isActive ? "animate-blob-morph shadow-[0_0_60px_rgba(250,204,21,0.6)]" : ""
            }`}
            style={{
              willChange: isActive ? "border-radius, transform" : "auto",
            }}
          />

          {/* Secondary blob layer for more organic movement */}
          <div
            className={`absolute inset-2 rounded-full bg-yellow-400/80 transition-all duration-300 ${
              isActive ? "animate-blob-morph-alt" : ""
            }`}
            style={{
              willChange: isActive ? "border-radius, transform" : "auto",
            }}
          />

          {/* Inner glow layer */}
          <div
            className={`absolute inset-8 rounded-full bg-yellow-300/60 transition-all duration-300 ${
              isActive ? "animate-blob-pulse" : ""
            }`}
            style={{
              willChange: isActive ? "transform, opacity" : "auto",
            }}
          />
        </div>
      </div>

      {isListening && (
        <div className="flex flex-col items-center gap-2">
          <canvas ref={canvasRef} width={400} height={80} className="rounded-lg bg-white/50 backdrop-blur-sm p-2" />
          {!micPermissionGranted && (
            <p className="text-xs text-muted-foreground">Waiting for microphone access...</p>
          )}
        </div>
      )}
    </div>
  )
}
