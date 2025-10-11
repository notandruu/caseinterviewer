-- Restructure cases table to have separate columns for each section
-- This allows dynamic system prompts instead of hard-coded ones

-- Add new columns for each section of the case
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS section_introduction TEXT,
  ADD COLUMN IF NOT EXISTS section_clarifying TEXT,
  ADD COLUMN IF NOT EXISTS section_structuring TEXT,
  ADD COLUMN IF NOT EXISTS section_quant_1 TEXT,
  ADD COLUMN IF NOT EXISTS section_quant_2 TEXT,
  ADD COLUMN IF NOT EXISTS section_creative TEXT,
  ADD COLUMN IF NOT EXISTS section_recommendation TEXT,
  ADD COLUMN IF NOT EXISTS section_feedback_template TEXT;

-- Add metadata about the interview flow
ALTER TABLE public.cases
  ADD COLUMN IF NOT EXISTS num_sections INTEGER DEFAULT 7,
  ADD COLUMN IF NOT EXISTS section_order TEXT[] DEFAULT ARRAY['introduction', 'clarifying', 'structuring', 'quant_1', 'quant_2', 'creative', 'recommendation'];

-- Update the prompt column to be nullable (we'll phase it out)
ALTER TABLE public.cases
  ALTER COLUMN prompt DROP NOT NULL;

-- Add comment explaining the new structure
COMMENT ON COLUMN public.cases.section_introduction IS 'The opening case scenario presented to the candidate';
COMMENT ON COLUMN public.cases.section_clarifying IS 'Questions the interviewer can ask to clarify the case';
COMMENT ON COLUMN public.cases.section_structuring IS 'Prompt asking candidate to structure their approach';
COMMENT ON COLUMN public.cases.section_quant_1 IS 'First quantitative/analytical question';
COMMENT ON COLUMN public.cases.section_quant_2 IS 'Second quantitative question or data update';
COMMENT ON COLUMN public.cases.section_creative IS 'Brainstorming/creative thinking prompt';
COMMENT ON COLUMN public.cases.section_recommendation IS 'Final recommendation prompt';
COMMENT ON COLUMN public.cases.section_feedback_template IS 'Template for providing feedback (can reference specific criteria)';
