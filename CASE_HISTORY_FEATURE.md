# Case History Feature Documentation

## Overview
A comprehensive Case History feature has been implemented in the dashboard, allowing users to review all previously completed case interviews with detailed scores, AI feedback, transcripts, and improvement suggestions.

---

## Features Implemented

### 1. **Case History List** (`/dashboard/history`)

#### Summary Statistics Dashboard
- **Total Cases Completed**: Shows the count of all completed interviews
- **Average Score**: Displays the user's average performance across all cases
- **Strong Performances**: Count of cases scored 70% or higher

#### Case List View
Each case card displays:
- **Case Title & Details**: Full case name, firm, and industry
- **Performance Score**: Color-coded percentage (Green: 80+, Yellow: 60-79, Red: <60)
- **Duration**: Time spent on the interview
- **Difficulty Badge**: Visual indicator of case difficulty (Easy, Medium, Hard, Expert)
- **Completion Date**: Human-readable date (Today, Yesterday, X days ago)
- **Section Scores Preview**: Quick view of performance in each section

#### Interactive Features
- Click any case to view detailed breakdown
- Hover effects for better UX
- Empty state with CTA to start first case
- Loading states during data fetch

---

### 2. **Case History Detail View** (`/dashboard/history/[id]`)

#### Three-Tab Interface

##### **Overview Tab**
- **Performance Summary Card**
  - Large score display with color coding
  - Duration, hints used, and exchange count
  - Completion timestamp

- **Section Breakdown**
  - Individual section performance (Framework, Analysis, Synthesis)
  - Pass/Fail indicators for each section
  - Dimension-level scores (e.g., Quantitative, Framework, Insight)
  - AI-generated comments for each section

- **Improvement Suggestions**
  - Contextual recommendations based on performance
  - Specific areas to focus on
  - Hint usage optimization tips

##### **Transcript Tab**
- **Full Interview Transcript**
  - Chronological conversation history
  - Interviewer vs. Candidate messages differentiated
  - Section tags showing which phase each message belongs to
  - Timestamps for each exchange
  - Color-coded messages (gray for interviewer, blue for candidate)

##### **Detailed Feedback Tab**
- **Performance Analysis by Section**
  - Visual progress bars for each dimension
  - Detailed scores breakdown
  - AI feedback comments expanded

- **Next Steps for Improvement**
  - Practice similar cases recommendation
  - Framework review suggestions
  - Structured communication tips

#### Header Actions
- **Back Button**: Navigate to history list
- **Retry Case Button**: Launch the same case again for practice

---

## Technical Implementation

### Data Structure

#### Database Tables Used
1. **`case_attempts`** - Main table storing interview sessions
   - `id`: Unique attempt identifier
   - `user_id`: Links to the user
   - `case_id`: Links to the case
   - `started_at` / `completed_at`: Timing data
   - `total_score`: Overall performance percentage
   - `rubric_scores`: JSONB containing section-level scores
   - `transcript`: JSONB array of conversation messages
   - `hints_used`: JSONB array of hints requested
   - `state`: 'completed', 'in_progress', or 'abandoned'

2. **`cases`** - Referenced for case details
   - `title`, `firm`, `industry`, `difficulty_level`

#### Data Flow
```
User → Dashboard History Page
      ↓
Fetch completed attempts from Supabase
      ↓
Display list with stats
      ↓
Click on attempt → Navigate to /dashboard/history/[id]
      ↓
Fetch detailed attempt data with case info
      ↓
Display tabs with comprehensive breakdown
```

### Components Created

#### `/app/dashboard/history/page.tsx`
- **Purpose**: List view of all completed cases
- **Key Functions**:
  - `fetchHistory()`: Queries Supabase for completed attempts
  - `formatDuration()`: Converts timestamps to readable durations
  - `formatDate()`: Human-readable date formatting
  - `getScoreColor()`: Dynamic color coding based on score
  - `getDifficultyBadge()`: Styled difficulty level badges

#### `/app/dashboard/history/[id]/page.tsx`
- **Purpose**: Detailed view of single case attempt
- **Key Functions**:
  - `fetchAttemptDetail()`: Queries single attempt with case details
  - Tab switching logic (overview/transcript/feedback)
  - `handleReplay()`: Navigate to retry the same case
  - Score visualization and breakdown

### TypeScript Interfaces

