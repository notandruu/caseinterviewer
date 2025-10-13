# Voice V2 Implementation Status

## 🎯 Project Overview

Voice V2 is a production-grade, voice-first case interview system with server-mediated tools to ensure academic integrity. This implementation adds:

- **Server-Mediated Tools**: All critical operations (section gating, scoring, hints, calculations) go through secure API endpoints
- **No Answer Leakage**: `expected_answer_summary` is never exposed to the AI or client
- **Deterministic Scoring**: Rubric-based evaluation with reproducible results
- **Section Gating**: Users must complete each section before advancing
- **Forced Calculator**: All arithmetic goes through `calc_basic` tool

## ✅ Completed Components

### 1. Foundation & Documentation
- [x] **Architecture Documentation** (`docs/voice-v2/readme.md`)
  - Complete system overview
  - Database schema documentation
  - Tool descriptions and flow diagrams
  - Developer workflow guide

### 2. Database Layer
- [x] **Migration** (`supabase/migrations/20250111_voice_v2_cases.sql`)
  - Enhanced `cases` table with sections, ground truth, disclosure rules
  - `case_attempts` table for progress tracking
  - `case_events` table for audit logging
  - Row Level Security (RLS) policies
  - Helper functions for section progression
  - Full-text search index

- [x] **Seed Data** (`supabase/seed/voice_cases.sql`)
  - Air Panama case with 4 sections, tiered hints, detailed rubrics
  - RetailCo expansion case as second example
  - Complete section structure with goals, prompts, hints, rubrics

### 3. Type System
- [x] **TypeScript Types** (`types/cases.ts`)
  - Complete type definitions mirroring database schema
  - Client-safe variants that exclude sensitive fields
  - API request/response types
  - Realtime API types
  - UI state types
  - Type guards and utility functions

- [x] **Zod Validators** (`lib/validators/cases.ts`)
  - Runtime validation for all API payloads
  - Schema validators for cases, attempts, events
  - Request/response validators for each tool
  - Event payload validators
  - Expression sanitization and safety checks
  - Helper functions for validation

### 4. Server-Mediated API Tools
All implemented as Next.js API routes in `/app/api/voice-tools/`:

- [x] **get_case_section** (`get-case-section/route.ts`)
  - Fetches current section without revealing future sections
  - Filters data based on section (intro/framework get less data than analysis)
  - Verifies attempt ownership via RLS
  - Logs section_started event

- [x] **reveal_hint** (`reveal-hint/route.ts`)
  - Progressive hint disclosure (tier 1 → 2 → 3 → 4)
  - Tracks hints used per section
  - Prevents over-disclosure
  - Logs hint_revealed event

- [x] **calc_basic** (`calc-basic/route.ts`)
  - Safe arithmetic expression evaluator
  - Prevents code injection with strict validation
  - Supports +, -, *, /, parentheses, decimals
  - Rounds results to avoid floating point issues
  - GET endpoint for testing

- [x] **score_response** (`score-response/route.ts`)
  - Multi-dimensional scoring:
    - Quantitative accuracy (compares against ground truth)
    - Framework quality (checks for key components)
    - Insight depth (heuristics for causality)
    - Communication clarity
    - Sanity checks (profit = revenue - cost, etc.)
  - Updates attempt's rubric_scores
  - Logs response_scored event
  - Returns pass/fail and comments

- [x] **advance_section** (`advance-section/route.ts`)
  - State machine controller
  - Enforces completion rules (must score before advancing)
  - Transitions: introduction → framework → analysis → synthesis
  - Marks attempt as completed when reaching end
  - Logs section_advanced or attempt_completed event

- [x] **create_attempt** (`create-attempt/route.ts`)
  - Creates new attempt for user
  - Verifies case is published
  - Sets initial section to 'introduction'

### 5. Client SDK
- [x] **Tool Wrappers** (`lib/tools.ts`)
  - Typed wrapper functions for each API tool
  - Unified error handling
  - Realtime API tool definitions (for OpenAI function calling)
  - Tool handler router (`handleRealtimeTool`)
  - Helper functions (createAttempt, isVoiceV2Enabled)

### 6. Feature Flag
- [x] **Environment Configuration**
  - `NEXT_PUBLIC_VOICE_SESSION_V2_ENABLED` in `.env.example`
  - Default: `false`
  - Set to `true` in `.env.local` for development

### 7. Route Structure
- [x] **Voice Interview Route** (`app/cases/[id]/voice/page.tsx`)
  - Feature flag check
  - Case fetching with published filter
  - Attempt creation
  - Loading and error states
  - Placeholder for VoiceSessionV3 component

## 🔨 In Progress / Pending

### 1. Core Voice Component
- [ ] **VoiceSessionV3 Component** (`components/VoiceSession/VoiceSessionV3.tsx`)
  - Realtime API WebRTC connection
  - Tool registration with OpenAI
  - Tool call handling (call API → return result to AI)
  - System prompt with strict constraints
  - Interruption handling
  - Transcript management
  - State synchronization

### 2. UI Components
- [ ] **Timeline Sidebar** (`components/voice-v2/TimelineSidebar.tsx`)
  - Vertical progress indicator
  - Section states: locked | current | completed
  - Score display per completed section

- [ ] **Hints Counter** (`components/voice-v2/HintsCounter.tsx`)
  - "Hints used: X / Y" display
  - Button to request hint (calls reveal_hint)
  - Disabled when no hints available

