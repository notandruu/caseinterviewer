'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import { ArrowLeft } from 'lucide-react'
import Image from 'next/image'

export const dynamic = 'force-dynamic'

export default function LoginPage() {
  const router = useRouter()
  const { isLoggedIn, isLoading } = useAuth()
  const [email, setEmail] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [error, setError] = useState('')
  const supabase = createClient()

  useEffect(() => {
    if (isLoggedIn && !isLoading) {
      router.push('/dashboard')
    }
  }, [isLoggedIn, isLoading, router])

  const handleSignIn = async () => {
    if (!email.trim()) return
    setIsSending(true)
    setError('')
    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
    })
    setIsSending(false)
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
  }

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
        <button
          onClick={() => router.push('/')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">back</span>
        </button>

        <div className="flex flex-col items-center mb-12">
          <Image src="/logo.svg" alt="Case Now" width={60} height={72} className="object-contain mb-6" />
          <h1 className="text-2xl font-normal text-gray-900">welcome back</h1>
        </div>

        {sent ? (
          <div className="text-center space-y-3">
            <p className="text-sm text-gray-700">check your email for a magic link</p>
            <p className="text-xs text-gray-500">{email}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSignIn() }}
              placeholder="your@email.com"
              className="w-full border-b-2 border-gray-300 focus:border-black outline-none pb-3 text-base placeholder:text-gray-400"
              autoFocus
            />
            {error && <p className="text-xs text-red-600">{error}</p>}
            <button
              onClick={handleSignIn}
              disabled={isSending || !email.trim()}
              className="w-full px-6 py-4 bg-[#2196F3] hover:bg-[#2196F3]/90 disabled:opacity-50 text-white font-medium rounded-2xl transition-colors shadow-sm"
            >
              {isSending ? 'sending...' : 'sign in'}
            </button>
          </div>
        )}

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
