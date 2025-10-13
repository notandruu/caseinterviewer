-- Seed Data: Production Air Panama Case with Full Section Structure
-- This seed provides a complete example case with structured sections, rubrics, and ground truth

INSERT INTO public.cases (
  title,
  firm,
  industry,
  difficulty_level,
  version,
  language,
  summary,
  expected_framework,
  expected_answer_summary,
  key_insights,
  data_json,
  ground_truth,
  sections,
  evaluation_rubric,
  published,
  disclosure_rules
) VALUES (
  'Air Panama Revenue Growth',
  'McKinsey',
  'Aviation',
  3,
  1,
  'en',
  'Help Air Panama, the second-largest airline in Latin America, grow revenue amid increased competition from low-cost carriers.',
  'Profitability → Revenue → Volume/Pricing → Network Optimization → Customer Segments',
  'Recommend shifting capacity from underutilized Mango route to high-yield NYC route. This improves revenue by $52K per flight ($112K NYC vs $60K Mango). Additionally, explore partnership opportunities in Brazil to capture growing South American market without heavy capital investment.',
  jsonb_build_array(
    'Utilization gap drives profit variance: NYC at 80% vs Mango at 60%',
    'High fixed costs favor fuller aircraft on premium routes',
    'Price elasticity differs by market: North America less elastic than Latin America',
    'Network optimization should consider fleet constraints and slot availability',
    'Partnerships can unlock growth without capital expenditure'
  ),
  -- Case data (what's available throughout the case)
  jsonb_build_object(
    'aircraft', jsonb_build_object(
      'capacity', 200,
      'operating_cost_per_flight', 40000,
      'fleet_size', 25,
      'utilization_target', 0.75
    ),
    'routes', jsonb_build_object(
      'mango', jsonb_build_object(
        'current_flights_per_day', 2,
        'utilization', 0.6,
        'ticket_price', 500,
        'market_size_pax_per_day', 500
      ),
      'nyc', jsonb_build_object(
        'current_flights_per_day', 0,
        'proposed_flights_per_day', 3,
        'utilization', 0.8,
        'ticket_price', 700,
        'market_size_pax_per_day', 1000
      )
    ),
    'competitors', jsonb_build_object(
      'low_cost_carriers', jsonb_build_array(
        jsonb_build_object('name', 'LatAmAir', 'market_share', 0.25),
        jsonb_build_object('name', 'SouthJet', 'market_share', 0.15)
      )
    )
  ),
  -- Ground truth for scoring
  jsonb_build_object(
    'calculations', jsonb_build_object(
      'mango_revenue_per_flight', 60000,
      'nyc_revenue_per_flight', 112000,
      'revenue_delta_per_flight', 52000,
      'net_daily_revenue_improvement', 44000
    ),
    'framework_components', jsonb_build_array(
      'Revenue',
      'Costs',
      'Volume',
      'Price',
      'Market segmentation'
    )
  ),
  -- Sections with goals, prompts, hints, and rubrics
  jsonb_build_array(
    -- SECTION 1: Introduction
    jsonb_build_object(
      'name', 'introduction',
      'goal', 'Present case context and allow candidate to ask clarifying questions',
      'prompt', 'Your client is Air Panama, the second-largest airline in Latin America. They''ve been losing market share to low-cost carriers over the past 3 years. Revenue has declined 8% year-over-year, and the CEO has asked for help developing a revenue growth strategy. What would you like to know about the situation?',
      'time_limit_sec', 300,
      'hints', jsonb_build_array(
        jsonb_build_object(
          'tier', 1,
          'text', 'Consider asking about the competitive landscape, customer segments, and current route network.'
        ),
        jsonb_build_object(
          'tier', 2,
          'text', 'It may help to understand what specific routes or markets are underperforming.'
        )
      ),
      'rubric', jsonb_build_object(
        'criteria', jsonb_build_array(
          jsonb_build_object('dimension', 'question_quality', 'weight', 0.4, 'description', 'Asked relevant, structured questions'),
          jsonb_build_object('dimension', 'listening', 'weight', 0.3, 'description', 'Absorbed information and built on it'),
          jsonb_build_object('dimension', 'structure', 'weight', 0.3, 'description', 'Organized inquiry logically')
        ),
        'passing_score', 60
      )
    ),
    -- SECTION 2: Framework
    jsonb_build_object(
      'name', 'framework',
      'goal', 'Develop a structured approach to analyzing the revenue growth opportunity',
      'prompt', 'Now that you understand the situation, please walk me through how you''d approach this revenue growth challenge. What framework would you use?',
      'time_limit_sec', 420,
      'hints', jsonb_build_array(
        jsonb_build_object(
          'tier', 1,
          'text', 'Think about the fundamental drivers of revenue in an airline business.'
        ),
        jsonb_build_object(
          'tier', 2,
          'text', 'Revenue equals volume times price. Consider breaking down both dimensions.'
        ),
        jsonb_build_object(
          'tier', 3,
          'text', 'For airlines specifically, think about routes, aircraft utilization, pricing tiers, and customer segments.'
        )
      ),
      'rubric', jsonb_build_object(
        'criteria', jsonb_build_array(
          jsonb_build_object('dimension', 'structure', 'weight', 0.35, 'description', 'Logical, MECE framework'),
          jsonb_build_object('dimension', 'customization', 'weight', 0.25, 'description', 'Tailored to airline industry'),
          jsonb_build_object('dimension', 'completeness', 'weight', 0.25, 'description', 'Covered key revenue drivers'),
          jsonb_build_object('dimension', 'communication', 'weight', 0.15, 'description', 'Clear and concise delivery')
        ),
        'passing_score', 65
      )
    ),
    -- SECTION 3: Analysis
    jsonb_build_object(
      'name', 'analysis',
      'goal', 'Analyze route reallocation opportunity using quantitative data',
      'prompt', 'Good framework. Now let''s dive into a specific opportunity. The client is considering adding 3 daily flights from Panama City to New York, but they would need to cancel 2 daily flights to Mango, Colombia to free up the aircraft. Here''s the data: Mango flights currently run at 60% capacity with $500 tickets. The NYC route would run at 80% capacity with $700 tickets. Each aircraft holds 200 passengers. What would you recommend?',
      'time_limit_sec', 600,
      'hints', jsonb_build_array(
        jsonb_build_object(
          'tier', 1,
          'text', 'Start by calculating revenue per flight for each route. Remember to use the calculator tool for all arithmetic.'
        ),
        jsonb_build_object(
          'tier', 2,
          'text', 'Revenue per flight = Capacity × Utilization × Ticket Price'
        ),
        jsonb_build_object(
          'tier', 3,
          'text', 'Compare: 2 Mango flights (200 × 0.6 × $500 each) vs 3 NYC flights (200 × 0.8 × $700 each)'
        ),
        jsonb_build_object(
          'tier', 4,
          'text', 'Don''t forget to consider costs, market saturation, and strategic implications beyond just revenue.'
        )
      ),
      'rubric', jsonb_build_object(
        'criteria', jsonb_build_array(
          jsonb_build_object('dimension', 'quantitative', 'weight', 0.40, 'description', 'Accurate calculations using calc_basic'),
          jsonb_build_object('dimension', 'structure', 'weight', 0.20, 'description', 'Systematic approach to analysis'),
          jsonb_build_object('dimension', 'insight', 'weight', 0.25, 'description', 'Identified key drivers and implications'),
          jsonb_build_object('dimension', 'sanity_checks', 'weight', 0.15, 'description', 'Validated results and considered edge cases')
        ),
        'passing_score', 70
      )
    ),
    -- SECTION 4: Synthesis
    jsonb_build_object(
      'name', 'synthesis',
      'goal', 'Synthesize findings into clear recommendation with supporting rationale',
      'prompt', 'Excellent analysis. Now please summarize your final recommendation to the CEO. What should Air Panama do, and why?',
      'time_limit_sec', 360,
      'hints', jsonb_build_array(
        jsonb_build_object(
          'tier', 1,
          'text', 'Structure your recommendation: what to do, why it makes sense, and what risks or next steps to consider.'
        ),
        jsonb_build_object(
          'tier', 2,
          'text', 'Lead with your recommendation, then support with 2-3 key reasons backed by your analysis.'
        )
      ),
      'rubric', jsonb_build_object(
        'criteria', jsonb_build_array(
          jsonb_build_object('dimension', 'clarity', 'weight', 0.30, 'description', 'Clear, concise recommendation'),
          jsonb_build_object('dimension', 'rationale', 'weight', 0.35, 'description', 'Well-supported with analysis'),
          jsonb_build_object('dimension', 'business_judgment', 'weight', 0.20, 'description', 'Considered broader implications'),
          jsonb_build_object('dimension', 'communication', 'weight', 0.15, 'description', 'Executive-ready delivery')
        ),
        'passing_score', 70
      )
    )
  ),
  -- Overall evaluation rubric
  jsonb_build_object(
    'dimensions', jsonb_build_array(
      jsonb_build_object('name', 'Problem Solving', 'weight', 0.30),
      jsonb_build_object('name', 'Quantitative Skills', 'weight', 0.25),
      jsonb_build_object('name', 'Structured Thinking', 'weight', 0.25),
      jsonb_build_object('name', 'Communication', 'weight', 0.20)
    ),
    'passing_threshold', 70
  ),
  true, -- published
  jsonb_build_object(
    'expected_answer_visibility', 'staff_only',
    'hints_policy', 'tiered',
    'ground_truth_exposure', 'never_to_ai'
  )
)
ON CONFLICT (title) DO NOTHING;

-- Add a second example case (optional): Retail Chain Expansion
INSERT INTO public.cases (
  title,
  firm,
  industry,
  difficulty_level,
  version,
  language,
  summary,
  expected_framework,
  expected_answer_summary,
  key_insights,
  data_json,
  ground_truth,
  sections,
  evaluation_rubric,
  published,
  disclosure_rules
) VALUES (
  'RetailCo Store Expansion',
  'Bain',
  'Retail',
  2,
  1,
  'en',
  'RetailCo, a national clothing retailer, is considering opening 50 new stores. Should they proceed?',
  'Profitability → Revenue per store → Costs per store → Break-even analysis → Market saturation',
  'Recommend selective expansion: open stores only in markets with >100K population and <2 competitors. This yields ~30 profitable stores with projected IRR of 18%, vs 12% if opening all 50.',
  jsonb_build_array(
    'Not all locations are created equal: market characteristics drive profitability',
    'Fixed costs make scale important but don''t justify bad locations',
    'Competition density is a leading indicator of market saturation'
  ),
  jsonb_build_object(
    'store_metrics', jsonb_build_object(
      'avg_revenue_per_store', 2000000,
      'fixed_costs_per_store', 500000,
      'variable_cost_pct', 0.65
    ),
    'market_data', jsonb_build_array(
      jsonb_build_object('tier', 'A', 'population', 150000, 'competitors', 1, 'count', 20),
      jsonb_build_object('tier', 'B', 'population', 80000, 'competitors', 2, 'count', 30),
      jsonb_build_object('tier', 'C', 'population', 40000, 'competitors', 3, 'count', 50)
    )
  ),
  jsonb_build_object(
    'calculations', jsonb_build_object(
      'profit_per_store_tier_A', 200000,
      'profit_per_store_tier_B', -50000,
      'profit_per_store_tier_C', -150000,
      'recommended_expansion_count', 30
    )
  ),
  jsonb_build_array(
    jsonb_build_object(
      'name', 'introduction',
      'goal', 'Understand the expansion opportunity and ask clarifying questions',
      'prompt', 'Your client, RetailCo, is a national clothing retailer with 200 stores. They''re considering an aggressive expansion: opening 50 new stores over the next 2 years. Should they do it?',
      'time_limit_sec', 240,
      'hints', jsonb_build_array(
        jsonb_build_object('tier', 1, 'text', 'Ask about store economics, market characteristics, and competitive dynamics.')
      ),
      'rubric', jsonb_build_object('passing_score', 60)
    ),
    jsonb_build_object(
      'name', 'framework',
      'goal', 'Structure the problem',
      'prompt', 'Walk me through your approach to this expansion decision.',
      'time_limit_sec', 300,
      'hints', jsonb_build_array(
        jsonb_build_object('tier', 1, 'text', 'Think profitability: revenue per store vs costs per store.')
      ),
      'rubric', jsonb_build_object('passing_score', 65)
    ),
    jsonb_build_object(
      'name', 'analysis',
      'goal', 'Analyze store-level economics across market tiers',
      'prompt', 'Each store generates $2M in revenue. Fixed costs are $500K per store, and variable costs are 65% of revenue. But not all markets are equal. Here''s the breakdown of 50 potential locations: 20 Tier-A markets (150K pop, 1 competitor), 30 Tier-B markets (80K pop, 2 competitors), 50 Tier-C markets (40K pop, 3+ competitors). Revenue drops 30% in Tier-B and 60% in Tier-C. Should they open all 50 stores?',
      'time_limit_sec', 600,
      'hints', jsonb_build_array(
        jsonb_build_object('tier', 1, 'text', 'Calculate profit per store for each tier using the calc_basic tool.'),
        jsonb_build_object('tier', 2, 'text', 'Profit = Revenue - Fixed Costs - Variable Costs')
      ),
      'rubric', jsonb_build_object('passing_score', 70)
    ),
    jsonb_build_object(
      'name', 'synthesis',
      'goal', 'Make recommendation with clear rationale',
      'prompt', 'What''s your recommendation to RetailCo''s CEO?',
      'time_limit_sec', 300,
      'hints', jsonb_build_array(
        jsonb_build_object('tier', 1, 'text', 'Recommend selective expansion based on profitability by tier.')
      ),
      'rubric', jsonb_build_object('passing_score', 70)
    )
  ),
  jsonb_build_object(
    'dimensions', jsonb_build_array(
      jsonb_build_object('name', 'Problem Solving', 'weight', 0.30),
      jsonb_build_object('name', 'Quantitative Skills', 'weight', 0.30),
      jsonb_build_object('name', 'Business Judgment', 'weight', 0.40)
    ),
    'passing_threshold', 70
  ),
  true,
  jsonb_build_object(
    'expected_answer_visibility', 'staff_only',
    'hints_policy', 'tiered',
    'ground_truth_exposure', 'never_to_ai'
  )
)
ON CONFLICT (title) DO NOTHING;
