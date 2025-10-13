'use client'

/**
 * HintsCounter - Displays hints usage for current section
 * Matches V1 minimal aesthetic
 */

interface HintsCounterProps {
  used: number
  total: number
}

export function HintsCounter({ used, total }: HintsCounterProps) {
  if (total === 0) {
    return null // No hints available for this section
  }

  const hasHintsRemaining = used < total

  return (
    <div
      style={{
        position: 'fixed',
        bottom: '2rem',
        left: '50%',
        transform: 'translateX(-50%)',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        padding: '0.5rem 1rem',
        backgroundColor: '#fff',
        border: '1px solid #e5e7eb',
        borderRadius: '2rem',
        fontSize: '0.875rem',
        color: '#555',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      }}
    >
      {/* Lightbulb icon */}
      <span style={{ fontSize: '1rem' }}>💡</span>

      {/* Counter */}
      <span style={{ fontWeight: 500 }}>
        Hints: {used} / {total}
      </span>

      {/* Status indicator */}
      {hasHintsRemaining && (
        <div
          style={{
            width: '6px',
            height: '6px',
            borderRadius: '50%',
            backgroundColor: '#2196F3',
            marginLeft: '0.25rem',
          }}
        />
      )}
    </div>
  )
}
