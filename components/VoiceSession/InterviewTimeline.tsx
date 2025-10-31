import { CaseStage } from './types'

interface InterviewTimelineProps {
  currentStage: CaseStage
}

const stages = [
  { id: 'intro' as CaseStage, label: 'Introduction', shortLabel: 'Intro' },
  { id: 'structuring' as CaseStage, label: 'Framework', shortLabel: 'Framework' },
  { id: 'analysis' as CaseStage, label: 'Analysis', shortLabel: 'Analysis' },
  { id: 'synthesis' as CaseStage, label: 'Synthesis', shortLabel: 'Synthesis' },
]

export function InterviewTimeline({ currentStage }: InterviewTimelineProps) {
  const currentIndex = stages.findIndex(s => s.id === currentStage)

  return (
    <div className="fixed left-6 top-1/2 -translate-y-1/2 flex flex-col gap-8">
      {stages.map((stage, index) => {
        const isActive = stage.id === currentStage
        const isCompleted = currentIndex > index
        const isPending = currentIndex < index

        return (
          <div key={stage.id} className="flex items-center gap-3">
            {/* Stage indicator */}
            <div className="relative">
              {/* Connector line */}
              {index < stages.length - 1 && (
                <div
                  className={`absolute left-1/2 top-full -translate-x-1/2 w-0.5 h-8 transition-colors duration-300 ${
                    isCompleted ? 'bg-blue-500' : 'bg-gray-300'
                  }`}
                />
              )}

              {/* Circle */}
              <div
                className={`relative z-10 w-3 h-3 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'bg-blue-500 ring-4 ring-blue-100'
                    : isCompleted
                    ? 'bg-blue-500'
                    : 'bg-gray-300'
                }`}
              />
            </div>

            {/* Stage label */}
            <span
              className={`text-sm transition-colors duration-300 ${
                isActive
                  ? 'text-gray-900 font-medium'
                  : isCompleted
                  ? 'text-gray-600'
                  : 'text-gray-400'
              }`}
            >
              {stage.shortLabel}
            </span>
          </div>
        )
      })}
    </div>
  )
}
