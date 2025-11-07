'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Clock, TrendingUp, ChevronRight, Award, Calendar, FileText } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { DashboardLayout } from '@/components/DashboardLayout'

interface CaseAttemptWithCase {
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
  case: {
    title: string
    firm: string | null
    industry: string | null
    difficulty_level: number
  }
}

export default function HistoryPage() {
  const router = useRouter()
  const { isLoggedIn, user } = useAuth()
  const [attempts, setAttempts] = useState<CaseAttemptWithCase[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/auth/login')
      return
    }

    async function fetchHistory() {
      if (!user?.id) return

      try {
        // Fetch completed case attempts with case details
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
            cases (
              title,
              firm,
              industry,
              difficulty_level
            )
          `)
          .eq('user_id', user.id)
          .eq('state', 'completed')
          .order('completed_at', { ascending: false })

        if (error) {
          console.error('Error fetching history:', error)
          return
        }

        // Transform the data to flatten the case object
        const formattedData = (data || []).map((attempt: any) => ({
          ...attempt,
          case: attempt.cases || {
            title: 'Unknown Case',
            firm: null,
            industry: null,
            difficulty_level: 3
          }
        }))

        setAttempts(formattedData)
      } catch (error) {
        console.error('Error:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchHistory()
  }, [isLoggedIn, user, router])

  const formatDuration = (started: string, completed: string | null) => {
    if (!completed) return 'In progress'
    const start = new Date(started).getTime()
    const end = new Date(completed).getTime()
    const minutes = Math.round((end - start) / 1000 / 60)
    return `${minutes} min`
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))

    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays} days ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const getScoreColor = (score: number | null) => {
    if (score === null) return 'text-gray-500'
    if (score >= 80) return 'text-green-600'
    if (score >= 60) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getDifficultyBadge = (level: number) => {
    const colors = [
      'bg-green-100 text-green-800',
      'bg-green-100 text-green-800',
      'bg-yellow-100 text-yellow-800',
      'bg-orange-100 text-orange-800',
      'bg-red-100 text-red-800',
      'bg-purple-100 text-purple-800'
    ]
    const labels = ['', 'Easy', 'Medium', 'Medium', 'Hard', 'Expert']
    return (
      <span className={`px-2 py-1 rounded text-xs font-medium ${colors[level]}`}>
        {labels[level] || 'Medium'}
      </span>
    )
  }

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-3 w-3 rounded-full bg-[#2196F3] animate-pulse" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <main className="px-4 md:px-8 py-12 mt-16 md:mt-0">

        {/* History Content */}
        <div className="max-w-5xl mx-auto">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Case History</h1>
            <p className="text-gray-600">Review your completed case interviews and track your progress</p>
          </div>

          {/* Stats Summary */}
          {attempts.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 mb-8">
              <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">{attempts.length}</p>
                    <p className="text-xs sm:text-sm text-gray-600">Total Cases</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-green-100 flex items-center justify-center">
                    <Award className="h-4 w-4 sm:h-5 sm:w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {Math.round(attempts.reduce((acc, a) => acc + (a.total_score || 0), 0) / attempts.length) || 0}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">Avg Score</p>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-3 sm:p-4">
                <div className="flex items-center gap-2 sm:gap-3">
                  <div className="h-8 w-8 sm:h-10 sm:w-10 rounded-lg bg-purple-100 flex items-center justify-center">
                    <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-xl sm:text-2xl font-bold text-gray-900">
                      {attempts.filter(a => (a.total_score || 0) >= 70).length}
                    </p>
                    <p className="text-xs sm:text-sm text-gray-600">Strong Performances</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
              <div className="h-3 w-3 rounded-full bg-[#2196F3] animate-pulse mx-auto" />
            </div>
          )}

          {/* Empty State */}
          {!loading && attempts.length === 0 && (
            <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
              <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
                <History className="h-8 w-8 text-gray-400" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">No completed cases yet</h3>
              <p className="text-gray-600 mb-6">Complete your first case interview to see it here</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-6 py-3 bg-[#2196F3] text-white rounded-lg hover:bg-[#1976D2] transition-colors"
              >
                Start Your First Case
              </button>
            </div>
          )}

          {/* History List */}
          {!loading && attempts.length > 0 && (
            <div className="space-y-3">
              {attempts.map((attempt) => (
                <div
                  key={attempt.id}
                  onClick={() => router.push(`/dashboard/history/${attempt.id}`)}
                  className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-[#2196F3] hover:shadow-sm transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      {/* Case Title and Firm */}
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 group-hover:text-[#2196F3] transition-colors">
                            {attempt.case.title}
                          </h3>
                          <p className="text-sm text-gray-600 mt-1">
                            {attempt.case.firm && `${attempt.case.firm} • `}
                            {attempt.case.industry}
                          </p>
                        </div>
                        <ChevronRight className="h-5 w-5 text-gray-400 group-hover:text-[#2196F3] transition-colors" />
                      </div>

                      {/* Metadata Row */}
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        {/* Score */}
                        <div className="flex items-center gap-1.5">
                          <Award className={`h-4 w-4 ${getScoreColor(attempt.total_score)}`} />
                          <span className={`font-semibold ${getScoreColor(attempt.total_score)}`}>
                            {attempt.total_score !== null ? `${Math.round(attempt.total_score)}%` : 'Not scored'}
                          </span>
                        </div>

                        {/* Duration */}
                        <div className="flex items-center gap-1.5">
                          <Clock className="h-4 w-4" />
                          <span>{formatDuration(attempt.started_at, attempt.completed_at)}</span>
                        </div>

                        {/* Difficulty */}
                        {getDifficultyBadge(attempt.case.difficulty_level)}

                        {/* Date */}
                        <div className="flex items-center gap-1.5 ml-auto">
                          <Calendar className="h-4 w-4" />
                          <span>{formatDate(attempt.completed_at || attempt.started_at)}</span>
                        </div>
                      </div>

                      {/* Section Scores Preview (if available) */}
                      {attempt.rubric_scores && Object.keys(attempt.rubric_scores).length > 0 && (
                        <div className="mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-2 flex-wrap">
                            {Object.entries(attempt.rubric_scores).map(([section, data]: [string, any]) => (
                              <div
                                key={section}
                                className="px-2 py-1 bg-gray-50 rounded text-xs flex items-center gap-1"
                              >
                                <span className="text-gray-600 capitalize">{section}:</span>
                                <span className={`font-semibold ${getScoreColor(data?.section_passed ? 75 : 50)}`}>
                                  {data?.section_passed ? '✓' : '−'}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </DashboardLayout>
  )
}
