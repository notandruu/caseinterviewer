# CaseInterviewer

AI voice agent that runs mock consulting interviews in real time. Adapts follow-up questions on the fly, generates data exhibits mid-conversation, and scores you step by step. Sessions are paid in ETH via micropayments on Base L2, with a staking mechanic that returns funds only if you hit a score threshold. Contracts in Foundry, wallet integration with wagmi, payments handled through ethers.js.

## Stack

- **Framework**: Next.js 15, TypeScript, Tailwind CSS
- **AI/Voice**: GPT-4o Realtime API (OpenAI), ElevenLabs TTS
- **Auth**: Supabase magic-link
- **Database**: Supabase PostgreSQL
- **Payments**: ETH on Base L2 — wagmi + ethers.js
- **Contracts**: Foundry (Solidity 0.8.24)
- **UI**: Shadcn/ui

## How Payments Work

1. User connects wallet (MetaMask, Coinbase Wallet, or WalletConnect)
2. Before the interview starts, user calls `startSession(sessionId)` and stakes ETH
3. Interview runs — AI scores each section live
4. At the end, the server calls `completeSession(sessionId, score)` on-chain
5. Score ≥ threshold (default 70%) → stake returned automatically
6. Score < threshold → stake kept as protocol revenue

The contract is deployed on Base. Default session price is 0.001 ETH.

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env.local` and fill in:

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key

# OpenAI
OPENAI_API_KEY=sk-...

# ETH Payments
NEXT_PUBLIC_PAYMENT_CONTRACT_ADDRESS=0x...
NEXT_PUBLIC_SESSION_PRICE_ETH=0.001
NEXT_PUBLIC_SCORE_THRESHOLD=70
NEXT_PUBLIC_CHAIN_ID=84532
PAYMENT_ADMIN_PRIVATE_KEY=0x...
```

### 3. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## Smart Contract

Source: `contracts/src/CaseInterviewSession.sol`

```bash
# Install Foundry
curl -L https://foundry.paradigm.xyz | bash && foundryup

cd contracts

# Run tests
forge test

# Deploy to Base Sepolia
forge script script/Deploy.s.sol \
  --rpc-url base_sepolia \
  --broadcast \
  --verify
```

Set `DEPLOYER_PRIVATE_KEY`, `PAYMENT_ADMIN_ADDRESS`, and `BASESCAN_API_KEY` before deploying.

---

## Database

Migrations live in `supabase/migrations/`. Run them against your Supabase project:

```bash
supabase db push
```

Seed data for the Air Panama case is in `supabase/seed/voice_cases.sql`.

---

## Project Structure

```
├── app/
│   ├── api/
│   │   ├── realtime/token/     # OpenAI Realtime session proxy
│   │   ├── sessions/complete/  # Calls completeSession() on-chain
│   │   └── voice-tools/        # Interview tool endpoints (score, advance, hint, etc.)
│   ├── auth/                   # Login + signup (magic link)
│   ├── dashboard/              # Cases, history, analytics, settings, pricing
│   ├── interview/[id]/         # Live voice session
│   └── onboarding/             # First-time user flow
├── components/
│   ├── VoiceSession/           # Main interview UI (V2 + V3)
│   ├── providers/
│   │   └── Web3Provider.tsx    # wagmi + TanStack Query
│   └── ui/                     # Shadcn/ui components
├── contracts/
│   ├── src/CaseInterviewSession.sol
│   ├── test/CaseInterviewSession.t.sol
│   └── script/Deploy.s.sol
├── hooks/
│   ├── useAuth.ts              # Supabase session hook
│   └── useSessionPayment.ts    # wagmi payment hook
├── lib/
│   ├── supabase/               # DB clients (browser + server)
│   ├── web3/                   # wagmi config + contract ABI
│   └── openai/                 # OpenAI server helper
└── middleware.ts               # Supabase session guard
```

---

## Commands

```bash
npm run dev       # development server
npm run build     # production build
npm run lint      # lint
```
