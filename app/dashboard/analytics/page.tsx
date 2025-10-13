'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEcho } from '@merit-systems/echo-react-sdk'
import { Target, BarChart3, History, Settings, TrendingUp, Award, Clock, Target as TargetIcon } from 'lucide-react'
import Image from 'next/image'

export default function AnalyticsPage() {
  const router = useRouter()
  const { isLoggedIn, user } = useEcho()

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/auth/login')
    }
  }, [isLoggedIn, router])

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-3 w-3 rounded-full bg-[#2196F3] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar */}
      <aside className="fixed left-0 top-0 h-screen w-16 flex flex-col items-center py-6 gap-8 border-r border-gray-100">
        {/* Logo */}
        <button onClick={() => router.push('/dashboard')} className="cursor-pointer">
          <Image src="/logo.png" alt="Case Interviewer" width={40} height={40} className="w-10 h-10" />
        </button>

        {/* Nav Icons */}
        <div className="flex flex-col gap-6 text-gray-400">
          <button
            onClick={() => router.push('/dashboard')}
            className="hover:text-gray-700 transition-colors"
            title="Cases"
          >
            <Target className="h-5 w-5" />
          </button>
          <button
            onClick={() => router.push('/dashboard/analytics')}
            className="text-[#2196F3] transition-colors"
            title="Analytics"
          >
            <BarChart3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => router.push('/dashboard/history')}
            className="hover:text-gray-700 transition-colors"
            title="History"
          >
            <History className="h-5 w-5" />
          </button>
        </div>

        {/* Settings at Bottom */}
        <button
          onClick={() => router.push('/dashboard/settings')}
          className="mt-auto text-gray-400 hover:text-gray-700 transition-colors"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </aside>

      {/* Main Content */}
      <main className="ml-16 flex-1 px-8 py-12">
        {/* Top Right - User Info */}
        <div className="fixed top-6 right-6 flex items-center gap-4">
          <div className="h-10 w-10 rounded-full bg-[#2196F3] flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {user?.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        </div>

        {/* Analytics Content */}
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Analytics</h1>
          <p className="text-gray-600 mb-8">Track your progress and performance metrics</p>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-full bg-[#2196F3]/10 flex items-center justify-center">
                  <TrendingUp className="h-5 w-5 text-[#2196F3]" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">0</p>
              <p className="text-sm text-gray-600">Total Cases</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center">
                  <Award className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">0%</p>
              <p className="text-sm text-gray-600">Average Score</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">0h</p>
              <p className="text-sm text-gray-600">Practice Time</p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="h-10 w-10 rounded-full bg-orange-100 flex items-center justify-center">
                  <TargetIcon className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <p className="text-2xl font-bold text-gray-900 mb-1">0</p>
              <p className="text-sm text-gray-600">Completed</p>
            </div>
          </div>

          {/* Empty State */}
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <BarChart3 className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No analytics yet</h3>
            <p className="text-gray-600 mb-6">Start practicing cases to see your performance metrics</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-[#2196F3] text-white rounded-lg hover:bg-[#1976D2] transition-colors"
            >
              Start a Case
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
