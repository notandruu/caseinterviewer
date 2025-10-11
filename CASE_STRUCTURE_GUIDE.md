# Case Structure Guide

## Overview

The case interview system now uses **dynamic prompts** with separate database columns for each section, making it easy to create different case types without changing code.

---

## Database Schema

### New Columns in `cases` Table:

```sql
-- Individual section content
section_introduction      TEXT    -- Opening scenario
section_clarifying        TEXT    -- Optional clarifying questions
section_structuring       TEXT    -- "Structure your approach"
section_quant_1          TEXT    -- First quantitative question
section_quant_2          TEXT    -- Second quant or data update
section_creative         TEXT    -- Brainstorming/creative prompt
section_recommendation   TEXT    -- Final recommendation prompt
section_feedback_template TEXT    -- Feedback template

-- Flow configuration
section_order            TEXT[]  -- Order of sections (e.g., ['introduction', 'structuring', 'quant_1'])
num_sections            INTEGER -- Total number of sections (default 7)
```

---

## How It Works

### 1. **User Message Counting**
The system tracks only user messages to determine which section to present:

```
User Message 0 (start) → section_order[0] (usually 'introduction')
User Message 1         → section_order[1] (usually 'structuring')
User Message 2         → section_order[2] (usually 'quant_1')
...and so on
```

### 2. **Dynamic Section Mapping**
The API route (`/api/interview/chat`) automatically:
- Counts user messages
- Looks up the section name from `section_order[userMessageCount]`
- Fetches content from `section_<name>` column
- Builds system prompt with that content

### 3. **Flexible Ordering**
Each case can define its own flow:

```sql
-- Standard case (7 sections)
section_order = ['introduction', 'clarifying', 'structuring', 'quant_1', 'quant_2', 'creative', 'recommendation']

-- Short case (4 sections)
section_order = ['introduction', 'structuring', 'quant_1', 'recommendation']

-- Operations case (custom flow)
section_order = ['introduction', 'process_mapping', 'bottleneck_analysis', 'solution_brainstorm', 'recommendation']
```

---

## Creating a New Case

### Step 1: Run Database Migrations

```bash
# In Supabase SQL Editor:

-- 1. Add new columns (if not already done)
-- Run: scripts/007_restructure_cases_for_dynamic_prompts.sql

-- 2. Migrate existing Air Panama case
-- Run: scripts/008_migrate_air_panama_case.sql
```

### Step 2: Insert New Case

```sql
INSERT INTO public.cases (
  title,
  description,
  industry,
  difficulty,
  case_type,
  estimated_duration,
  key_concepts,

  -- NEW: Section content
  section_introduction,
  section_structuring,
  section_quant_1,
  section_quant_2,
  section_creative,
  section_recommendation,
  section_feedback_template,

  -- NEW: Flow configuration
  section_order,
  num_sections
) VALUES (
  'TechCo Market Entry',
  'Help a tech company decide whether to enter a new market',
  'Technology',
  'intermediate',
  'market-entry',
  25,
  ARRAY['market analysis', 'competitive landscape', 'go-to-market strategy'],

  -- Section content
  '"Your client is TechCo, a mid-sized software company. They''re considering entering the European market..."',
  '"Take 2 minutes to structure your approach. Walk me through your framework for evaluating this market entry decision."',
  '"The European market has 500M potential users. Industry research shows 20% adoption rate. Average revenue per user is $50/year. What''s the potential market size?"',
  '"Now factor in: TechCo has 8% market share in the US. Competitors in Europe are 2 years ahead. Should we still enter?"',
  '"Beyond the numbers, what strategic considerations should influence this decision?"',
  '"Please provide your final recommendation: Should TechCo enter the European market?"',
  '"Good work. Your {structure_quality} framework covered the key areas..."',

  -- Flow (skip clarifying section)
  ARRAY['introduction', 'structuring', 'quant_1', 'quant_2', 'creative', 'recommendation'],
  6
);
```

