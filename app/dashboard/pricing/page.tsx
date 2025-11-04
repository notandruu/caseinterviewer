'use client'

import { useRouter } from 'next/navigation'
import { useEcho, EchoTokens } from '@merit-systems/echo-react-sdk'
import { ArrowLeft, Coins, Sparkles, Zap } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'

export const dynamic = 'force-dynamic'

export default function PricingPage() {
  const router = useRouter()
  const { isLoggedIn } = useEcho()

  if (!isLoggedIn) {
    router.push('/auth/login')
    return null
  }

  return (
    <DashboardLayout>
      <main className="px-4 md:px-8 py-12 mt-16 md:mt-0">
        {/* Back Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Dashboard</span>
        </button>

        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Coins className="h-10 w-10 text-[#2196F3]" />
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900">Purchase Credits</h1>
          </div>
          <p className="text-base md:text-lg text-gray-600 mb-8">
            Buy credits to unlock case interview practice sessions and AI feedback
          </p>
        </div>

        {/* Echo Payment Widget */}
        <div className="max-w-4xl mx-auto mb-12">
          <div className="bg-gradient-to-br from-blue-50 to-white border-2 border-[#2196F3]/20 rounded-3xl p-6 md:p-12 shadow-lg">
            <div className="flex flex-col items-center">
              <div className="mb-8 text-center">
                <div className="inline-flex items-center gap-2 bg-[#2196F3]/10 px-4 py-2 rounded-full mb-4">
                  <Sparkles className="h-4 w-4 text-[#2196F3]" />
                  <span className="text-sm font-medium text-[#2196F3]">Powered by Echo</span>
                </div>
                <h2 className="text-xl md:text-2xl font-bold text-gray-900 mb-2">
                  Manage Your Credits
                </h2>
                <p className="text-sm md:text-base text-gray-600">
                  Your credits work across all Echo-powered apps
                </p>
              </div>

              {/* Echo Tokens Component - This handles the entire purchase flow */}
              <div className="w-full flex justify-center">
                <EchoTokens showAvatar={false} />
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards */}
        <div className="max-w-5xl mx-auto grid md:grid-cols-3 gap-6 mb-12">
          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="h-12 w-12 rounded-full bg-blue-100 flex items-center justify-center mb-4">
              <Zap className="h-6 w-6 text-[#2196F3]" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Pay As You Go</h3>
            <p className="text-sm text-gray-600">
              Only pay for what you use. Each case interview session uses credits based on length and complexity.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="h-12 w-12 rounded-full bg-purple-100 flex items-center justify-center mb-4">
              <Coins className="h-6 w-6 text-purple-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Universal Balance</h3>
            <p className="text-sm text-gray-600">
              Your credits work across all Echo-powered apps. Buy once, use anywhere.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <div className="h-12 w-12 rounded-full bg-green-100 flex items-center justify-center mb-4">
              <Sparkles className="h-6 w-6 text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Expiration</h3>
            <p className="text-sm text-gray-600">
              Credits never expire. Take your time and practice at your own pace.
            </p>
          </div>
        </div>

        {/* FAQ */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-gray-50 rounded-2xl p-6 md:p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-6">How It Works</h3>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-[#2196F3] text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  1
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Purchase Credits</h4>
                  <p className="text-sm text-gray-600">
                    Click the button above to add credits to your Echo account
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-[#2196F3] text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  2
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Start Practicing</h4>
                  <p className="text-sm text-gray-600">
                    Choose a case interview and start your practice session
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-[#2196F3] text-white flex items-center justify-center flex-shrink-0 text-sm font-bold">
                  3
                </div>
                <div>
                  <h4 className="font-medium text-gray-900 mb-1">Get AI Feedback</h4>
                  <p className="text-sm text-gray-600">
                    Receive detailed AI-powered feedback and track your progress
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}
