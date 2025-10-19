-- ============================================================================
-- Air Panama Revenue Chart - Example Implementation
-- ============================================================================
-- This adds a chart for the Air Panama case showing revenue comparison
-- Run this AFTER running 01_add_analysis_chart.sql
-- ============================================================================

-- Add a bar chart comparing Mango vs NYC route revenues
UPDATE public.cases
SET analysis_chart = jsonb_build_object(
  'type', 'chart',
  'library', 'recharts',
  'chartType', 'bar',
  'title', 'Revenue per Flight Comparison',
  'description', 'Comparing daily revenue potential between routes',
  'config', jsonb_build_object(
    'data', jsonb_build_array(
      jsonb_build_object(
        'route', 'Mango (Current)',
        'revenue', 60000,
        'flights', 2,
        'utilization', 60,
        'capacity', 200,
        'ticketPrice', 500
      ),
      jsonb_build_object(
        'route', 'NYC (Proposed)',
        'revenue', 112000,
        'flights', 3,
        'utilization', 80,
        'capacity', 200,
        'ticketPrice', 700
      )
    ),
    'xAxis', jsonb_build_object(
      'dataKey', 'route',
      'label', 'Route'
    ),
    'yAxis', jsonb_build_object(
      'label', 'Revenue per Flight ($)',
      'tickFormatter', 'currency'
    ),
    'bars', jsonb_build_array(
      jsonb_build_object(
        'dataKey', 'revenue',
        'fill', '#2196F3',
        'name', 'Revenue per Flight'
      )
    ),
    'tooltip', jsonb_build_object(
      'enabled', true,
      'formatter', 'currency'
    )
  )
)
WHERE title = 'Air Panama Revenue Growth';

-- Verify the chart was added
SELECT
  title,
  analysis_chart->>'type' as chart_type,
  analysis_chart->'config'->'data' as chart_data
FROM public.cases
WHERE title = 'Air Panama Revenue Growth';
