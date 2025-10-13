# Voice Case Flow V2 — Architecture

## Overview

VoiceSessionV2 is a production-grade, voice-first case interview system that uses OpenAI's Realtime API with server-mediated tools to ensure academic integrity and structured progression through interview stages.

## Key Principles

1. **No Answer Leakage**: The `expected_answer_summary` field is never exposed to the AI model or client before synthesis. Only the server compares against it for grading.

2. **Server-Mediated Tools**: All critical operations (section gating, scoring, hints, calculations) go through secure server endpoints that enforce business logic.

3. **Deterministic Scoring**: Rubric-based evaluation with reproducible results logged in the database.

4. **Section Gating**: Users must complete each section before advancing. The AI can only access the current section's prompts and data.

5. **Forced Calculator Usage**: All arithmetic must go through the `calc_basic` tool to prevent hallucinated calculations.

6. **Tiered Hints**: Hints progress from generic guidance to specific nudges, with usage logged per attempt.

## Architecture

```
┌─────────────┐
│   Client    │
│ (Browser)   │
└──────┬──────┘
       │
       │ WebRTC
       ↓
┌─────────────────┐
│ OpenAI Realtime │
│      API        │
└────────┬────────┘
         │
         │ Tool Calls
         ↓
┌──────────────────┐         ┌──────────────┐
│  Next.js API     │────────→│  Supabase    │
│  (Tool Handlers) │←────────│  PostgreSQL  │
└──────────────────┘         └──────────────┘
         │
         └─→ RLS Policies
         └─→ Validation
         └─→ State Machine
         └─→ Event Logging
```

## Database Schema

### `cases` Table

Stores case definitions with structured sections and evaluation criteria.

**Key Fields**:
- `sections` (JSONB): Array of `{name, goal, prompt, time_limit_sec, hints[], rubric}`
- `data_json` (JSONB): Case data (financials, market info, etc.)
- `ground_truth` (JSONB): Expected calculations and benchmarks
- `expected_answer_summary` (TEXT): **Staff-only** final answer for grading
- `disclosure_rules` (JSONB): Controls what gets exposed when
- `evaluation_rubric` (JSONB): Overall scoring criteria

**RLS**:
- Learners can only read published cases
- `expected_answer_summary` and `ground_truth` are filtered out for non-staff
- Staff have full access

### `case_attempts` Table

Tracks user progress through a case.

**Key Fields**:
- `current_section` (TEXT): State machine position
- `rubric_scores` (JSONB): Accumulated scores per section
- `transcript` (JSONB): Conversation history
- `state` (TEXT): `in_progress | completed | abandoned`

**RLS**:
- Users can read/write their own attempts
- Staff can read all attempts

### `case_events` Table

Audit log for all significant actions.

**Event Types**:
- `section_started`
- `hint_revealed`
- `calculation_performed`
- `response_scored`
- `section_advanced`

**RLS**:
- Readable by attempt owner and staff
- Append-only by server

## Server-Mediated Tools

All tools are implemented as Next.js API routes in `/app/api/voice-tools/`.

### 1. `get_case_section`

**Purpose**: Fetch current section details without revealing future sections or answers.

**Input**:
```typescript
{ caseId: string, attemptId: string }
```

**Logic**:
1. Verify attempt belongs to authenticated user
2. Read `current_section` from `case_attempts`
3. Fetch only that section from `cases.sections`
4. Return section prompt, goals, time limit, and restricted data
5. Never include `expected_answer_summary`

**Output**:
```typescript
{
  section: {
    name: string,
    goal: string,
    prompt: string,
    time_limit_sec: number,
    hints: Array<{ tier: number, text: string }>,
    rubric: object
  },
  data: object // Filtered based on section
}
```

### 2. `reveal_hint`

**Purpose**: Progressively disclose hints within a section.

**Input**:
```typescript
{ attemptId: string }
```

**Logic**:
1. Verify attempt ownership
2. Check current section and hint tier
3. Return next tier hint if available
4. Log `hint_revealed` event with tier

**Output**:
```typescript
{ hint: string, tier: number }
```

### 3. `calc_basic`

**Purpose**: Safely evaluate arithmetic expressions.

**Input**:
```typescript
{ expr: string }
```

**Logic**:
1. Parse expression using math.js or safe evaluator
2. Reject any code execution attempts
3. Log calculation event
4. Return result

**Output**:
```typescript
{ result: number }
```

**Rationale**: Forces the AI to externalize all math, preventing hallucinated calculations.

### 4. `score_response`

**Purpose**: Evaluate user's response against rubric.

**Input**:
```typescript
{
  attemptId: string,
  section: string,
  extracted_numbers: Record<string, number>,
  bullets: string[]
}
```

**Logic**:
1. Fetch section rubric from case
2. Compare `extracted_numbers` against `ground_truth`
3. Score framework structure and insights
4. Check sanity (e.g., profit = revenue - costs)
5. Update `case_attempts.rubric_scores`
6. Log `response_scored` event

**Output**:
```typescript
{
  scores: {
    quantitative: number,
    framework: number,
    insight: number,
    communication: number,
    sanity_checks: number
  },
  comments: string[],
  section_passed: boolean
}
```

### 5. `advance_section`

**Purpose**: Move to next section in the case flow.

**Input**:
```typescript
{ attemptId: string }
```

