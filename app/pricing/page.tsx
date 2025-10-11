'use client'

import { useEcho } from '@merit-systems/echo-react-sdk'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Check } from "lucide-react"

export default function PricingPage() {
  const router = useRouter()
  const { isLoggedIn, freeTierBalance, createPaymentLink } = useEcho()

  const handleAddFunds = async (amount: number) => {
    if (!isLoggedIn) {
      router.push('/auth/login')
      return
    }

    try {
      // Create payment link to add funds to Echo balance
      const paymentUrl = await createPaymentLink(
        amount,
        `Add $${amount} to your Case Now balance`,
        window.location.origin + '/dashboard?funded=true'
      )
      window.location.href = paymentUrl
    } catch (error) {
      console.error('Payment link creation failed:', error)
      alert('Failed to create payment link. Please try again.')
    }
  }

  const freeCasesUsed = freeTierBalance?.used || 0
  const freeCasesRemaining = Math.max(0, 3 - freeCasesUsed)

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 py-12 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600">
            Master case interviews at your own pace
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <Card className="relative border-2 border-gray-200">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl">Free</CardTitle>
                  <CardDescription className="mt-2">Get started with case prep</CardDescription>
                </div>
                <Badge variant="outline" className="text-sm">
                  Current Plan
                </Badge>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold">$0</span>
                <span className="text-gray-600 ml-2">forever</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-medium text-blue-900">
                    {isLoggedIn
                      ? `${freeCasesRemaining} of 3 cases remaining`
                      : '3 free cases available'}
                  </p>
                </div>

                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">3 case interviews</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">AI interviewer with voice</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Automated feedback</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Progress tracking</span>
                  </li>
                </ul>

                <Button
                  variant="outline"
                  className="w-full mt-6"
                  onClick={() => router.push(isLoggedIn ? '/dashboard' : '/auth/login')}
                >
                  {isLoggedIn ? 'Go to Dashboard' : 'Get Started'}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Pro Tier */}
          <Card className="relative border-2 border-blue-600 shadow-xl">
            <div className="absolute top-0 right-0 bg-blue-600 text-white px-4 py-1 rounded-bl-lg rounded-tr-lg">
              <span className="text-sm font-semibold">RECOMMENDED</span>
            </div>
            <CardHeader>
              <div>
                <CardTitle className="text-2xl text-blue-600">Pro</CardTitle>
                <CardDescription className="mt-2">Pay only for what you use</CardDescription>
              </div>
              <div className="mt-4">
                <span className="text-4xl font-bold">Usage-based</span>
              </div>
              <div className="mt-2">
                <span className="text-sm text-gray-600">Charged per AI API call • Powered by Echo</span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-900">
                    ✨ Only pay for what you use
                  </p>
                </div>

                <ul className="space-y-3">
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700"><strong>Pay per API call</strong> - transparent pricing</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">AI interviewer with voice (each message billed)</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">AI-powered feedback generation</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">No monthly commitment</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">Priority support</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <span className="text-gray-700">New cases added weekly</span>
                  </li>
                </ul>

                <div className="space-y-3 mt-6">
                  <p className="text-sm text-gray-600 text-center">Add funds to get started:</p>
                  <div className="grid grid-cols-3 gap-2">
                    <Button
                      variant="outline"
                      onClick={() => handleAddFunds(10)}
                    >
                      $10
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAddFunds(25)}
                      className="border-blue-600 text-blue-600"
                    >
                      $25
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => handleAddFunds(50)}
                    >
                      $50
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* FAQ / Additional Info */}
        <div className="mt-16 max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What happens after I use my 3 free cases?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  After your 3 free cases, you'll need to add funds to your Echo account. You'll only be charged for
                  the AI API calls you make during interviews - each message exchange with the AI interviewer and
                  feedback generation are billed separately based on actual usage.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">How does API-based pricing work?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  Add funds to your Echo account and you'll be charged only for the AI services you use:
                  each conversation turn with the AI interviewer and AI-generated feedback.
                  No subscriptions, no monthly fees - complete transparency on what you pay for.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">What types of cases are included?</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">
                  We cover all major case types: market sizing, profitability, market entry, pricing,
                  growth strategy, and operations. Cases range from beginner to advanced difficulty.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Back to Home */}
        <div className="text-center mt-12">
          <Button variant="ghost" onClick={() => router.push('/')}>
            ← Back to Home
          </Button>
        </div>
      </div>
    </div>
  )
}
