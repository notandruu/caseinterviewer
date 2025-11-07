'use client'

import { ReactNode, useState, useEffect } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { Target, BarChart3, History, Settings, User, LogOut, CreditCard, Menu, X } from 'lucide-react'
import Image from 'next/image'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

interface DashboardLayoutProps {
  children: ReactNode
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { isLoggedIn, user, signOut } = useAuth()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [userName, setUserName] = useState<string>('')
  const [showNameDialog, setShowNameDialog] = useState(false)
  const [newName, setNewName] = useState('')
  const [isUpdatingName, setIsUpdatingName] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    async function fetchUserName() {
      if (!user?.id) return

      const { data: profile } = await supabase
        .from('user_profiles')
        .select('name')
        .eq('user_id', user.id)
        .single()

      if (profile?.name) {
        setUserName(profile.name)
      }
    }

    if (isLoggedIn) {
      fetchUserName()
    }
  }, [isLoggedIn, user, supabase])

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

  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return pathname === '/dashboard'
    }
    return pathname.startsWith(path)
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

      {/* Left Sidebar */}
      <aside
        className={`fixed left-0 top-0 h-screen w-16 flex flex-col items-center py-6 gap-8 border-r border-gray-100 bg-white z-50 transform transition-transform duration-300 ${
          isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Close button for mobile */}
        <button
          onClick={() => setIsMobileMenuOpen(false)}
          className="md:hidden absolute top-4 right-4 text-gray-500"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Logo */}
        <button
          onClick={() => {
            router.push('/dashboard')
            setIsMobileMenuOpen(false)
          }}
          className="cursor-pointer"
        >
          <Image src="/logo.png" alt="Case Interviewer" width={40} height={40} className="w-10 h-10" />
        </button>

        {/* Nav Icons */}
        <div className="flex flex-col gap-6 text-gray-400">
          <button
            onClick={() => {
              router.push('/dashboard')
              setIsMobileMenuOpen(false)
            }}
            className={`transition-colors ${
              isActive('/dashboard') && !pathname.includes('/dashboard/')
                ? 'text-[#2196F3]'
                : 'hover:text-gray-700'
            }`}
            title="Cases"
          >
            <Target className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              router.push('/dashboard/analytics')
              setIsMobileMenuOpen(false)
            }}
            className={`transition-colors ${
              isActive('/dashboard/analytics') ? 'text-[#2196F3]' : 'hover:text-gray-700'
            }`}
            title="Analytics"
          >
            <BarChart3 className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              router.push('/dashboard/history')
              setIsMobileMenuOpen(false)
            }}
            className={`transition-colors ${
              isActive('/dashboard/history') ? 'text-[#2196F3]' : 'hover:text-gray-700'
            }`}
            title="History"
          >
            <History className="h-5 w-5" />
          </button>
          <button
            onClick={() => {
              router.push('/dashboard/pricing')
              setIsMobileMenuOpen(false)
            }}
            className={`transition-colors ${
              isActive('/dashboard/pricing') ? 'text-[#2196F3]' : 'hover:text-gray-700'
            }`}
            title="Pricing"
          >
            <CreditCard className="h-5 w-5" />
          </button>
        </div>

        {/* Settings at Bottom */}
        <button
          onClick={() => {
            router.push('/dashboard/settings')
            setIsMobileMenuOpen(false)
          }}
          className={`mt-auto transition-colors ${
            isActive('/dashboard/settings') ? 'text-[#2196F3]' : 'text-gray-400 hover:text-gray-700'
          }`}
          title="Settings"
        >
          <Settings className="h-5 w-5" />
        </button>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 md:ml-16">
        {/* Mobile hamburger button */}
        <button
          onClick={() => setIsMobileMenuOpen(true)}
          className="md:hidden fixed top-4 left-4 z-30 p-2 rounded-lg hover:bg-gray-100 transition-colors"
        >
          <Menu className="h-6 w-6 text-gray-700" />
        </button>

        {/* Top Right - User Dropdown */}
        <div className="fixed top-4 right-4 md:top-6 md:right-6 flex items-center gap-4 z-30">
          {isLoggedIn && (
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
          )}
        </div>

        {/* Page Content */}
        {children}
      </div>

      {/* Name Change Dialog */}
      <Dialog open={showNameDialog} onOpenChange={setShowNameDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Your Name</DialogTitle>
            <DialogDescription>Enter your preferred display name</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Enter your name"
              className="w-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !isUpdatingName) {
                  handleUpdateName()
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNameDialog(false)} disabled={isUpdatingName}>
              Cancel
            </Button>
            <Button onClick={handleUpdateName} disabled={isUpdatingName || !newName.trim()}>
              {isUpdatingName ? 'Updating...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
