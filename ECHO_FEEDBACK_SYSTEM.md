# Echo-Powered Feedback System

## Overview

The feedback system uses **Echo credits** to generate personalized, AI-powered feedback based on users' actual interview responses. This replaces the previous static feedback with dynamic analysis that compares user performance against case-specific model answers.

---

## How It Works

### 1. **During Interview (Voice Session)**

The Realtime API captures the full transcript:
```typescript
// User speaks → Transcript captured in real-time
{
  role: 'user',
  content: 'I would use a profitability framework...',
  section: 'framework',
  timestamp: '2025-01-15T10:30:00Z'
}
```

### 2. **On Interview Completion**

When user finishes the last section (synthesis):

```typescript
// advance-section endpoint receives completion signal
POST /api/voice-tools/advance-section
{
  attemptId: 'uuid',
  transcript: [...] // Full interview transcript
}

// Backend saves transcript and triggers feedback generation
await supabase.update({
  state: 'generating_feedback',
  transcript: transcript  // Saves all user responses
})

// Triggers Echo-powered feedback (async, doesn't block)
fetch('/api/voice-tools/generate-feedback', {
  body: JSON.stringify({ attemptId })
})
```

### 3. **Feedback Generation (Echo Credits Used Here)**

```typescript
// generate-feedback endpoint uses Echo API
const echoOpenAI = getEchoOpenAI() // Routes through Echo proxy

// THIS IS WHERE USER'S CREDITS ARE CHARGED
const response = await echoOpenAI.chat.completions.create({
  model: 'gpt-4o',
  messages: [{
    role: 'system',
    content: `Compare user's responses against model answers...`
  }],
  max_tokens: 12000  // ~$0.24 worth of API usage
})

// User charged through Echo
// You earn markup (e.g., 900% = $2.16)
```

### 4. **Feedback Stored in Database**

```typescript
// Generated feedback saved to case_attempts
{
  rubric_scores: {
    framework: {
      score: 75,
      section_passed: true,
      strengths: ['Clear structure', 'Identified revenue and cost'],
      weaknesses: ['Missing market factors'],
      specific_feedback: 'You demonstrated...',
      improvement_tips: ['Consider adding...']
    },
    analysis: { ... },
    synthesis: { ... }
  },
  total_score: 78,
  state: 'completed'
}
```

### 5. **User Views Feedback**

User navigates to `/dashboard/history/[attemptId]` and sees:
- Overall score (calculated from all sections)
- Section-by-section breakdown
- Specific strengths and weaknesses
- Improvement tips
- Full transcript review

---

## Database Schema

### Enhanced `ground_truth` Column

Each case now has model answers and common mistakes:

```json
{
  "calculations": {
    "revenue_per_flight": 13500,
    "cost_per_flight": 15800,
    "profit_per_flight": -2300
  },
  "framework_components": [
    "Revenue streams",
    "Cost structure",
    "Market factors"
  ],
  "model_answers": {
    "framework": {
      "description": "Profitability framework...",
      "key_elements": [...],
      "sample_structure": "I would approach this by..."
    },
    "analysis": {
      "description": "Quantitative analysis...",
      "key_insights": [...],
      "sample_reasoning": "Looking at the numbers..."
    },
    "synthesis": {
      "description": "Recommendation...",
      "key_points": [...],
      "sample_recommendation": "Based on my analysis..."
    }
  },
  "common_mistakes": {
    "framework": [
      "Forgetting to mention both revenue AND cost",
      "Not structuring before diving into numbers"
    ],
    "analysis": [...],
    "synthesis": [...]
  }
}
```

### Transcript Storage

```typescript
// case_attempts.transcript (JSONB array)
[
  {
    role: 'assistant',
    content: 'Let\'s begin with the framework...',
    section: 'framework',
    timestamp: '2025-01-15T10:25:00Z'
  },
  {
    role: 'user',
    content: 'I would use a profitability framework...',
    section: 'framework',
    timestamp: '2025-01-15T10:25:30Z'
  },
  ...
]
```

---

## Cost Economics

### Per Interview Session:

**User's Cost (through Echo):**
- Feedback generation API call: ~$0.24 (actual OpenAI cost)
- Echo charges user with markup
- Example with 10x markup: User pays ~$2.40 in credits

**Your Revenue:**
- You set markup percentage (e.g., 900%)
- You earn: $2.16 per session (900% of $0.24)
- Your cost for voice session: ~$0.15 (direct to OpenAI)
- **Net profit: ~$2.01 per session**

**User Value:**
- Personalized feedback analyzing their actual responses
- Specific strengths and weaknesses identified
- Actionable improvement tips
- Comparison against expert-level model answers

---

## Adding Model Answers to Cases

### 1. Run Migration

```bash
# Add model answers to existing cases
psql -f supabase/migrations/03_add_model_answers_air_panama.sql
```

### 2. For New Cases

When creating a new case in Supabase:

```sql
INSERT INTO cases (title, ground_truth, ...) VALUES (
  'New Case Title',
  '{
    "calculations": { ... },
    "framework_components": [ ... ],
    "model_answers": {
      "framework": {
        "description": "...",
        "key_elements": [...],
        "sample_structure": "..."
      },
      "analysis": { ... },
      "synthesis": { ... }
    },
    "common_mistakes": {
      "framework": [...],
      "analysis": [...],
      "synthesis": [...]
    }
  }'::jsonb,
  ...
);
```

---

## API Endpoints

### `POST /api/voice-tools/generate-feedback`

**Purpose:** Generate AI feedback using Echo credits

**Request:**
```json
{
  "attemptId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "total_score": 78,
  "rubric_scores": { ... },
  "overall_assessment": "...",
  "next_steps": [...]
}
```

**Errors:**
- `402`: Insufficient Echo credits
- `404`: Attempt not found
- `401`: Unauthorized

### `POST /api/voice-tools/advance-section`

**Enhanced:** Now saves transcript on completion

**Request (on final section):**
```json
{
  "attemptId": "uuid",
  "transcript": [
    { role: 'user', content: '...', section: 'framework' },
    ...
  ]
}
```

**Response:**
```json
{
  "next_section": null,
  "completed": true,
  "message": "Interview completed. Generating personalized feedback..."
}
```

---

## User Flow

1. **User starts case** → Voice session begins
2. **User responds to each section** → Transcript captured
3. **User completes synthesis** → Transcript saved
4. **Backend triggers feedback** → Echo API called (user charged)
5. **Feedback generated** → Saved to database
6. **User views results** → Personalized feedback displayed

---

## Testing the System

### 1. Run a Complete Interview

```bash
# Start the dev server
npm run dev