- [ ] **Transcript Panel** (`components/voice-v2/TranscriptPanel.tsx`)
  - Last 5-10 exchanges
  - User (right) vs AI (left)
  - Auto-scroll to bottom
  - Fade older entries

### 3. Testing
- [ ] **Unit Tests**
  - `score_response` logic (quantitative, framework, insight scoring)
  - `calc_basic` safety (reject code injection)
  - Section state machine transitions

- [ ] **Integration Tests**
  - Tool call flow: AI → API → DB → Response
  - RLS enforcement (query expected_answer_summary as non-staff)
  - Event logging (all actions create events)

- [ ] **Acceptance Tests**
  - Complete Air Panama case end-to-end
  - Verify no answer leakage
  - Verify all math uses calc_basic
  - Verify hints reveal in tiers
  - Verify scores are deterministic

### 4. Documentation
- [ ] **Developer Setup Guide** (`docs/voice-v2/SETUP.md`)
  - How to run migrations
  - How to seed data
  - How to enable V2 locally
  - How to test Realtime API

- [ ] **API Reference** (`docs/voice-v2/API.md`)
  - Complete endpoint documentation
  - Request/response schemas
  - Error codes
  - Example calls

## 📊 File Structure

```
case-interview-simulator/
├── app/
│   ├── api/
│   │   └── voice-tools/
│   │       ├── get-case-section/route.ts
│   │       ├── reveal-hint/route.ts
│   │       ├── calc-basic/route.ts
│   │       ├── score-response/route.ts
│   │       ├── advance-section/route.ts
│   │       └── create-attempt/route.ts
│   └── cases/
│       └── [id]/
│           └── voice/
│               └── page.tsx
├── components/
│   └── voice-v2/                    [TODO]
│       ├── TimelineSidebar.tsx
│       ├── HintsCounter.tsx
│       └── TranscriptPanel.tsx
├── lib/
│   ├── tools.ts                     ✅
│   └── validators/
│       └── cases.ts                 ✅
├── types/
│   └── cases.ts                     ✅
├── supabase/
│   ├── migrations/
│   │   └── 20250111_voice_v2_cases.sql  ✅
│   └── seed/
│       └── voice_cases.sql          ✅
└── docs/
    └── voice-v2/
        ├── readme.md                ✅
        ├── IMPLEMENTATION_STATUS.md ✅
        ├── SETUP.md                 [TODO]
        └── API.md                   [TODO]
```

## 🚀 Next Steps

### Immediate (Phase 1)
1. **Implement VoiceSessionV3 Component**
   - Set up Realtime API connection
   - Register tools using `REALTIME_TOOL_DEFINITIONS`
   - Handle tool calls with `handleRealtimeTool`
   - Implement system prompt from docs

2. **Create UI Components**
   - Timeline sidebar showing section progress
   - Hints counter with reveal button
   - Transcript panel with auto-scroll

3. **Wire Everything Together**
   - Integrate VoiceSessionV3 into `/cases/[id]/voice`
   - Test full flow: intro → framework → analysis → synthesis

### Testing (Phase 2)
1. **Run Migrations**
   ```bash
   supabase db push
   psql $DATABASE_URL < supabase/seed/voice_cases.sql
   ```

2. **Manual Testing**
   - Complete Air Panama case end-to-end
   - Verify no answer leakage
   - Test hint progression
   - Test calculator tool
   - Test section gating

3. **Automated Tests**
   - Unit tests for scoring logic
   - RLS tests for answer protection
   - Integration tests for tool flow

### Polish (Phase 3)
1. **Documentation**
   - Developer setup guide
   - API reference
   - Troubleshooting guide

2. **Performance**
   - Optimize database queries
   - Add caching where appropriate
   - Monitor Realtime API latency

3. **Deployment**
   - Run migrations in production Supabase
   - Seed production cases
   - Enable feature flag for beta users

## 🔐 Security Checklist

- [x] RLS policies prevent answer leakage
- [x] API tools verify attempt ownership
- [x] Expression sanitization prevents code injection
- [x] Ground truth never exposed to AI
- [x] All sensitive operations server-side
- [ ] Rate limiting on API tools (future)
- [ ] IP-based abuse detection (future)

## 📝 Notes

### Design Decisions
1. **Why server-mediated tools?**
   - Prevents client-side manipulation
   - Enables deterministic scoring
   - Allows audit trail via events table

2. **Why force calculator usage?**
   - AI models can hallucinate calculations
   - Ensures accuracy and verifiability
   - Teaches candidates to show work

3. **Why tiered hints?**
   - Encourages independent thinking first
   - Progressive support without giving away answers
   - Tracks coaching dependency

4. **Why section gating?**
   - Ensures structured progression
   - Prevents jumping to analysis without framework
   - Matches real case interview flow

### Known Limitations
1. **No real-time collaboration yet**
   - Future: Add multiplayer support for group cases

2. **Basic scoring heuristics**
   - Future: ML-based scoring for open-ended responses

3. **English only**
   - Future: Multi-language support

4. **No video exhibits**
   - Future: Support charts, graphs, images

## 🎓 Learning Resources

- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Case Interview Framework](https://www.casecoach.com/case-interview-framework)

---

**Last Updated**: October 11, 2025
**Status**: Phase 1 Complete (Infrastructure), Phase 2 Pending (UI Components)
**Next Milestone**: Working VoiceSessionV3 with tool integration
