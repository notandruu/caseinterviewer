'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useEcho } from '@merit-systems/echo-react-sdk'
import { createClient } from "@/lib/supabase/client"
import { Target, BarChart3, Clock, History, LogOut, Crown, DollarSign } from "lucide-react"
import Image from "next/image"

export default function DashboardPage() {
  const router = useRouter()
  const { isLoggedIn, isLoading, user, freeTierBalance, balance, signOut } = useEcho()
  const [cases, setCases] = useState<any[]>([])
  const supabase = createClient()

  // Calculate subscription status
  const freeCasesUsed = freeTierBalance?.used || 0
  const freeCasesRemaining = Math.max(0, 3 - freeCasesUsed)
  const isPro = balance && balance.amount > 0
  const canStartCase = isPro || freeCasesRemaining > 0

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.push('/auth/login')
    }
  }, [isLoggedIn, isLoading, router])

  useEffect(() => {
    if (!user?.id) return

    async function fetchCases() {
      const casesResult = await supabase
        .from("cases")
        .select("*")
        .order("difficulty", { ascending: true })
      setCases(casesResult.data || [])
    }

    fetchCases()
  }, [user?.id])

  const handleStartCase = (caseId: string) => {
    if (!canStartCase) {
      if (confirm('You\'ve used all 3 free cases! Upgrade to Pro for unlimited access?')) {
        router.push('/pricing')
      }
      return
    }
    router.push(`/interview/${caseId}`)
  }

  if (isLoading || !user) {
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
        <Image src="/logo.svg" alt="Case Now" width={40} height={48} className="object-contain" />

        {/* Nav Icons */}
        <div className="flex flex-col gap-6 text-gray-400">
          <button className="hover:text-gray-700 transition-colors">
            <Target className="h-5 w-5" />
          </button>
          <button className="hover:text-gray-700 transition-colors">
            <BarChart3 className="h-5 w-5" />
          </button>
          <button className="hover:text-gray-700 transition-colors">
            <History className="h-5 w-5" />
          </button>
          <button onClick={() => router.push('/pricing')} className="hover:text-gray-700 transition-colors">
            <DollarSign className="h-5 w-5" />
          </button>
        </div>

        {/* Sign Out at Bottom */}
        <button
          onClick={() => signOut()}
          className="mt-auto text-gray-400 hover:text-gray-700 transition-colors"
        >
          <LogOut className="h-5 w-5" />
        </button>
      </aside>

      {/* Main Content */}
      <main className="ml-16 flex-1 flex flex-col items-center justify-center px-8 py-12">
        {/* Top Right - User Info */}
        <div className="fixed top-6 right-6 flex items-center gap-4">
          {/* Subscription Badge */}
          {isPro ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-yellow-50 rounded-full border border-yellow-200">
              <Crown className="h-4 w-4 text-yellow-600" />
              <span className="text-sm font-medium text-yellow-900">pro</span>
            </div>
          ) : (
            <div className="px-4 py-2 bg-gray-50 rounded-full border border-gray-200">
              <span className="text-sm text-gray-600">{freeCasesRemaining}/3 free cases left</span>
            </div>
          )}

          {/* User Avatar */}
          <div className="h-10 w-10 rounded-full bg-[#2196F3] flex items-center justify-center">
            <span className="text-white font-semibold text-sm">
              {user.email?.[0]?.toUpperCase() || 'U'}
            </span>
          </div>
        </div>

        {/* Welcome Header */}
        <div className="flex items-center gap-3 mb-16">
          <Image src="/logo.svg" alt="Case Now" width={32} height={38} className="object-contain" />
          <h1 className="text-2xl font-normal text-gray-900">welcome</h1>
        </div>

        {/* Case Selection Cards */}
        <div className="w-full max-w-md space-y-3">
          {cases?.map((caseItem) => (
            <button
              key={caseItem.id}
              onClick={() => handleStartCase(caseItem.id)}
              disabled={!canStartCase}
              className="w-full group"
            >
              <div className="flex items-center justify-between px-6 py-5 bg-white border border-gray-200 rounded-2xl hover:border-[#2196F3] hover:shadow-sm transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed">
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-medium text-gray-900 group-hover:text-[#2196F3] transition-colors">
                      {caseItem.title}
                    </span>
                    {!canStartCase && (
                      <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                        locked
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="capitalize">{caseItem.difficulty}</span>
                    <span>•</span>
                    <span>{caseItem.industry}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {caseItem.estimated_duration} min
                    </span>
                  </div>
                </div>
                <svg
                  className="h-5 w-5 text-gray-400 group-hover:text-[#2196F3] group-hover:translate-x-1 transition-all duration-200"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </div>
            </button>
          ))}
        </div>

        {/* Upgrade Prompt for Free Users */}
        {!isPro && freeCasesRemaining === 0 && (
          <div className="mt-12 px-6 py-4 bg-yellow-50 border border-yellow-200 rounded-2xl max-w-md">
            <p className="text-sm text-yellow-900 text-center">
              You've used all free cases. <button onClick={() => router.push('/pricing')} className="underline font-medium">Upgrade to Pro</button> for unlimited access.
            </p>
          </div>
        )}

        {/* Empty State */}
        {cases.length === 0 && (
          <div className="text-center text-gray-500 text-sm">
            <p>No cases available yet</p>
          </div>
        )}
      </main>
    </div>
  )
}
