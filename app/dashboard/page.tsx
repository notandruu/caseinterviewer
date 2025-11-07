'use client'

export const dynamic = 'force-dynamic'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from "@/lib/supabase/client"
import { Target, BarChart3, Clock, History, Settings, User, LogOut, CreditCard, Menu, X } from "lucide-react"
import Image from "next/image"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

export default function DashboardPage() {
  const router = useRouter()
  const { isLoggedIn, user, signOut } = useAuth()
  const [cases, setCases] = useState<any[]>([])
  const [checkingOnboarding, setCheckingOnboarding] = useState(true)
  const [userName, setUserName] = useState<string>('')
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [newName, setNewName] = useState('')
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function checkOnboarding() {
      if (!user?.id) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('onboarding_completed, name')
        .eq('user_id', user.id)
        .single()

      if (!profile?.onboarding_completed) {
        router.push('/onboarding')
        return
      }

      setUserName(profile.name || '')
      setCheckingOnboarding(false)
    }

    async function fetchCases() {
      const casesResult = await supabase
        .from("cases")
        .select("*")
        .order("difficulty_level", { ascending: true })
      setCases(casesResult.data || [])
    }

    if (isLoggedIn) {
      checkOnboarding()
      fetchCases()
    }
  }, [isLoggedIn, user, router])

  const handleStartCase = (caseId: string) => {
    router.push(`/interview/${caseId}`)
  }

  const handleOpenNameDialog = () => {
    setNewName(userName)
    setShowNameDialog(true)
  }

  const handleUpdateName = async () => {
    if (!user?.id || !newName.trim()) return

    setIsUpdatingName(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ name: newName.trim() })
        .eq('user_id', user.id)

      if (!error) {
        setUserName(newName.trim())
        setShowNameDialog(false)
      }
    } catch (error) {
      console.error('Error updating name:', error)
    } finally {
      setIsUpdatingName(false)
    }
  }

  const handleSignOut = async () => {
    await signOut()
    router.push('/')
  }

  // Show loading state while checking onboarding or fetching data
  if (checkingOnboarding || cases.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-3 w-3 rounded-full bg-[#2196F3] animate-pulse" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Left Sidebar - Hidden on mobile, show on desktop */}
      <aside className={`fixed left-0 top-0 h-screen w-16 md:w-16 flex flex-col items-center py-6 gap-8 border-r border-gray-100 bg-white z-50 transform transition-transform duration-300 ${
        isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      }`}>
        {/* Close button for mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden absolute top-4 right-4 text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo */}
        <button onClick={() => { router.push('/dashboard'); setIsMobileMenuOpen(false); }} className="cursor-pointer">
          <Image src="/logo.png" alt="Case Interviewer" width={40} height={40} className="w-10 h-10" />
        </button>

        {/* Nav Icons */}
        <div className="flex flex-col gap-6 text-gray-400">
          <button
            onClick={() => { router.push('/dashboard'); setIsMobileMenuOpen(false); }}
            className="text-[#2196F3] transition-colors"
            title="Cases"
          >
            <Target className="h-5 w-5" />
          </button>
          <button
            onClick={() => { router.push('/dashboard/analytics'); setIsMobileMenuOpen(false); }}
            className="hover:text-gray-700 transition-colors"
            title="Analytics"
          >
            <BarChart3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => { router.push('/dashboard/history'); setIsMobileMenuOpen(false); }}
            className="hover:text-gray-700 transition-colors"
            title="History"
          >
            <History className="h-5 w-5" />
          </button>
          <button
            onClick={() => { router.push('/dashboard/pricing'); setIsMobileMenuOpen(false); }}
            className="hover:text-gray-700 transition-colors"
            title="Pricing"
          >
            <CreditCard className="h-5 w-5" />
          </button>
        </div>

        {/* Settings at Bottom */}
        <button
          onClick={() => { router.push('/dashboard/settings'); setIsMobileMenuOpen(false); }}
          className="mt-auto text-gray-400 hover:text-gray-700 transition-colors"
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </aside>

      {/* Main Content */}
      <main className="md:ml-16 flex-1 flex flex-col items-center justify-center px-4 md:px-8 py-12">
        {/* Mobile hamburger button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden fixed top-4 left-4 z-30 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="h-6 w-6 text-gray-700" />
        </button>
        {/* Top Right - User Info */}
        <div className="fixed top-4 right-4 md:top-6 md:right-6 flex items-center gap-4 z-30">
          {/* User Avatar or Sign In Button */}
          {isLoggedIn ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="h-10 w-10 rounded-full bg-[#2196F3] flex items-center justify-center hover:bg-[#2196F3]/90 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#2196F3] focus:ring-offset-2">
                  <span className="text-white font-semibold text-sm">
                    {userName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                  </span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="flex flex-col gap-1">
                    <p className="text-sm font-medium">{userName || 'User'}</p>
                    <p className="text-xs text-gray-500">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleOpenNameDialog}>
                  <User className="mr-2 h-4 w-4" />
                  Change Name
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleSignOut} variant="destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => router.push('/auth/login')}
              className="px-4 py-2 text-sm font-medium text-[#2196F3] hover:bg-[#2196F3]/10 rounded-full border border-[#2196F3] transition-colors"
            >
              Sign In
            </button>
          )}
        </div>

        {/* Welcome Header */}
        <div className="flex items-center gap-3 mb-12 md:mb-16 mt-8 md:mt-0">
          <Image src="/logo.png" alt="Case Interviewer" width={32} height={32} className="w-8 h-8" />
          <h1 className="text-xl md:text-2xl font-normal text-gray-900">welcome</h1>
        </div>

        {/* Case Selection Cards */}
        <div className="w-full max-w-md space-y-3">
          {cases?.map((caseItem) => (
            <button
              key={caseItem.id}
              onClick={() => handleStartCase(caseItem.id)}
              className="w-full group"
            >
              <div className="flex items-center justify-between px-6 py-5 bg-white border border-gray-200 rounded-2xl hover:border-[#2196F3] hover:shadow-sm transition-all duration-200">
                <div className="flex flex-col items-start gap-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-medium text-gray-900 group-hover:text-[#2196F3] transition-colors">
                      {caseItem.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span>Level {caseItem.difficulty_level}/5</span>
                    <span>•</span>
                    <span>{caseItem.industry}</span>
                    <span>•</span>
                    <span>{caseItem.firm || 'Consulting'}</span>
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

        {/* Empty State */}
        {cases.length === 0 && (
          <div className="text-center text-gray-500 text-sm">
            <p>No cases available yet</p>
          </div>
        )}
      </main>

      {/* Change Name Dialog */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Name</DialogTitle>
            <DialogDescription>
              Update your display name. This will be shown across the app.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              placeholder="Enter your name"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && newName.trim()) {
                  handleUpdateName()
                }
              }}
              disabled={isUpdatingName}
              className="w-full"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowNameDialog(false)}
              disabled={isUpdatingName}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpdateName}
              disabled={isUpdatingName || !newName.trim()}
            >
              {isUpdatingName ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