**Logic**:
1. Verify current section is complete (has score or time elapsed)
2. Update `current_section` to next in sequence
3. Log `section_advanced` event
4. Return new section name

**Output**:
```typescript
{ next_section: string }
```

## Realtime API Integration

### System Prompt

The AI interviewer operates under strict constraints:

```
You are a case interviewer. Follow section order strictly.
Never reveal answers. Use hints only via reveal_hint.
Require calc_basic for any arithmetic; do not compute in your head.
If interrupted while speaking, stop and listen; then briefly summarize and continue.
In each section, probe for structure before numbers. Gate quantitative work to the analysis section.
Before moving on, call score_response with extracted numbers and bullet reasoning.
Do not request or access expected answers; only the server may compare for grading.
```

### Tool Definitions

Tools are registered as OpenAI function definitions:

```javascript
{
  name: "get_case_section",
  description: "Fetch current section details",
  parameters: {
    type: "object",
    properties: {
      caseId: { type: "string" },
      attemptId: { type: "string" }
    },
    required: ["caseId", "attemptId"]
  }
}
// ... other tools
```

### Session Flow

1. **Start**: Create `case_attempts` row, call `get_case_section` for introduction
2. **Each Section**: AI uses section prompt, may call `reveal_hint` or `calc_basic`
3. **Before Advancing**: AI calls `score_response` with extracted reasoning
4. **Transition**: AI calls `advance_section`, receives next section
5. **End**: After synthesis section, mark attempt as completed

### Interruption Handling

If user speaks during AI TTS:
1. Stop audio output immediately
2. Listen to complete user input
3. Briefly acknowledge/summarize
4. Continue from interruption point

## Feature Flag

All V2 functionality is gated behind:

```bash
VOICE_SESSION_V2_ENABLED=false
```

**When disabled**:
- `/cases/[id]/voice` shows "Feature not available"
- Existing InterviewV1 is unaffected

**When enabled**:
- VoiceSessionV2 path activates
- Server tools become callable
- RLS enforces answer protection

## UI Components

### Timeline Sidebar

Vertical progress indicator showing:
- Introduction (✓)
- Framework (← current)
- Analysis (locked)
- Synthesis (locked)

### Hints Counter

Small pill: "Hints used: 2 / 4"
- Disabled if no hints available for current section
- Click to request next hint via `reveal_hint`

### Transcript Panel

Last 5-10 exchanges:
- User messages (right-aligned)
- AI messages (left-aligned)
- Fade older entries
- Scroll to bottom on new message

## Testing Strategy

### Unit Tests

- `score_response`: Verify scoring logic against known inputs
- `calc_basic`: Test safe evaluation and rejection of code
- Section state machine: Valid and invalid transitions

### Integration Tests

- Tool call flow: AI calls tool → server validates → returns result
- RLS enforcement: Query `expected_answer_summary` as non-staff user (should fail)
- Event logging: All actions create events

### Acceptance Criteria

- [ ] With flag off, InterviewV1 unchanged
- [ ] With flag on, complete Air Panama case end-to-end by voice
- [ ] Model cannot access `expected_answer_summary` until synthesis
- [ ] All math uses `calc_basic`
- [ ] Hints reveal in tiers and are logged
- [ ] Scores are deterministic and persisted
- [ ] Events are logged in `case_events`

## Developer Workflow

### Migrations

```bash
# Run migrations
supabase db push

# Or manually
psql $DATABASE_URL < supabase/migrations/20250111_voice_cases.sql
```

### Seeding

```bash
psql $DATABASE_URL < supabase/seed/voice_cases.sql
```

### Local Development

```bash
# Enable V2
echo "VOICE_SESSION_V2_ENABLED=true" >> .env.local

# Start dev server
npm run dev

# Navigate to /cases/{case-id}/voice
```

### Realtime API Keys

Ensure `OPENAI_API_KEY` is set in `.env.local` for ephemeral token generation.

## Security Considerations

### Answer Leakage Prevention

1. **Database Level**: RLS policies filter `expected_answer_summary` for non-staff
2. **API Level**: Tool handlers never include expected answers in responses
3. **Client Level**: TypeScript types exclude sensitive fields in client-side interfaces

### Calculation Integrity

All arithmetic must go through `calc_basic` to prevent:
- Hallucinated calculations
- Incorrect math leading to wrong conclusions
- Unverifiable reasoning

### State Machine Integrity

Only the server can advance sections. Client cannot skip ahead or access future content.

## Future Enhancements

- Real-time collaboration (multiple interviewers)
- Video exhibit support (charts, graphs)
- Adaptive difficulty based on performance
- Multi-language support beyond English
- Mobile app with native Realtime SDK

## Troubleshooting

### "No section available"

- Check `current_section` in `case_attempts`
- Verify case has matching section in `sections` array

### "Hint not found"

- Ensure current section has hints defined
- Check hint tier progression

### "Score calculation failed"

- Verify `ground_truth` exists in case
- Check rubric structure matches expected format

### "RLS policy violation"

- Confirm user is authenticated
- Check if case is published (`published = true`)
- Verify staff role for admin operations

## References

- [OpenAI Realtime API Docs](https://platform.openai.com/docs/guides/realtime)
- [Supabase RLS Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Case Interview Best Practices](https://www.casecoach.com/case-interview-best-practices)
