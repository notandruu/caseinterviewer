'use client'

/**
 * FrameworkTimer - 2-minute countdown timer for framework section
 * Only shows for Hard (4) and Expert (5) difficulty levels
 * Toggleable for Hard, always-on for Expert
 */

import { useState, useEffect } from 'react'
import { X, Clock } from 'lucide-react'

interface FrameworkTimerProps {
  isActive: boolean // Whether we're in the framework section
  difficultyLevel: number // 1-5 scale
  onComplete?: () => void // Optional callback when timer hits 0
}

export function FrameworkTimer({ isActive, difficultyLevel, onComplete }: FrameworkTimerProps) {
  const [secondsRemaining, setSecondsRemaining] = useState(120) // 2 minutes
  const [isVisible, setIsVisible] = useState(true)
  const [hasStarted, setHasStarted] = useState(false)

  // Determine if timer should be shown based on difficulty
  const shouldShowTimer = difficultyLevel >= 4 // Hard (4) or Expert (5)
  const canToggle = difficultyLevel === 4 // Only Hard mode can toggle

  // Reset timer when section becomes active
  useEffect(() => {
    if (isActive && !hasStarted) {
      setSecondsRemaining(120)
      setIsVisible(true)
      setHasStarted(true)
    }
    if (!isActive) {
      setHasStarted(false)
    }
  }, [isActive, hasStarted])

  // Countdown logic
  useEffect(() => {
    if (!isActive || !shouldShowTimer || !isVisible || secondsRemaining <= 0) {
      return
    }

    const interval = setInterval(() => {
      setSecondsRemaining((prev) => {
        const next = prev - 1
        if (next <= 0 && onComplete) {
          onComplete()
        }
        return Math.max(0, next)
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [isActive, shouldShowTimer, isVisible, secondsRemaining, onComplete])

  // Don't render if difficulty doesn't require timer or if not active
  if (!shouldShowTimer || !isActive || (!isVisible && canToggle)) {
    return null
  }

  // Format time as MM:SS
  const minutes = Math.floor(secondsRemaining / 60)
  const seconds = secondsRemaining % 60
  const timeString = `${minutes}:${seconds.toString().padStart(2, '0')}`

  // Determine urgency styling
  const isUrgent = secondsRemaining <= 30
  const isWarning = secondsRemaining <= 60 && secondsRemaining > 30

  return (
    <div
      className="fixed top-4 right-4 md:top-8 md:right-8 flex items-center gap-2 md:gap-3 px-3 py-2 md:px-5 md:py-3 rounded-full shadow-lg z-[1000] transition-all"
      style={{
        backgroundColor: isUrgent ? '#FEE2E2' : isWarning ? '#FEF3C7' : '#fff',
        border: `2px solid ${isUrgent ? '#EF4444' : isWarning ? '#F59E0B' : '#e5e7eb'}`,
        color: isUrgent ? '#991B1B' : isWarning ? '#92400E' : '#555',
        fontWeight: 600,
      }}
    >
      {/* Clock icon */}
      <Clock
        className="h-4 w-4 md:h-5 md:w-5"
        style={{
          color: isUrgent ? '#DC2626' : isWarning ? '#D97706' : '#2196F3',
        }}
      />

      {/* Timer display */}
      <span className="font-mono text-base md:text-lg min-w-[3rem] md:min-w-[3.5rem] text-center">
        {timeString}
      </span>

      {/* Close button - only for Hard mode */}
      {canToggle && (
        <button
          onClick={() => setIsVisible(false)}
          className="flex items-center justify-center p-1 bg-transparent border-none cursor-pointer rounded-full transition-colors hover:bg-black/5"
          aria-label="Hide timer"
        >
          <X className="h-3 w-3 md:h-4 md:w-4" />
        </button>
      )}

      {/* Expert mode indicator - hide on mobile */}
      {difficultyLevel === 5 && (
        <div className="hidden sm:block text-xs text-gray-600 font-medium ml-2 pl-3 border-l border-gray-300">
          EXPERT
        </div>
      )}
    </div>
  )
}
