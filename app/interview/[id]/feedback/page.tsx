'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, XCircle, ArrowRight, Home } from 'lucide-react'

interface FeedbackData {
  overall_score: number
  strengths: string[]
  improvements: string[]
  framework_feedback: string
  analysis_feedback: string
  synthesis_feedback: string
}

export default function FeedbackPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [feedback, setFeedback] = useState<FeedbackData | null>(null)
  const [caseTitle, setCaseTitle] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  const { id } = use(params)

  useEffect(() => {
    async function loadFeedback() {
      try {
        // Fetch interview data
        const { data: interview } = await supabase
          .from('interviews')
          .select('*, cases(title)')
          .eq('id', id)
          .single()

        if (interview) {
          setCaseTitle(interview.cases?.title || 'Your Interview')

          // Check if feedback exists
          if (interview.feedback) {
            setFeedback(interview.feedback)
          } else {
            // Generate placeholder feedback
            setFeedback({
              overall_score: 75,
              strengths: [
                'Strong framework development',
                'Clear communication throughout',
                'Good use of structured thinking'
              ],
              improvements: [
                'Consider more quantitative analysis',
                'Explore alternative solutions',
                'Provide more specific recommendations'
              ],
              framework_feedback: 'Your framework was well-structured and covered the key areas. Consider adding more depth to your cost analysis.',
              analysis_feedback: 'Good analytical thinking. Try to be more hypothesis-driven and explicit about your assumptions.',
              synthesis_feedback: 'Your recommendation was clear, but could benefit from more supporting evidence and risk considerations.'
            })
          }
        }
      } catch (error) {
        console.error('Error loading feedback:', error)
      } finally {
        setLoading(false)
      }
    }

    loadFeedback()
  }, [id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-3 w-3 rounded-full bg-[#2196F3] animate-pulse" />
      </div>
    )
  }

  if (!feedback) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600 mb-4">Feedback not available</p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-6 py-3 bg-black text-white rounded-2xl hover:bg-black/90 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-[#2196F3]'
    return 'text-orange-600'
  }

  const getScoreLabel = (score: number) => {
    if (score >= 80) return 'Excellent'
    if (score >= 60) return 'Good'
    return 'Needs Improvement'
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-2xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-12">
          <h1 className="text-3xl font-bold mb-2">Interview Complete</h1>
          <p className="text-gray-600">{caseTitle}</p>
        </div>

        {/* Overall Score */}
        <div className="mb-12">
          <div className="bg-gray-50 rounded-2xl p-8 text-center">
            <p className="text-sm text-gray-600 mb-2">Overall Performance</p>
            <p className={`text-6xl font-bold mb-2 ${getScoreColor(feedback.overall_score)}`}>
              {feedback.overall_score}%
            </p>
            <p className="text-lg text-gray-700">{getScoreLabel(feedback.overall_score)}</p>
          </div>
        </div>

        {/* Strengths */}
        <div className="mb-8">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-600" />
            Strengths
          </h2>
          <div className="space-y-3">
            {feedback.strengths.map((strength, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-green-600 mt-2 flex-shrink-0" />
                <p className="text-gray-700">{strength}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Areas for Improvement */}
        <div className="mb-12">
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <XCircle className="w-5 h-5 text-orange-600" />
            Areas for Improvement
          </h2>
          <div className="space-y-3">
            {feedback.improvements.map((improvement, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="w-1.5 h-1.5 rounded-full bg-orange-600 mt-2 flex-shrink-0" />
                <p className="text-gray-700">{improvement}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Detailed Feedback */}
        <div className="space-y-6 mb-12">
          <div>
            <h3 className="font-semibold mb-2">Framework Development</h3>
            <p className="text-gray-700 leading-relaxed">{feedback.framework_feedback}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Analysis</h3>
            <p className="text-gray-700 leading-relaxed">{feedback.analysis_feedback}</p>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Synthesis & Recommendation</h3>
            <p className="text-gray-700 leading-relaxed">{feedback.synthesis_feedback}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-gray-100 text-black rounded-2xl hover:bg-gray-200 transition-colors"
          >
            <Home className="w-5 h-5" />
            Dashboard
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-black text-white rounded-2xl hover:bg-black/90 transition-colors"
          >
            Next Case
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  )
}
