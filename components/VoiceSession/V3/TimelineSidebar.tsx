'use client'

/**
 * TimelineSidebar - Visual section progress indicator
 * Matches V1 minimal aesthetic
 */

import type { SectionName } from '@/types/cases'

interface TimelineSidebarProps {
  currentSection: SectionName
}

const SECTIONS: { name: SectionName; label: string }[] = [
  { name: 'introduction', label: 'Introduction' },
  { name: 'framework', label: 'Framework' },
  { name: 'analysis', label: 'Analysis' },
  { name: 'synthesis', label: 'Synthesis' },
]

export function TimelineSidebar({ currentSection }: TimelineSidebarProps) {
  const currentIndex = SECTIONS.findIndex((s) => s.name === currentSection)

  return (
    <div
      style={{
        position: 'fixed',
        left: '2rem',
        top: '50%',
        transform: 'translateY(-50%)',
        display: 'flex',
        flexDirection: 'column',
        gap: '2rem',
        zIndex: 10,
      }}
    >
      {SECTIONS.map((section, index) => {
        const isCompleted = index < currentIndex
        const isCurrent = index === currentIndex
        const isLocked = index > currentIndex

        return (
          <div
            key={section.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.75rem',
              opacity: isLocked ? 0.3 : 1,
              transition: 'opacity 0.3s ease',
            }}
          >
            {/* Circle indicator */}
            <div
              style={{
                width: '2rem',
                height: '2rem',
                borderRadius: '50%',
                backgroundColor: isCompleted
                  ? '#4ade80'
                  : isCurrent
                  ? '#2196F3'
                  : '#e5e7eb',
                border: isCurrent ? '2px solid #2196F3' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.875rem',
                fontWeight: 600,
                color: isCompleted || isCurrent ? '#fff' : '#9ca3af',
                transition: 'all 0.3s ease',
                boxShadow: isCurrent ? '0 0 0 4px rgba(33, 150, 243, 0.1)' : 'none',
              }}
            >
              {isCompleted ? '✓' : index + 1}
            </div>

            {/* Label */}
            <div
              style={{
                fontSize: '0.875rem',
                fontWeight: isCurrent ? 600 : 400,
                color: isCompleted || isCurrent ? '#3A3A3A' : '#9ca3af',
                transition: 'all 0.3s ease',
              }}
            >
              {section.label}
            </div>
          </div>
        )
      })}

      {/* Connecting line */}
      <div
        style={{
          position: 'absolute',
          left: '1rem',
          top: '2rem',
          bottom: '2rem',
          width: '2px',
          backgroundColor: '#e5e7eb',
          zIndex: -1,
        }}
      >
        {/* Progress line */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: `${(currentIndex / (SECTIONS.length - 1)) * 100}%`,
            backgroundColor: '#2196F3',
            transition: 'height 0.5s ease',
          }}
        />
      </div>
    </div>
  )
}
