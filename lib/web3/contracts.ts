export const CASE_INTERVIEW_SESSION_ABI = [
  {
    type: 'constructor',
    inputs: [
      { name: '_sessionPrice', type: 'uint256' },
      { name: '_scoreThreshold', type: 'uint8' },
      { name: '_admin', type: 'address' },
    ],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'startSession',
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'payable',
  },
  {
    type: 'function',
    name: 'completeSession',
    inputs: [
      { name: 'sessionId', type: 'bytes32' },
      { name: 'score', type: 'uint8' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'emergencyRefund',
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getSession',
    inputs: [{ name: 'sessionId', type: 'bytes32' }],
    outputs: [
      {
        name: '',
        type: 'tuple',
        components: [
          { name: 'user', type: 'address' },
          { name: 'stakeAmount', type: 'uint256' },
          { name: 'startTime', type: 'uint256' },
          { name: 'completed', type: 'bool' },
          { name: 'refunded', type: 'bool' },
          { name: 'finalScore', type: 'uint8' },
        ],
      },
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'sessionPrice',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'scoreThreshold',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'SessionStarted',
    inputs: [
      { name: 'sessionId', indexed: true, type: 'bytes32' },
      { name: 'user', indexed: true, type: 'address' },
      { name: 'stake', indexed: false, type: 'uint256' },
    ],
  },
  {
    type: 'event',
    name: 'SessionCompleted',
    inputs: [
      { name: 'sessionId', indexed: true, type: 'bytes32' },
      { name: 'user', indexed: true, type: 'address' },
      { name: 'score', indexed: false, type: 'uint8' },
      { name: 'passed', indexed: false, type: 'bool' },
      { name: 'refunded', indexed: false, type: 'bool' },
    ],
  },
  { type: 'error', name: 'SessionAlreadyExists', inputs: [] },
  { type: 'error', name: 'SessionNotFound', inputs: [] },
  { type: 'error', name: 'SessionAlreadyCompleted', inputs: [] },
  { type: 'error', name: 'InsufficientStake', inputs: [] },
  { type: 'error', name: 'OnlyOwner', inputs: [] },
  { type: 'error', name: 'OnlyAdmin', inputs: [] },
  { type: 'error', name: 'RefundFailed', inputs: [] },
  { type: 'error', name: 'WithdrawFailed', inputs: [] },
] as const

export const CONTRACT_ADDRESS = (process.env.NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS || '0x0000000000000000000000000000000000000000') as `0x${string}`

export const SESSION_PRICE_ETH = process.env.NEXT_PUBLIC_SESSION_PRICE_ETH || '0.001'
export const SCORE_THRESHOLD = parseInt(process.env.NEXT_PUBLIC_SCORE_THRESHOLD || '70', 10)
