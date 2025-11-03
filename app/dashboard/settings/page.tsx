'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useEcho } from '@merit-systems/echo-react-sdk'
import { ArrowLeft, User, Bell, Shield } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'

export default function SettingsPage() {
  const router = useRouter()
  const { isLoggedIn, user } = useEcho()

  useEffect(() => {
    if (!isLoggedIn) {
      router.push('/auth/login')
    }
  }, [isLoggedIn, router])

  if (!isLoggedIn) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white">
        <div className="h-3 w-3 rounded-full bg-[#2196F3] animate-pulse" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <main className="px-4 md:px-8 py-12 mt-16 md:mt-0">

        {/* Back Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Dashboard</span>
        </button>

        {/* Settings Header */}
        <div className="max-w-2xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Settings</h1>
          <p className="text-gray-600 mb-8">Manage your account settings and preferences</p>

          {/* Account Section */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-[#2196F3]/10 flex items-center justify-center">
                <User className="h-5 w-5 text-[#2196F3]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Account</h2>
                <p className="text-sm text-gray-600">Manage your account information</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <p className="text-base text-gray-900 mt-1">{user?.email || 'Not available'}</p>
              </div>
            </div>
          </div>

          {/* Notifications Section */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-[#2196F3]/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-[#2196F3]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Notifications</h2>
                <p className="text-sm text-gray-600">Configure notification preferences</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between py-3 border-b border-gray-100">
                <div>
                  <p className="text-sm font-medium text-gray-900">Email notifications</p>
                  <p className="text-xs text-gray-600">Receive updates about your cases</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" defaultChecked />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2196F3]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2196F3]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">Practice reminders</p>
                  <p className="text-xs text-gray-600">Get reminders to practice regularly</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-[#2196F3]/20 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#2196F3]"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Privacy & Security Section */}
          <div className="bg-white border border-gray-200 rounded-2xl p-6 mb-4">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-[#2196F3]/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-[#2196F3]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Privacy & Security</h2>
                <p className="text-sm text-gray-600">Control your privacy settings</p>
              </div>
            </div>

            <div className="space-y-4">
              <button className="w-full text-left py-3 px-4 hover:bg-gray-50 rounded-lg transition-colors">
                <p className="text-sm font-medium text-gray-900">Change password</p>
                <p className="text-xs text-gray-600 mt-1">Update your account password</p>
              </button>
            </div>
          </div>

        </div>
      </main>
    </DashboardLayout>
  )
}
