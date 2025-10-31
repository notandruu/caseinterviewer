'use client'

import { useState } from 'react'
import { SessionState } from './types'
import '../../styles/voice-session.css'

interface AgentOrbProps {
  mode: SessionState
  energy?: number // 0-1, for speaking mode
}

export function AgentOrb({ mode, energy = 0.5 }: AgentOrbProps) {
  const [isHovered, setIsHovered] = useState(false)

  const getOrbClass = () => {
    switch (mode) {
      case 'agent_speaking':
        return 'vs-orb vs-orb--speaking'
      case 'processing':
        return 'vs-orb vs-orb--processing'
      case 'user_listening':
      default:
        return 'vs-orb vs-orb--listening'
    }
  }

  // Calculate opacity based on energy for speaking mode
  const opacity = mode === 'agent_speaking' ? 0.9 + (energy * 0.1) : 1

  return (
    <div className="relative flex items-center justify-center">
      <div
        className={getOrbClass()}
        style={{
          width: '240px',
          height: '240px',
          borderRadius: '50%',
          backgroundColor: '#2196F3', // Blue
          opacity,
          willChange: mode === 'user_listening' ? 'auto' : 'transform, opacity',
          filter: isHovered ? 'brightness(0.85)' : 'brightness(1)',
          transition: 'filter 0.2s ease',
          cursor: 'pointer',
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        aria-label={`Agent ${mode.replace('_', ' ')}`}
      />
    </div>
  )
}
