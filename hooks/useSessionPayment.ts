'use client'

import { useState, useCallback } from 'react'
import { useAccount, useConnect, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi'
import { parseEther, keccak256, toHex } from 'viem'
import { CASE_INTERVIEW_SESSION_ABI, CONTRACT_ADDRESS, SESSION_PRICE_ETH, SCORE_THRESHOLD } from '@/lib/web3/contracts'

interface PaymentState {
  isPaying: boolean
  txHash: `0x${string}` | undefined
  error: string | null
}

export function useSessionPayment() {
  const { address, isConnected } = useAccount()
  const { connect, connectors } = useConnect()
  const [state, setState] = useState<PaymentState>({ isPaying: false, txHash: undefined, error: null })

  const { writeContractAsync } = useWriteContract()

  const { data: sessionPrice } = useReadContract({
    address: CONTRACT_ADDRESS,
    abi: CASE_INTERVIEW_SESSION_ABI,
    functionName: 'sessionPrice',
  })

  const { isLoading: isTxPending, isSuccess: isTxConfirmed } = useWaitForTransactionReceipt({
    hash: state.txHash,
  })

  const pay = useCallback(async (interviewId: string): Promise<boolean> => {
    if (!isConnected || !address) {
      const injectedConnector = connectors.find(c => c.type === 'injected')
      if (injectedConnector) {
        await connect({ connector: injectedConnector })
      }
      return false
    }

    setState(s => ({ ...s, isPaying: true, error: null }))

    try {
      const sessionId = keccak256(toHex(interviewId)) as `0x${string}`
      const price = sessionPrice ?? parseEther(SESSION_PRICE_ETH)

      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESS,
        abi: CASE_INTERVIEW_SESSION_ABI,
        functionName: 'startSession',
        args: [sessionId],
        value: price,
      })

      setState(s => ({ ...s, txHash: hash }))
      return true
    } catch (err: any) {
      const message = err?.shortMessage || err?.message || 'Transaction failed'
      setState(s => ({ ...s, isPaying: false, error: message }))
      return false
    } finally {
      setState(s => ({ ...s, isPaying: false }))
    }
  }, [isConnected, address, connectors, connect, writeContractAsync, sessionPrice])

  return {
    address,
    isConnected,
    pay,
    txHash: state.txHash,
    isTxPending,
    isTxConfirmed,
    error: state.error,
    sessionPriceEth: sessionPrice ? (Number(sessionPrice) / 1e18).toFixed(4) : SESSION_PRICE_ETH,
    scoreThreshold: SCORE_THRESHOLD,
    connectors,
    connect,
  }
}
