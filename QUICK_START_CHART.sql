-- ============================================================================
-- QUICK START: Add Analysis Charts to Cases
-- ============================================================================
-- Copy this entire file and paste into Supabase SQL Editor, then click Run
-- ============================================================================

-- Step 1: Add the analysis_chart column
ALTER TABLE public.cases
ADD COLUMN IF NOT EXISTS analysis_chart jsonb DEFAULT NULL;

-- Step 2: Add index
CREATE INDEX IF NOT EXISTS idx_cases_with_charts
ON public.cases(id) WHERE analysis_chart IS NOT NULL;

-- Step 3: Add comment
COMMENT ON COLUMN public.cases.analysis_chart IS
'Chart data displayed during the analysis section';

-- ============================================================================
-- OPTIONAL: Add chart to Air Panama case (uncomment to use)
-- ============================================================================

-- UPDATE public.cases
-- SET analysis_chart = jsonb_build_object(
--   'type', 'chart',
--   'library', 'recharts',
--   'chartType', 'bar',
--   'title', 'Revenue per Flight Comparison',
--   'config', jsonb_build_object(
--     'data', jsonb_build_array(
--       jsonb_build_object('route', 'Mango', 'revenue', 60000),
--       jsonb_build_object('route', 'NYC', 'revenue', 112000)
--     ),
--     'xAxis', jsonb_build_object('dataKey', 'route'),
--     'yAxis', jsonb_build_object('label', 'Revenue ($)'),
--     'bars', jsonb_build_array(
--       jsonb_build_object('dataKey', 'revenue', 'fill', '#2196F3')
--     )
--   )
-- )
-- WHERE title = 'Air Panama Revenue Growth';

-- ============================================================================
-- TEMPLATE: Add your own chart (replace placeholders)
-- ============================================================================

-- UPDATE public.cases
-- SET analysis_chart = jsonb_build_object(
--   'type', 'chart',
--   'library', 'recharts',
--   'chartType', 'bar',  -- Options: 'bar', 'line', 'pie', 'area'
--   'title', 'YOUR_CHART_TITLE',
--   'config', jsonb_build_object(
--     'data', jsonb_build_array(
--       jsonb_build_object('category', 'Category 1', 'value', 100),
--       jsonb_build_object('category', 'Category 2', 'value', 200)
--     ),
--     'xAxis', jsonb_build_object('dataKey', 'category'),
--     'yAxis', jsonb_build_object('label', 'Your Y-Axis Label'),
--     'bars', jsonb_build_array(
--       jsonb_build_object('dataKey', 'value', 'fill', '#2196F3')
--     )
--   )
-- )
-- WHERE id = 'YOUR_CASE_ID_HERE';

-- ============================================================================
-- Verify: Check which cases have charts
-- ============================================================================

SELECT
  id,
  title,
  analysis_chart->>'type' as chart_type,
  analysis_chart->>'title' as chart_title
FROM public.cases
WHERE analysis_chart IS NOT NULL;