# Navigate to a case and complete it
http://localhost:3000/cases/[case-id]/voice
```

### 2. Check Database

```sql
-- View saved transcript
SELECT transcript FROM case_attempts WHERE id = 'attempt-id';

-- View generated feedback
SELECT rubric_scores, total_score FROM case_attempts WHERE id = 'attempt-id';
```

### 3. Monitor Echo Usage

- Check Echo dashboard for API usage
- Verify credits were deducted from user
- Confirm you received markup revenue

---

## Advantages Over Static Feedback

| Static Feedback | Echo-Powered Feedback |
|----------------|----------------------|
| ❌ Same for everyone | ✅ Personalized to actual responses |
| ❌ Generic tips | ✅ Specific examples from their interview |
| ❌ No real analysis | ✅ Compares against model answers |
| ❌ No learning | ✅ AI learns what good answers look like |
| ❌ Free (no revenue) | ✅ Generates revenue through Echo |

---

## Future Enhancements

1. **Progressive Feedback**
   - Real-time hints during interview based on current performance
   - Adaptive difficulty based on responses

2. **Trend Analysis**
   - Track improvement across multiple attempts
   - Identify persistent weak areas

3. **Video Analysis**
   - Analyze tone, pacing, confidence from voice
   - Body language feedback (if webcam enabled)

4. **Peer Comparison**
   - Compare scores against others at similar experience level
   - Percentile rankings

---

## Summary

This system provides:
- ✅ **Real feedback** based on actual user responses
- ✅ **Echo integration** for seamless billing
- ✅ **Revenue generation** from valuable AI analysis
- ✅ **Scalable** infrastructure for all cases
- ✅ **User value** through personalized improvement tips

**Cost per session:** ~$0.15 (your OpenAI cost)
**Revenue per session:** ~$2.16 (from Echo markup)
**Net profit:** ~$2.01 per interview

The feedback generation uses Echo credits productively while providing significant value to users.
