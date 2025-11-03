-- ============================================================================
-- Add Analysis Chart Support to Cases Table
-- ============================================================================
-- This migration adds a column to store chart data for the "analysis" section
-- (also known as "Deeper Questions" phase) of each case interview.
--
-- The column supports two approaches:
-- 1. Store chart configuration (JSON) for rendering with Chart.js, Recharts, etc.
-- 2. Store a URL to a chart image/file uploaded to Supabase Storage
-- ============================================================================

-- Add the analysis_chart column to cases table
ALTER TABLE public.cases
ADD COLUMN analysis_chart jsonb DEFAULT NULL;

-- Add index for faster lookups when charts are defined
CREATE INDEX idx_cases_with_charts ON public.cases(id) WHERE analysis_chart IS NOT NULL;

-- Add comment explaining the column usage
COMMENT ON COLUMN public.cases.analysis_chart IS
'Chart data displayed during the analysis section. Can be:
1. Chart config object: {type: "chart", library: "recharts", config: {...}}
2. Image URL: {type: "image", url: "https://..."}
3. Supabase Storage: {type: "storage", bucket: "charts", path: "air-panama-chart.png"}';

-- ============================================================================
-- Example 1: Chart Configuration for Recharts (React charting library)
-- ============================================================================
-- This stores the chart data inline, which is rendered by the frontend

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
--     'xAxis', jsonb_build_object('dataKey', 'route', 'label', 'Route'),
--     'yAxis', jsonb_build_object('label', 'Revenue per Flight ($)'),
--     'bars', jsonb_build_array(
--       jsonb_build_object('dataKey', 'revenue', 'fill', '#2196F3', 'name', 'Revenue')
--     )
--   )
-- )
-- WHERE title = 'Air Panama Revenue Growth';

-- ============================================================================
-- Example 2: Image URL (External or CDN)
-- ============================================================================
-- This stores a direct URL to an image file

-- UPDATE public.cases
-- SET analysis_chart = jsonb_build_object(
--   'type', 'image',
--   'url', 'https://your-cdn.com/charts/air-panama-revenue-chart.png',
--   'alt', 'Revenue per Flight Comparison Chart'
-- )
-- WHERE title = 'Air Panama Revenue Growth';

-- ============================================================================
-- Example 3: Supabase Storage Reference
-- ============================================================================
-- This stores a reference to a file in Supabase Storage
-- First upload the chart to Supabase Storage, then reference it here

-- UPDATE public.cases
-- SET analysis_chart = jsonb_build_object(
--   'type', 'storage',
--   'bucket', 'case-charts',
--   'path', 'air-panama/revenue-comparison.png',
--   'alt', 'Revenue per Flight Comparison Chart'
-- )
-- WHERE title = 'Air Panama Revenue Growth';

-- ============================================================================
-- Example 4: Multiple Charts
-- ============================================================================
-- Store an array of charts to show multiple visualizations

-- UPDATE public.cases
-- SET analysis_chart = jsonb_build_object(
--   'type', 'multi',
--   'charts', jsonb_build_array(
--     jsonb_build_object(
--       'type', 'chart',
--       'library', 'recharts',
--       'chartType', 'bar',
--       'title', 'Revenue per Flight',
--       'config', jsonb_build_object(...)
--     ),
--     jsonb_build_object(
--       'type', 'chart',
--       'library', 'recharts',
--       'chartType', 'line',
--       'title', 'Utilization Rates',
--       'config', jsonb_build_object(...)
--     )
--   )
-- )
-- WHERE title = 'Air Panama Revenue Growth';

-- ============================================================================
-- Query to check which cases have charts defined
-- ============================================================================
-- SELECT
--   id,
--   title,
--   difficulty_level,
--   analysis_chart->>'type' as chart_type
-- FROM public.cases
-- WHERE analysis_chart IS NOT NULL;
