'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEcho } from '@merit-systems/echo-react-sdk'
import { Target, BarChart3, History, Settings, Clock, TrendingUp } from 'lucide-react'
import Image from 'next/image'

export default function HistoryPage() {
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
            className="hover:text-gray-700 transition-colors"
            title="Analytics"
          >
            <BarChart3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => router.push('/dashboard/history')}
            className="text-[#2196F3] transition-colors"
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

        {/* History Content */}
        <div className="max-w-5xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Practice History</h1>
          <p className="text-gray-600 mb-8">Review your past case interview sessions</p>

          {/* Empty State */}
          <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center">
            <div className="h-16 w-16 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <History className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No practice history yet</h3>
            <p className="text-gray-600 mb-6">Your completed case interviews will appear here</p>
            <button
              onClick={() => router.push('/dashboard')}
              className="px-6 py-3 bg-[#2196F3] text-white rounded-lg hover:bg-[#1976D2] transition-colors"
            >
              Start Your First Case
            </button>
          </div>

          {/* Example of what history items will look like (hidden for now) */}
          <div className="hidden space-y-3 mt-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6 hover:border-[#2196F3] transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">Air Panama Case</h3>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>45 min</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-4 w-4" />
                      <span>85%</span>
                    </div>
                    <span>•</span>
                    <span>2 days ago</span>
                  </div>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-[#2196F3] hover:bg-[#2196F3]/10 rounded-lg transition-colors">
                  View Details
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
