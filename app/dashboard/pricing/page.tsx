'use client'

import { useRouter } from 'next/navigation'
import { useEcho } from '@merit-systems/echo-react-sdk'
import { ArrowLeft, Check, Sparkles } from 'lucide-react'
import Image from "next/image"

export const dynamic = 'force-dynamic'

const pricingTiers = [
  {
    name: 'Starter',
    tokens: 10,
    price: 9.99,
    features: [
      '10 case interview sessions',
      'Basic analytics',
      'AI feedback reports',
      'Email support'
    ]
  },
  {
    name: 'Professional',
    tokens: 30,
    price: 24.99,
    popular: true,
    features: [
      '30 case interview sessions',
      'Advanced analytics',
      'Detailed AI feedback',
      'Priority support',
      'Performance tracking'
    ]
  },
  {
    name: 'Expert',
    tokens: 100,
    price: 69.99,
    features: [
      '100 case interview sessions',
      'Premium analytics dashboard',
      'Expert-level feedback',
      '24/7 priority support',
      'Performance tracking',
      'Custom practice schedules'
    ]
  }
]

export default function PricingPage() {
  const router = useRouter()
  const { user, isLoggedIn } = useEcho()

  const handlePurchase = async (tier: typeof pricingTiers[0]) => {
    if (!isLoggedIn) {
      router.push('/auth/login')
      return
    }

    // TODO: Implement Echo payment flow
    // This will integrate with Echo's payment system
    console.log(`Purchasing ${tier.name} tier (${tier.tokens} tokens) for $${tier.price}`)

    // For now, show a message
    alert(`Payment integration coming soon! You selected: ${tier.name} - ${tier.tokens} tokens for $${tier.price}`)
  }

  return (
    <div className="flex min-h-screen bg-white">
      {/* Left Sidebar - Same as dashboard */}
      <aside className="fixed left-0 top-0 h-screen w-16 flex flex-col items-center py-6 gap-8 border-r border-gray-100">
        <button onClick={() => router.push('/dashboard')} className="cursor-pointer">
          <Image src="/logo.png" alt="Case Interviewer" width={40} height={40} className="w-10 h-10" />
        </button>
      </aside>

      {/* Main Content */}
      <main className="ml-16 flex-1 px-8 py-12">
        {/* Back Button */}
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-gray-500 hover:text-gray-700 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">back to dashboard</span>
        </button>

        {/* Header */}
        <div className="max-w-4xl mx-auto text-center mb-16">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Choose Your Plan</h1>
          <p className="text-lg text-gray-600">
            Purchase tokens to unlock more case interview practice sessions
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="max-w-6xl mx-auto grid md:grid-cols-3 gap-8 mb-12">
          {pricingTiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-white border rounded-2xl p-8 transition-all duration-200 ${
                tier.popular
                  ? 'border-[#2196F3] shadow-lg scale-105'
                  : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
              }`}
            >
              {tier.popular && (
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <div className="bg-[#2196F3] text-white px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                    <Sparkles className="h-3 w-3" />
                    Most Popular
                  </div>
                </div>
              )}

              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-gray-900 mb-2">{tier.name}</h3>
                <div className="flex items-baseline justify-center gap-1 mb-2">
                  <span className="text-4xl font-bold text-gray-900">${tier.price}</span>
                </div>
                <p className="text-gray-500 text-sm">{tier.tokens} tokens</p>
              </div>

              <ul className="space-y-3 mb-8">
                {tier.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <Check className="h-5 w-5 text-[#2196F3] flex-shrink-0 mt-0.5" />
                    <span className="text-gray-700 text-sm">{feature}</span>
                  </li>
                ))}
              </ul>

              <button
                onClick={() => handlePurchase(tier)}
                className={`w-full py-3 rounded-2xl font-medium transition-colors ${
                  tier.popular
                    ? 'bg-[#2196F3] text-white hover:bg-[#2196F3]/90'
                    : 'bg-gray-100 text-gray-900 hover:bg-gray-200'
                }`}
              >
                Purchase Tokens
              </button>
            </div>
          ))}
        </div>

        {/* FAQ or Additional Info */}
        <div className="max-w-2xl mx-auto">
          <div className="bg-gray-50 rounded-2xl p-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">How Tokens Work</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <p>
                • Each case interview session uses 1 token
              </p>
              <p>
                • Tokens never expire and can be used anytime
              </p>
              <p>
                • Get unlimited access to all case types and difficulty levels
              </p>
              <p>
                • Receive detailed AI-powered feedback after every session
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
