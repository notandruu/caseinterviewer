'use client'

import { useEffect, useRef } from 'react'
import '../../styles/voice-session.css'

interface MicVisualizerProps {
  analyser: AnalyserNode | null
  isActive: boolean
}

const BAR_COUNT = 40
const SMOOTHING_ALPHA = 0.35

export function MicVisualizer({ analyser, isActive }: MicVisualizerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const smoothedDataRef = useRef<number[]>(new Array(BAR_COUNT).fill(0))
  const animationFrameRef = useRef<number>()

  useEffect(() => {
    if (!isActive || !analyser) {
      // Reset to flat line when inactive
      smoothedDataRef.current = new Array(BAR_COUNT).fill(0)
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const bufferLength = analyser.frequencyBinCount
    const dataArray = new Uint8Array(bufferLength)

    const draw = () => {
      if (!isActive) return

      analyser.getByteFrequencyData(dataArray)

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const barWidth = canvas.width / BAR_COUNT
      const maxHeight = canvas.height * 0.7

      for (let i = 0; i < BAR_COUNT; i++) {
        // Map to frequency data
        const dataIndex = Math.floor((i * bufferLength) / BAR_COUNT)
        const amplitude = dataArray[dataIndex] / 255

        // Apply EMA smoothing
        const currentSmoothed = smoothedDataRef.current[i]
        const newSmoothed = SMOOTHING_ALPHA * amplitude + (1 - SMOOTHING_ALPHA) * currentSmoothed
        smoothedDataRef.current[i] = newSmoothed

        // Calculate bar height
        const barHeight = Math.max(2, newSmoothed * maxHeight)
        const x = i * barWidth
        const y = (canvas.height - barHeight) / 2

        // Color based on activity
        ctx.fillStyle = newSmoothed > 0.1 ? '#3A3A3A' : '#555' // Grey or secondary grey

        ctx.fillRect(
          x + barWidth * 0.2,
          y,
          barWidth * 0.6,
          barHeight
        )
      }

      animationFrameRef.current = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current)
      }
    }
  }, [analyser, isActive])

  return (
    <div className="vs-mic-visualizer">
      <canvas
        ref={canvasRef}
        width={400}
        height={60}
        className="rounded"
        style={{ backgroundColor: 'transparent' }}
      />
    </div>
  )
}
