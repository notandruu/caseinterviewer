'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Always redirect to dashboard for demo (no auth required for 3 free cases)
    router.push('/dashboard')
  }, [router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-3 w-3 rounded-full bg-[#2196F3] animate-pulse" />
    </div>
  )
}
