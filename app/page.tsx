'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEcho } from '@merit-systems/echo-react-sdk'

export default function HomePage() {
  const router = useRouter()
  const { isLoggedIn, isLoading } = useEcho()

  useEffect(() => {
    if (!isLoading) {
      if (isLoggedIn) {
        router.push('/dashboard')
      } else {
        router.push('/auth/login')
      }
    }
  }, [isLoggedIn, isLoading, router])

  return (
    <div className="flex min-h-screen items-center justify-center bg-white">
      <div className="h-3 w-3 rounded-full bg-[#2196F3] animate-pulse" />
    </div>
  )
}
