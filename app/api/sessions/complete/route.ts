import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ethers } from 'ethers'
import { keccak256, toUtf8Bytes } from 'ethers'
import { CASE_INTERVIEW_SESSION_ABI, CONTRACT_ADDRESS } from '@/lib/web3/contracts'

export async function POST(request: NextRequest) {
  try {
    const { attemptId, score } = await request.json()

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const adminKey = process.env.PAYMENT_ADMIN_PRIVATE_KEY
    const rpcUrl = process.env.NEXT_PUBLIC_CHAIN_ID === '8453'
      ? 'https://mainnet.base.org'
      : 'https://sepolia.base.org'

    if (!adminKey) {
      return NextResponse.json({ error: 'Payment admin not configured' }, { status: 500 })
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl)
    const signer = new ethers.Wallet(adminKey, provider)

    const contract = new ethers.Contract(
      CONTRACT_ADDRESS,
      CASE_INTERVIEW_SESSION_ABI,
      signer
    )

    const sessionId = keccak256(toUtf8Bytes(attemptId))

    const session = await contract.getSession(sessionId)
    if (session.user === ethers.ZeroAddress) {
      return NextResponse.json({ skipped: true, reason: 'No on-chain session found' })
    }

    if (session.completed) {
      return NextResponse.json({ skipped: true, reason: 'Session already completed on-chain' })
    }

    const tx = await contract.completeSession(sessionId, score)
    await tx.wait()

    const passed = score >= parseInt(process.env.NEXT_PUBLIC_SCORE_THRESHOLD || '70', 10)

    return NextResponse.json({
      success: true,
      txHash: tx.hash,
      passed,
      score,
      refunded: passed,
    })
  } catch (error: any) {
    console.error('[sessions/complete] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
