'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEcho } from '@merit-systems/echo-react-sdk'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function HomePage() {
  const router = useRouter()
  const { isLoggedIn, isLoading } = useEcho()

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50">
        <div className="h-8 w-8 rounded-full bg-blue-600 animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 p-6">
      <div className="w-full max-w-4xl space-y-8">
        {/* Header */}
        <div className="text-center space-y-4">
          <h1 className="text-5xl font-bold text-gray-900">
            Welcome to Your App
          </h1>
          <p className="text-xl text-gray-600">
            Clean slate with UI components, Supabase, and Echo SDK ready to go
          </p>
        </div>

        {/* Features Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>🎨 UI Components</CardTitle>
              <CardDescription>
                Shadcn/ui components ready to use
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                All UI components from shadcn/ui are available in components/ui/
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🗄️ Supabase</CardTitle>
              <CardDescription>
                Database connection configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Client and server Supabase clients ready in lib/supabase/
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>🔐 Echo SDK</CardTitle>
              <CardDescription>
                Authentication ready
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                {isLoggedIn ? 'You are logged in!' : 'Auth pages available at /auth/login'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          {!isLoggedIn ? (
            <>
              <Button
                size="lg"
                onClick={() => router.push('/auth/login')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Sign In
              </Button>
              <Button
                size="lg"
                variant="outline"
                onClick={() => router.push('/auth/sign-up')}
              >
                Sign Up
              </Button>
            </>
          ) : (
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Ready to Build</CardTitle>
                <CardDescription>
                  You're logged in and ready to start building your app
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <p className="text-sm text-gray-600">
                  Start by creating your pages in the app/ directory
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Tech Stack Info */}
        <Card className="bg-white/50 backdrop-blur">
          <CardHeader>
            <CardTitle>What's Included</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="grid gap-2 text-sm">
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span><strong>Next.js 15</strong> - App router with server/client components</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span><strong>Tailwind CSS</strong> - Utility-first styling</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span><strong>Shadcn/ui</strong> - 50+ pre-built components</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span><strong>Supabase</strong> - PostgreSQL database with real-time subscriptions</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span><strong>Echo SDK</strong> - Authentication and billing</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-green-600">✓</span>
                <span><strong>TypeScript</strong> - Type safety throughout</span>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
