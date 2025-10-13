'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { EchoSignIn, useEcho } from '@merit-systems/echo-react-sdk'
import { ArrowLeft } from 'lucide-react'
import Image from "next/image"

export const dynamic = 'force-dynamic'

export default function LoginPage() {
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
        {/* Back Button */}
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">back</span>
        </button>

        {/* Logo and Welcome Back */}
        <div className="flex flex-col items-center mb-12">
          <Image src="/logo.svg" alt="Case Now" width={60} height={72} className="object-contain mb-6" />
          <h1 className="text-2xl font-normal text-gray-900">welcome back</h1>
        </div>

        {/* Sign In Button */}
        <EchoSignIn
          onSuccess={(user) => {
            console.log('Login successful:', user)
            router.push('/dashboard')
          }}
          onError={(error) => {
            console.error('Login error:', error)
          }}
        >
          <button className="w-full px-6 py-4 bg-[#2196F3] hover:bg-[#2196F3]/90 text-white font-medium rounded-2xl transition-colors shadow-sm">
            sign in
          </button>
        </EchoSignIn>

        {/* Footer Info */}
        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">
            don't have an account?{' '}
            <button
              onClick={() => router.push('/auth/signup')}
              className="text-[#2196F3] hover:underline"
            >
              sign up
            </button>
          </p>
        </div>
      </div>
    </div>
  )
}
