'use client'

import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { ArrowLeft, Wallet, Coins, TrendingUp, Shield } from 'lucide-react'
import { DashboardLayout } from '@/components/DashboardLayout'
import { SESSION_PRICE_ETH, SCORE_THRESHOLD } from '@/lib/web3/contracts'

export const dynamic = 'force-dynamic'

export default function PricingPage() {
  const router = useRouter()
  const { isLoggedIn } = useAuth()
  const { address, isConnected, chain } = useAccount()
  const { connect, connectors } = useConnect()
  const { disconnect } = useDisconnect()

  if (!isLoggedIn) {
    router.push('/auth/login')
    return null
  }

  return (
    <DashboardLayout>
      <main className="px-4 md:px-8 py-12 mt-16 md:mt-0">
        <button
          onClick={() => router.push('/dashboard')}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors mb-8"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Dashboard</span>
        </button>

        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-3">ETH Staking</h1>
            <p className="text-base text-gray-600 max-w-xl mx-auto">
              Stake ETH to start an interview session. Score {SCORE_THRESHOLD}%+ and your stake is returned in full.
            </p>
          </div>

          {/* Wallet Connection */}
          <div className="bg-white border border-gray-200 rounded-2xl p-8 mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-full bg-[#2196F3]/10 flex items-center justify-center">
                <Wallet className="h-5 w-5 text-[#2196F3]" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Wallet</h2>
                <p className="text-sm text-gray-500">Connect your wallet to pay with ETH on Base</p>
              </div>
            </div>

            {isConnected ? (
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-900">{address?.slice(0, 6)}...{address?.slice(-4)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {chain?.name || 'Unknown network'}
                  </p>
                </div>
                <button
                  onClick={() => disconnect()}
                  className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  Disconnect
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {connectors.map((connector) => (
                  <button
                    key={connector.uid}
                    onClick={() => connect({ connector })}
                    className="w-full flex items-center justify-between px-4 py-3 border border-gray-200 rounded-xl hover:border-[#2196F3] hover:bg-[#2196F3]/5 transition-all"
                  >
                    <span className="text-sm font-medium text-gray-900">{connector.name}</span>
                    <span className="text-xs text-gray-400">Connect</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* How It Works */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center mb-4">
                <Coins className="h-5 w-5 text-[#2196F3]" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Stake {SESSION_PRICE_ETH} ETH</h3>
              <p className="text-sm text-gray-600">
                Each session costs {SESSION_PRICE_ETH} ETH on Base L2. Transactions settle in seconds with minimal gas.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center mb-4">
                <TrendingUp className="h-5 w-5 text-green-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">Score {SCORE_THRESHOLD}%+ to Earn It Back</h3>
              <p className="text-sm text-gray-600">
                Hit the performance threshold and your stake is automatically refunded to your wallet on-chain.
              </p>
            </div>

            <div className="bg-white border border-gray-200 rounded-2xl p-6">
              <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center mb-4">
                <Shield className="h-5 w-5 text-purple-600" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">On-Chain Proof</h3>
              <p className="text-sm text-gray-600">
                Every session result is settled by a smart contract on Base. No intermediaries, no hidden fees.
              </p>
            </div>
          </div>

          {/* Contract Info */}
          <div className="bg-gray-50 rounded-2xl p-6">
            <h3 className="font-semibold text-gray-900 mb-4">Contract Details</h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Network</span>
                <span className="font-medium text-gray-900">Base (L2)</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Session price</span>
                <span className="font-medium text-gray-900">{SESSION_PRICE_ETH} ETH</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Score threshold</span>
                <span className="font-medium text-gray-900">{SCORE_THRESHOLD}%</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Refund mechanism</span>
                <span className="font-medium text-gray-900">Automatic, on-chain</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </DashboardLayout>
  )
}