---

## Section Types Reference

### Standard Sections

| Section Name | Purpose | When to Use |
|-------------|---------|-------------|
| `introduction` | Present case scenario | Always (first section) |
| `clarifying` | Allow candidate questions | Optional - use for ambiguous cases |
| `structuring` | Ask for framework | Almost always |
| `quant_1` | First calculation/analysis | Most cases |
| `quant_2` | Second quant or data update | Complex cases |
| `creative` | Brainstorming ideas | Most cases |
| `recommendation` | Final synthesis | Always (second-to-last) |
| `feedback` | Performance feedback | Always (last section) |

### Custom Sections

You can create custom section names for specific case types:

```sql
-- Operations case example
section_order = ARRAY[
  'introduction',
  'process_mapping',      -- Custom!
  'bottleneck_analysis',  -- Custom!
  'solution_brainstorm',
  'recommendation'
]

-- Then add custom columns:
ALTER TABLE cases ADD COLUMN section_process_mapping TEXT;
ALTER TABLE cases ADD COLUMN section_bottleneck_analysis TEXT;
```

---

## Example: Air Panama Case Structure

```sql
-- Introduction (User message 0)
section_introduction = "Your client is Air Panama, the second-largest airline in Latin America..."

-- Structuring (User message 1)
section_structuring = "Take a minute to structure your approach..."

-- Quant 1 (User message 2)
section_quant_1 = "The client is weighing adding 3 daily flights to NYC..."

-- Quant 2 (User message 3)
section_quant_2 = "Here's an update: Air Panama currently runs 12 daily NYC flights..."

-- Creative (User message 4)
section_creative = "Beyond revenue levers, what other ways could Air Panama improve profitability?"

-- Recommendation (User message 5)
section_recommendation = "Now, imagine the client asks for your final recommendation..."

-- Section order (skips clarifying)
section_order = ['introduction', 'structuring', 'quant_1', 'quant_2', 'creative', 'recommendation']
num_sections = 6
```

---

## Benefits of This Approach

### ✅ **No Code Changes for New Cases**
Just insert data into Supabase - no need to modify TypeScript files.

### ✅ **Flexible Interview Flows**
- Skip sections: Don't include 'clarifying' if not needed
- Add sections: Create 'quant_3' for complex cases
- Reorder: Put 'creative' before quants if desired

### ✅ **Easy Case Management**
Update case content directly in Supabase dashboard without redeploying.

### ✅ **Support Different Case Types**
```
Market Sizing: intro → clarifying → calculation → recommendation
Profitability: intro → structuring → cost_analysis → revenue_analysis → recommendation
Operations: intro → process_map → bottleneck → solution → recommendation
```

### ✅ **Templated Feedback**
Use variables in feedback template:
```
"Your {structure_quality} framework was {assessment}..."
```

---

## Migration Checklist

To migrate existing setup:

- [ ] Run `007_restructure_cases_for_dynamic_prompts.sql` in Supabase
- [ ] Run `008_migrate_air_panama_case.sql` in Supabase
- [ ] Verify Air Panama case has section data populated
- [ ] Test an interview to confirm it works
- [ ] Create new cases using the new structure
- [ ] (Optional) Remove old `prompt` column after validation

---

## Troubleshooting

### Interview not progressing?
- Check `section_order` array in database
- Verify all sections in order have corresponding `section_<name>` columns with content
- Check browser console for API errors

### AI not following script?
- Ensure section content has clear, direct text
- Avoid complex formatting in section text
- Test with shorter section content first

### Wrong section appearing?
- User message count might be off
- Check that `section_order` array indices match expected flow
- Verify no duplicate sections in order

---

## Future Enhancements

Possible additions:
- Section conditions (e.g., skip quant_2 if candidate struggles with quant_1)
- Time limits per section
- Required vs optional sections
- Section branching based on candidate responses
- Multi-path cases with different endings
