# Analysis Chart Setup Guide

This guide explains how to add charts to your case interviews that will be displayed during the "Analysis" (Deeper Questions) phase.

## Table of Contents
1. [Quick Start](#quick-start)
2. [Database Setup](#database-setup)
3. [Chart Storage Options](#chart-storage-options)
4. [Examples](#examples)
5. [Frontend Integration](#frontend-integration)

---

## Quick Start

### Step 1: Run the Migration
In your Supabase SQL Editor, run:
```sql
-- This adds the analysis_chart column to the cases table
\i supabase/migrations/01_add_analysis_chart.sql
```

### Step 2: Add Chart Data
Choose one of the approaches below and run the SQL to add your chart.

---

## Database Setup

### What Changed
A new `analysis_chart` column was added to the `cases` table:
- **Type**: `jsonb` (flexible JSON storage)
- **Nullable**: Yes (charts are optional)
- **Indexed**: Cases with charts are indexed for faster lookups

---

## Chart Storage Options

### Option 1: Chart Configuration (Recommended)
Store chart data as JSON config that your frontend can render using libraries like Recharts, Chart.js, etc.

**Pros:**
- Dynamic and interactive charts
- Easy to update
- No external dependencies
- Fast loading

**Example:**
```sql
UPDATE public.cases
SET analysis_chart = jsonb_build_object(
  'type', 'chart',
  'library', 'recharts',
  'chartType', 'bar',
  'title', 'Revenue Comparison',
  'config', jsonb_build_object(
    'data', jsonb_build_array(
      jsonb_build_object('category', 'Option A', 'value', 60000),
      jsonb_build_object('category', 'Option B', 'value', 112000)
    ),
    'xAxis', jsonb_build_object('dataKey', 'category'),
    'yAxis', jsonb_build_object('label', 'Revenue ($)'),
    'bars', jsonb_build_array(
      jsonb_build_object('dataKey', 'value', 'fill', '#2196F3')
    )
  )
)
WHERE id = 'your-case-id';
```

### Option 2: Image URL
Store a direct URL to a chart image (PNG, JPG, SVG).

**Pros:**
- Simple to implement
- Works with any chart tool (Excel, Tableau, etc.)
- No frontend rendering needed

**Example:**
```sql
UPDATE public.cases
SET analysis_chart = jsonb_build_object(
  'type', 'image',
  'url', 'https://your-cdn.com/charts/case-chart.png',
  'alt', 'Chart description'
)
WHERE id = 'your-case-id';
```

### Option 3: Supabase Storage (Recommended for Images)
Upload chart images to Supabase Storage and reference them.

**Steps:**
1. **Create a Storage Bucket:**
   ```sql
   -- In Supabase Dashboard → Storage → Create bucket
   -- Bucket name: "case-charts"
   -- Public: Yes (or set up RLS policies)
   ```

2. **Upload your chart image** via Supabase Dashboard or CLI

3. **Reference it in the database:**
   ```sql
   UPDATE public.cases
   SET analysis_chart = jsonb_build_object(
     'type', 'storage',
     'bucket', 'case-charts',
     'path', 'air-panama/revenue-chart.png',
     'alt', 'Revenue per Flight Comparison'
   )
   WHERE id = 'your-case-id';
   ```

4. **Frontend will construct the URL:**
   ```typescript
   const { data } = supabase.storage
     .from('case-charts')
     .getPublicUrl('air-panama/revenue-chart.png')
   ```

---

## Examples

### Example 1: Simple Bar Chart (Recharts)
```sql
UPDATE public.cases
SET analysis_chart = jsonb_build_object(
  'type', 'chart',
  'library', 'recharts',
  'chartType', 'bar',
  'title', 'Revenue per Flight',
  'config', jsonb_build_object(
    'data', jsonb_build_array(
      jsonb_build_object('route', 'Mango', 'revenue', 60000),
      jsonb_build_object('route', 'NYC', 'revenue', 112000)
    ),
    'xAxis', jsonb_build_object('dataKey', 'route'),
    'yAxis', jsonb_build_object('label', 'Revenue ($)'),
    'bars', jsonb_build_array(
      jsonb_build_object('dataKey', 'revenue', 'fill', '#2196F3')
    )
  )
)
WHERE title = 'Air Panama Revenue Growth';
```

### Example 2: Line Chart with Multiple Series
```sql
UPDATE public.cases
SET analysis_chart = jsonb_build_object(
  'type', 'chart',
  'library', 'recharts',
  'chartType', 'line',
  'title', 'Revenue Trends Over Time',
  'config', jsonb_build_object(
    'data', jsonb_build_array(
      jsonb_build_object('month', 'Jan', 'revenue', 50000, 'costs', 40000),
      jsonb_build_object('month', 'Feb', 'revenue', 55000, 'costs', 42000),
      jsonb_build_object('month', 'Mar', 'revenue', 60000, 'costs', 43000)
    ),
    'xAxis', jsonb_build_object('dataKey', 'month'),
    'yAxis', jsonb_build_object('label', 'Amount ($)'),
    'lines', jsonb_build_array(
      jsonb_build_object('dataKey', 'revenue', 'stroke', '#2196F3', 'name', 'Revenue'),
      jsonb_build_object('dataKey', 'costs', 'stroke', '#EF4444', 'name', 'Costs')
    )
  )
)
WHERE title = 'Your Case Title';
```

### Example 3: Pie Chart
```sql
UPDATE public.cases
SET analysis_chart = jsonb_build_object(
  'type', 'chart',
  'library', 'recharts',
  'chartType', 'pie',
  'title', 'Market Share Distribution',
  'config', jsonb_build_object(
    'data', jsonb_build_array(
      jsonb_build_object('name', 'Company A', 'value', 45),
      jsonb_build_object('name', 'Company B', 'value', 30),
      jsonb_build_object('name', 'Others', 'value', 25)
    ),
    'colors', jsonb_build_array('#2196F3', '#F59E0B', '#10B981')
  )
)
WHERE title = 'Your Case Title';
```

### Example 4: Static Image
```sql
UPDATE public.cases
SET analysis_chart = jsonb_build_object(
  'type', 'image',
  'url', 'https://example.com/revenue-breakdown.png',
  'alt', 'Revenue Breakdown by Region',
  'width', 800,
  'height', 500
)
WHERE title = 'Your Case Title';
```

---

## Frontend Integration

### TypeScript Type Definition
Add to your types file:

```typescript
// types/cases.ts
export type AnalysisChart =
  | { type: 'chart'; library: string; chartType: string; title: string; config: any }
  | { type: 'image'; url: string; alt: string; width?: number; height?: number }
  | { type: 'storage'; bucket: string; path: string; alt: string }
  | { type: 'multi'; charts: AnalysisChart[] }
  | null

export interface ClientCase {
  // ... existing fields
  analysis_chart?: AnalysisChart
}
```

### React Component Example (Recharts)
```tsx
import { BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from 'recharts'

interface ChartDisplayProps {
  chart: AnalysisChart
}

export function ChartDisplay({ chart }: ChartDisplayProps) {
  if (!chart) return null

  // Handle image type
  if (chart.type === 'image') {
    return (
      <img
        src={chart.url}
        alt={chart.alt}
        className="max-w-full h-auto"
      />
    )
  }

  // Handle storage type
  if (chart.type === 'storage') {
    const { data } = supabase.storage
      .from(chart.bucket)
      .getPublicUrl(chart.path)

    return (
      <img
        src={data.publicUrl}
        alt={chart.alt}
        className="max-w-full h-auto"
      />
    )
  }

  // Handle chart type
  if (chart.type === 'chart' && chart.library === 'recharts') {
    const { config } = chart

    if (chart.chartType === 'bar') {
      return (
        <div className="w-full">
          <h3 className="text-lg font-semibold mb-4">{chart.title}</h3>
          <BarChart width={600} height={400} data={config.data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey={config.xAxis.dataKey} />
            <YAxis />
            <Tooltip />
            {config.bars.map((bar: any, i: number) => (
              <Bar key={i} dataKey={bar.dataKey} fill={bar.fill} />
            ))}
          </BarChart>
        </div>
      )
    }
  }

  return null
}
```

---

## Querying Charts

### Get all cases with charts
```sql
SELECT
  id,
  title,
  difficulty_level,
  analysis_chart->>'type' as chart_type,
  analysis_chart->>'title' as chart_title
FROM public.cases
WHERE analysis_chart IS NOT NULL;
```

### Get specific chart data
```sql
SELECT
  analysis_chart
FROM public.cases
WHERE id = 'your-case-id';
```

### Remove a chart
```sql
UPDATE public.cases
SET analysis_chart = NULL
WHERE id = 'your-case-id';
```

---

## Best Practices

1. **Keep chart data reasonable**: Don't store massive datasets in the database. For large data, use aggregated summaries.

2. **Use consistent formats**: Stick to one charting library across your app for consistency.

3. **Add alt text**: Always provide descriptive alt text for accessibility.

4. **Validate JSON**: Test your chart config in the frontend before committing to the database.

5. **Version your schemas**: If you update the chart config structure, consider adding a `version` field.

6. **Cache images**: If using external URLs, consider CDN caching for performance.

---

## Troubleshooting

### Chart not displaying?
1. Check the database: `SELECT analysis_chart FROM cases WHERE id = 'your-case-id'`
2. Verify JSON structure is valid
3. Check frontend console for errors
4. Ensure chart section is 'analysis' (not 'framework' or 'synthesis')

### Storage image 404?
1. Verify bucket exists and is public
2. Check file path spelling
3. Test URL directly: `https://your-project.supabase.co/storage/v1/object/public/bucket-name/file-path.png`

---

## Need Help?

If you encounter issues:
1. Check the Supabase logs in Dashboard → Logs
2. Verify your RLS policies allow reading cases
3. Test queries directly in SQL Editor
