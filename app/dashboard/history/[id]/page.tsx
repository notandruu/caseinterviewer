'use client'

import { use, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEcho } from '@merit-systems/echo-react-sdk'
import {
  ArrowLeft,
  Award,
  Clock,
  Calendar,
  MessageSquare,
  TrendingUp,
  Lightbulb,
  PlayCircle,
  FileText,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DashboardLayout } from '@/components/DashboardLayout'

interface CaseAttemptDetail {
  id: string
  case_id: string
  started_at: string
  completed_at: string | null
  total_score: number | null
  rubric_scores: any
  transcript: any[]
  state: string
  current_section: string
  hints_used: any[]
  metadata: any
  case: {
    id: string
    title: string
    firm: string | null
    industry: string | null
    difficulty_level: number
    summary: string | null
  }
}

export default function CaseHistoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const { isLoggedIn, user } = useEcho()
  const [attempt, setAttempt] = useState<CaseAttemptDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'overview' | 'transcript' | 'feedback'>('overview')
  const supabase = createClient()

  const { id } = use(params)

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/auth/login')
      return
    }

    async function fetchAttemptDetail() {
      if (!user?.id) return

      try {
        const { data, error } = await supabase
          .from('case_attempts')
          .select(`
            id,
            case_id,
            started_at,
            completed_at,
            total_score,
            rubric_scores,
            transcript,
            state,
            current_section,
            hints_used,
            metadata,
            cases (
              id,
              title,
              firm,
              industry,
              difficulty_level,
              summary
            )
          `)
          .eq('id', id)
          .eq('user_id', user.id)
          .single()

        if (error) {
          console.error('Error fetching attempt:', error)
          router.push('/dashboard/history')
          return
        }

        const formattedData = {
          ...data,
          case: data.cases || {
            id: '',
            title: 'Unknown Case',
            firm: null,
            industry: null,
            difficulty_level: 3,
            summary: null
          }
        }

        setAttempt(formattedData)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchAttemptDetail()
  }, [isLoggedIn, user, id, router])

  const formatDuration = (started: string, completed: string | null) => {
    if (!completed) return 'In progress'
    const start = new Date(started).getTime()
    const end = new Date(completed).getTime()
    const minutes = Math.round((end - start) / 1000 / 60)
    return `${minutes} minutes`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-500'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getScoreBgColor = (score: number | null) => {
    if (score === null) return 'bg-gray-100'
    if (score >= 80) return 'bg-green-100'
    if (score >= 60) return 'bg-yellow-100'
    return 'bg-red-100'
  }

  const getDifficultyLabel = (level: number) => {
    const labels = ['', 'Easy', 'Medium', 'Medium', 'Hard', 'Expert']
    return labels[level] || 'Medium'
  }

  const handleReplay = () => {
    if (attempt?.case_id) {
      router.push(`/cases/${attempt.case_id}/voice`)
    }
  }

  if (!isLoggedIn || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-3 w-3 rounded-full bg-[#2196F3] animate-pulse" />
      </div>
    )
  }

  if (!attempt) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="text-center">
          <p className="text-gray-600">Case attempt not found</p>
          <button
            onClick={() => router.push('/dashboard/history')}
            className="mt-4 text-[#2196F3] hover:underline"
          >
            Back to History
          </button>
        </div>
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-5xl mx-auto px-4 md:px-8 py-4 md:py-6 mt-16 md:mt-0">
            <button
              onClick={() => router.push('/dashboard/history')}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-4 transition-colors"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="text-sm font-medium">Back to History</span>
            </button>

            <div className="flex flex-col sm:flex-row items-start sm:justify-between gap-4">
              <div className="flex-1">
                <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{attempt.case.title}</h1>
                <p className="text-sm md:text-base text-gray-600">
                  {attempt.case.firm && `${attempt.case.firm} • `}
                  {attempt.case.industry} • Level {attempt.case.difficulty_level}/5
                </p>
              </div>

              <button
                onClick={handleReplay}
                className="flex items-center gap-2 px-4 md:px-6 py-2 md:py-3 bg-[#2196F3] text-white rounded-lg hover:bg-[#1976D2] transition-colors whitespace-nowrap"
              >
                <PlayCircle className="h-4 w-4 md:h-5 md:w-5" />
                <span className="text-sm md:text-base">Retry Case</span>
              </button>
            </div>
          </div>
        </div>

      {/* Tabs */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-5xl mx-auto px-4 md:px-8">
          <div className="flex gap-4 md:gap-6 overflow-x-auto">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-3 md:py-4 border-b-2 transition-colors text-sm md:text-base whitespace-nowrap ${
                activeTab === 'overview'
                  ? 'border-[#2196F3] text-[#2196F3] font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('transcript')}
              className={`py-3 md:py-4 border-b-2 transition-colors text-sm md:text-base whitespace-nowrap ${
                activeTab === 'transcript'
                  ? 'border-[#2196F3] text-[#2196F3] font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Transcript
            </button>
            <button
              onClick={() => setActiveTab('feedback')}
              className={`py-3 md:py-4 border-b-2 transition-colors text-sm md:text-base whitespace-nowrap ${
                activeTab === 'feedback'
                  ? 'border-[#2196F3] text-[#2196F3] font-semibold'
                  : 'border-transparent text-gray-600 hover:text-gray-900'
              }`}
            >
              Detailed Feedback
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8">
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div className="space-y-4 md:space-y-6">
            {/* Score Card */}
            <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-8">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-3 mb-4 md:mb-6">
                <h2 className="text-lg md:text-xl font-bold text-gray-900">Performance Summary</h2>
                <div className={`px-3 md:px-4 py-1.5 md:py-2 rounded-lg ${getScoreBgColor(attempt.total_score)}`}>
                  <span className={`text-2xl md:text-3xl font-bold ${getScoreColor(attempt.total_score)}`}>
                    {attempt.total_score !== null ? `${Math.round(attempt.total_score)}%` : 'N/A'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 md:gap-6">
                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                    <Clock className="h-5 w-5 md:h-6 md:w-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Duration</p>
                    <p className="text-sm md:text-base font-semibold text-gray-900">
                      {formatDuration(attempt.started_at, attempt.completed_at)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Lightbulb className="h-5 w-5 md:h-6 md:w-6 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Hints Used</p>
                    <p className="text-sm md:text-base font-semibold text-gray-900">{attempt.hints_used?.length || 0}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 md:gap-3">
                  <div className="h-10 w-10 md:h-12 md:w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                    <MessageSquare className="h-5 w-5 md:h-6 md:w-6 text-orange-600" />
                  </div>
                  <div>
                    <p className="text-xs md:text-sm text-gray-600">Exchanges</p>
                    <p className="text-sm md:text-base font-semibold text-gray-900">{attempt.transcript?.length || 0}</p>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-100">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <Calendar className="h-4 w-4" />
                  <span>Completed on {formatDate(attempt.completed_at || attempt.started_at)}</span>
                </div>
              </div>
            </div>

            {/* Section Breakdown */}
            {attempt.rubric_scores && Object.keys(attempt.rubric_scores).length > 0 && (
              <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-8">
                <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Section Breakdown</h2>
                <div className="space-y-3 md:space-y-4">
                  {Object.entries(attempt.rubric_scores).map(([section, data]: [string, any]) => (
                    <div key={section} className="border border-gray-100 rounded-lg p-3 md:p-4">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
                        <h3 className="text-sm md:text-base font-semibold text-gray-900 capitalize">{section}</h3>
                        <div className="flex items-center gap-2">
                          {data?.section_passed ? (
                            <CheckCircle className="h-4 w-4 md:h-5 md:w-5 text-green-600" />
                          ) : (
                            <XCircle className="h-4 w-4 md:h-5 md:w-5 text-red-600" />
                          )}
                          <span className={`text-sm ${data?.section_passed ? 'text-green-600' : 'text-red-600'}`}>
                            {data?.section_passed ? 'Passed' : 'Needs Improvement'}
                          </span>
                        </div>
                      </div>

                      {/* Individual scores */}
                      {data?.scores && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 mb-3">
                          {Object.entries(data.scores).map(([dimension, score]: [string, any]) => (
                            <div key={dimension} className="flex items-center justify-between text-sm">
                              <span className="text-gray-600 capitalize">{dimension}</span>
                              <span className="font-semibold">{Math.round(score)}%</span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Comments */}
                      {data?.comments && data.comments.length > 0 && (
                        <div className="pt-3 border-t border-gray-100">
                          <ul className="space-y-1">
                            {data.comments.map((comment: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-600 flex items-start gap-2">
                                <span className="text-gray-400">•</span>
                                <span>{comment}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Insights / Improvement Areas */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 md:p-6">
              <div className="flex items-start gap-2 md:gap-3">
                <AlertCircle className="h-5 w-5 md:h-6 md:w-6 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm md:text-base font-semibold text-blue-900 mb-2">Improvement Suggestions</h3>
                  <ul className="space-y-1.5 md:space-y-2 text-xs md:text-sm text-blue-800">
                    <li>• Review the transcript to identify areas where you can provide more structured answers</li>
                    <li>• Practice using frameworks more explicitly in your responses</li>
                    <li>• Focus on quantitative analysis and showing your calculations step-by-step</li>
                    {attempt.hints_used && attempt.hints_used.length > 2 && (
                      <li>• Try to rely less on hints - practice the case independently first</li>
                    )}
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Transcript Tab */}
        {activeTab === 'transcript' && (
          <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-8">
            <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Interview Transcript</h2>

            {attempt.transcript && attempt.transcript.length > 0 ? (
              <div className="space-y-3 md:space-y-4">
                {attempt.transcript.map((entry: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-3 md:p-4 rounded-lg ${
                      entry.role === 'assistant'
                        ? 'bg-gray-50 border border-gray-100'
                        : 'bg-blue-50 border border-blue-100'
                    }`}
                  >
                    <div className="flex flex-wrap items-center gap-1.5 md:gap-2 mb-2">
                      <span className={`font-semibold text-xs md:text-sm ${
                        entry.role === 'assistant' ? 'text-gray-900' : 'text-blue-900'
                      }`}>
                        {entry.role === 'assistant' ? 'Interviewer' : 'You'}
                      </span>
                      {entry.section && (
                        <span className="px-1.5 md:px-2 py-0.5 bg-white border border-gray-200 rounded text-xs text-gray-600 capitalize">
                          {entry.section}
                        </span>
                      )}
                      {entry.timestamp && (
                        <span className="text-xs text-gray-500 ml-auto">
                          {new Date(entry.timestamp).toLocaleTimeString()}
                        </span>
                      )}
                    </div>
                    <p className="text-sm md:text-base text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-600 text-center py-8">No transcript available</p>
            )}
          </div>
        )}

        {/* Feedback Tab */}
        {activeTab === 'feedback' && (
          <div className="space-y-4 md:space-y-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-4 md:p-8">
              <h2 className="text-lg md:text-xl font-bold text-gray-900 mb-4 md:mb-6">Detailed Performance Analysis</h2>

              {attempt.rubric_scores && Object.keys(attempt.rubric_scores).length > 0 ? (
                <div className="space-y-4 md:space-y-6">
                  {Object.entries(attempt.rubric_scores).map(([section, data]: [string, any]) => (
                    <div key={section} className="pb-4 md:pb-6 border-b border-gray-100 last:border-0">
                      <h3 className="text-base md:text-lg font-semibold text-gray-900 capitalize mb-3 md:mb-4">{section} Section</h3>

                      {/* Scores breakdown */}
                      {data?.scores && (
                        <div className="mb-4">
                          <p className="text-sm font-medium text-gray-700 mb-3">Performance Metrics:</p>
                          <div className="space-y-2">
                            {Object.entries(data.scores).map(([dimension, score]: [string, any]) => (
                              <div key={dimension}>
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-sm text-gray-600 capitalize">{dimension}</span>
                                  <span className={`text-sm font-semibold ${getScoreColor(score)}`}>
                                    {Math.round(score)}%
                                  </span>
                                </div>
                                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full ${
                                      score >= 80 ? 'bg-green-500' : score >= 60 ? 'bg-yellow-500' : 'bg-red-500'
                                    }`}
                                    style={{ width: `${score}%` }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Feedback comments */}
                      {data?.comments && data.comments.length > 0 && (
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-sm font-medium text-gray-700 mb-2">Feedback:</p>
                          <ul className="space-y-2">
                            {data.comments.map((comment: string, idx: number) => (
                              <li key={idx} className="text-sm text-gray-700 flex items-start gap-2">
                                <span className="text-[#2196F3] font-bold">→</span>
                                <span>{comment}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600 text-center py-8">No detailed feedback available</p>
              )}
            </div>

            {/* Overall Recommendations */}
            <div className="bg-gradient-to-br from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-4 md:p-8">
              <h3 className="text-base md:text-lg font-bold text-gray-900 mb-3 md:mb-4">Next Steps for Improvement</h3>
              <div className="space-y-2.5 md:space-y-3 text-xs md:text-sm text-gray-700">
                <div className="flex items-start gap-2 md:gap-3">
                  <TrendingUp className="h-4 w-4 md:h-5 md:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-0.5 md:mb-1">Practice Similar Cases</p>
                    <p className="text-xs md:text-sm text-gray-600">Try cases with similar difficulty levels to build confidence</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 md:gap-3">
                  <FileText className="h-4 w-4 md:h-5 md:w-5 text-purple-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-0.5 md:mb-1">Review Frameworks</p>
                    <p className="text-xs md:text-sm text-gray-600">Study common consulting frameworks and how to apply them</p>
                  </div>
                </div>
                <div className="flex items-start gap-2 md:gap-3">
                  <Award className="h-4 w-4 md:h-5 md:w-5 text-green-600 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="font-semibold mb-0.5 md:mb-1">Focus on Structured Communication</p>
                    <p className="text-xs md:text-sm text-gray-600">Practice organizing your thoughts before speaking</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </DashboardLayout>
  )
}
