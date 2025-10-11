'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEcho } from '@merit-systems/echo-react-sdk'
import Image from "next/image"

export default function AuthPage() {
  const router = useRouter()
  const { isLoggedIn, isLoading } = useEcho()

  useEffect(() => {
    if (isLoggedIn && !isLoading) {
      router.push('/dashboard')
    }
  }, [isLoggedIn, isLoading, router])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-3 w-3 rounded-full bg-[#2196F3] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="w-full max-w-sm px-8">
        {/* Logo and Welcome */}
        <div className="flex flex-col items-center mb-16">
          <Image src="/logo.svg" alt="Case Now" width={60} height={72} className="object-contain mb-6" />
          <h1 className="text-2xl font-normal text-gray-900">case now</h1>
        </div>

        {/* Auth Options */}
        <div className="space-y-3">
          <button
            onClick={() => router.push('/auth/login')}
            className="w-full group"
          >
            <div className="flex items-center justify-between px-6 py-5 bg-white border border-gray-200 rounded-2xl hover:border-[#2196F3] hover:shadow-sm transition-all duration-200">
              <div className="flex flex-col items-start gap-1">
                <span className="text-base font-medium text-gray-900 group-hover:text-[#2196F3] transition-colors">
                  sign in
                </span>
                <span className="text-xs text-gray-500">
                  already have an account
                </span>
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

          <button
            onClick={() => router.push('/auth/signup')}
            className="w-full group"
          >
            <div className="flex items-center justify-between px-6 py-5 bg-white border border-gray-200 rounded-2xl hover:border-[#2196F3] hover:shadow-sm transition-all duration-200">
              <div className="flex flex-col items-start gap-1">
                <span className="text-base font-medium text-gray-900 group-hover:text-[#2196F3] transition-colors">
                  sign up
                </span>
                <span className="text-xs text-gray-500">
                  get 3 free cases to start
                </span>
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
        </div>

        {/* Footer */}
        <div className="mt-8 text-center">
          <button
            onClick={() => router.push('/pricing')}
            className="text-xs text-gray-500 hover:text-[#2196F3] transition-colors"
          >
            view pricing
          </button>
        </div>
      </div>
    </div>
  )
}