```typescript
interface CaseAttemptWithCase {
  id: string
  case_id: string
  started_at: string
  completed_at: string | null
  total_score: number | null
  rubric_scores: any
  transcript: any[]
  state: string
  current_section: string
  hints_used: any[]
  case: {
    title: string
    firm: string | null
    industry: string | null
    difficulty_level: number
  }
}
```

---

## User Experience Flow

### First-Time User (No History)
1. Navigates to `/dashboard/history`
2. Sees empty state with:
   - Icon and message "No completed cases yet"
   - CTA button to start first case
3. Redirected to dashboard to begin

### Returning User (With History)
1. Navigates to `/dashboard/history`
2. Sees summary stats at top
3. Scrolls through list of completed cases
4. Clicks on a case card
5. Views detailed breakdown in tabbed interface
6. Can review transcript, feedback, or retry the case

---

## Visual Design

### Color Coding System
- **Scores**:
  - Green: 80%+ (Excellent)
  - Yellow: 60-79% (Good)
  - Red: <60% (Needs Improvement)

- **Difficulty Badges**:
  - Green: Easy (Level 1-2)
  - Yellow: Medium (Level 3)
  - Orange: Hard (Level 4)
  - Purple/Red: Expert (Level 5)

### Layout
- Clean white cards with subtle borders
- Hover effects on interactive elements
- Consistent spacing and typography
- Mobile-responsive design

---

## Database Query Examples

### Fetch User's Completed Cases
```typescript
const { data } = await supabase
  .from('case_attempts')
  .select(`
    id, case_id, started_at, completed_at,
    total_score, rubric_scores, transcript,
    state, current_section, hints_used,
    cases (title, firm, industry, difficulty_level)
  `)
  .eq('user_id', user.id)
  .eq('state', 'completed')
  .order('completed_at', { ascending: false })
```

### Fetch Single Attempt Detail
```typescript
const { data } = await supabase
  .from('case_attempts')
  .select(`
    id, case_id, started_at, completed_at,
    total_score, rubric_scores, transcript,
    state, current_section, hints_used, metadata,
    cases (id, title, firm, industry, difficulty_level, summary)
  `)
  .eq('id', attemptId)
  .eq('user_id', user.id)
  .single()
```

---

## Future Enhancements

### Potential Additions
1. **Filters & Sorting**
   - Filter by difficulty level
   - Sort by score, date, or duration
   - Search by case name or firm

2. **Comparison View**
   - Compare multiple attempts of the same case
   - Show improvement over time
   - Progress charts

3. **Export Functionality**
   - Download transcript as PDF
   - Export scores to CSV
   - Share feedback link

4. **Notes & Reflections**
   - Add personal notes to each attempt
   - Tag cases for review
   - Save specific transcript highlights

5. **Analytics Dashboard**
   - Performance trends over time
   - Strengths and weaknesses analysis
   - Recommended practice areas

6. **Social Features**
   - Compare with peer averages
   - Leaderboards (opt-in)
   - Share achievements

---

## Testing Checklist

### Manual Testing Steps
- [ ] Navigate to `/dashboard/history` as new user (expect empty state)
- [ ] Complete a case interview
- [ ] Verify case appears in history list
- [ ] Click on case to view details
- [ ] Switch between all three tabs (Overview, Transcript, Feedback)
- [ ] Click "Retry Case" button and verify navigation
- [ ] Check score color coding displays correctly
- [ ] Verify timestamps format properly
- [ ] Test with multiple completed cases
- [ ] Verify stats calculations are accurate

### Edge Cases
- [ ] User with no completed cases
- [ ] Case with null/missing scores
- [ ] Case with empty transcript
- [ ] Case with no rubric scores
- [ ] Very long transcripts (performance)
- [ ] Cases from different time periods

---

## Routes Created

| Route | Type | Purpose |
|-------|------|---------|
| `/dashboard/history` | List View | Shows all completed cases with summary stats |
| `/dashboard/history/[id]` | Detail View | Shows detailed breakdown of single attempt |

---

## Build Status
✅ **Build Successful**
- Both routes compiled without errors
- TypeScript types validated
- Components rendered correctly

---

## Dependencies Used
- `@/lib/supabase/client` - Database queries
- `@merit-systems/echo-react-sdk` - User authentication
- `lucide-react` - Icons
- `next/navigation` - Routing

---

## Summary

The Case History feature provides a comprehensive solution for users to:
- Track their progress across all case interviews
- Review detailed performance metrics
- Read full interview transcripts
- Receive actionable feedback
- Retry cases for improvement

This feature supports the learning journey by giving users clear visibility into their strengths, weaknesses, and areas for growth.
