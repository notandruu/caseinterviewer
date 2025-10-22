-- ============================================================================
-- Seed: Artificial Turf Case (Complete with All Content)
-- ============================================================================
-- Based on the full case content provided
-- Case Type: Market Sizing | Difficulty: Beginner | Firm: Bain
-- ============================================================================

BEGIN;

-- Clear existing cases
TRUNCATE TABLE public.cases RESTART IDENTITY CASCADE;

-- Insert Artificial Turf case
INSERT INTO public.cases (
  id,
  title,
  case_type,
  objective,
  firm,
  industry,
  difficulty_level,
  vars,
  sections,
  lines,
  exhibits,
  ground_truth,
  published
)
VALUES (
  gen_random_uuid(),
  'Artificial Turf',
  'Market Sizing',
  'Estimate the market size for artificial turf in the United States',
  'Bain',
  'Manufacturing',
  1, -- Beginner level

  -- Variables (passed in CaseCard each turn)
  jsonb_build_object(
    'us_population_millions', 300,
    'pct_population_age_18', 0.01,
    'high_school_attendance_rate', 0.80,
    'avg_students_per_high_school', 250,
    'college_attendance_rate', 0.25,
    'avg_students_per_college', 400,
    'community_college_rate', 0.10,
    'avg_students_per_cc', 200,
    'field_yards_length', 120,
    'field_yards_width', 60,
    'turf_adoption_rate', 0.50,
    'turf_lifetime_years', 10,
    'price_per_sqft_usd', 10
  ),

  -- Sections (turn-based flow)
  jsonb_build_array(
    jsonb_build_object(
      'key', 'opening',
      'name', 'Case Opening',
      'goal', 'Introduce case and get initial structure',
      'lines', jsonb_build_array('l_1', 'l_2')
    ),
    jsonb_build_object(
      'key', 'math_schools',
      'name', 'Math: Number of Schools',
      'goal', 'Estimate number of high schools and colleges in US',
      'lines', jsonb_build_array('l_3')
    ),
    jsonb_build_object(
      'key', 'math_market_value',
      'name', 'Math: Market Value',
      'goal', 'Calculate total market size for turf in schools',
      'lines', jsonb_build_array('l_4')
    ),
    jsonb_build_object(
      'key', 'synthesis',
      'name', 'Final Recommendation',
      'goal', 'Provide structured recommendation to client',
      'lines', jsonb_build_array('l_5')
    )
  ),

  -- Line definitions (LineCards)
  jsonb_build_object(
    'l_1', jsonb_build_object(
      'speaker', 'interviewer',
      'text', 'Our client would like us to estimate the market for artificial turf. How would you approach this question and start the process of resolving it?',
      'expects_response', true,
      'response_type', 'framework',
      'evaluation_focus', jsonb_build_array('structure', 'clarifying_questions', 'segmentation'),
      'next_preview', jsonb_build_array('Let''s focus on the high school segment first.'),
      'hints', jsonb_build_array(
        jsonb_build_object(
          'tier', 1,
          'text', 'Think about different end-user segments. Who might use artificial turf?'
        ),
        jsonb_build_object(
          'tier', 2,
          'text', 'Consider: Residential (home lawns), Commercial & Municipal (schools, parks), and different use cases like Sports vs. Landscaping.'
        ),
        jsonb_build_object(
          'tier', 3,
          'text', 'A strong framework would segment by: (1) End-User Type (Residential, Commercial, Municipal), (2) Use Case (Sports, Landscaping), then estimate surface area × price per sq ft.'
        )
      )
    ),

    'l_2', jsonb_build_object(
      'speaker', 'interviewer',
      'text', 'Good start. Let''s focus on the high school segment to begin with.',
      'expects_response', false,
      'response_type', null,
      'evaluation_focus', jsonb_build_array(),
      'next_preview', jsonb_build_array('Can you estimate the number of schools in the U.S.?')
    ),

    'l_3', jsonb_build_object(
      'speaker', 'interviewer',
      'text', 'Can you estimate the number of schools in the U.S. where artificial turf might be used? Walk me through your calculation.',
      'expects_response', true,
      'response_type', 'estimate',
      'evaluation_focus', jsonb_build_array('structure', 'quantitative', 'units', 'sanity_check'),
      'next_preview', jsonb_build_array('Now let''s calculate the market value.'),
      'hints', jsonb_build_array(
        jsonb_build_object(
          'tier', 1,
          'text', 'If you''re stuck, talk through your thoughts. Start with the US population and work your way down.'
        ),
        jsonb_build_object(
          'tier', 2,
          'text', 'Break it into: (1) High schools, (2) 4-year colleges, (3) Community colleges. For each, estimate: population → age group → attendance rate → avg school size.'
        ),
        jsonb_build_object(
          'tier', 3,
          'text', 'Example: US pop = 300M, 1% are age 18 = 3M, 80% attend high school = 2.4M students, avg 250 students/school = ~10,000 high schools.'
        )
      )
    ),

    'l_4', jsonb_build_object(
      'speaker', 'interviewer',
      'text', 'Great. Now let''s take a look at the value of turf required by the school segment. Walk me through the calculation.',
      'expects_response', true,
      'response_type', 'calculation',
      'evaluation_focus', jsonb_build_array('quantitative', 'units', 'assumptions', 'sanity_check'),
      'next_preview', jsonb_build_array('Finally, let''s wrap up with a recommendation.'),
      'hints', jsonb_build_array(
        jsonb_build_object(
          'tier', 1,
          'text', 'Think about: field size, adoption rate, replacement cycle, and price per sq ft.'
        ),
        jsonb_build_object(
          'tier', 2,
          'text', 'You''ll need: (1) Sq ft per field (convert yards to feet), (2) % of schools with turf, (3) Turf lifetime, (4) Price/sq ft.'
        ),
        jsonb_build_object(
          'tier', 3,
          'text', 'Field = 120yd × 60yd = 360ft × 180ft = 64,800 sq ft. If 50% adopt, 10yr lifetime, $10/sq ft → calculate annual market size.'
        )
      )
    ),

    'l_5', jsonb_build_object(
      'speaker', 'interviewer',
      'text', 'Our client has asked for a formal recommendation. What would you like to say to them?',
      'expects_response', true,
      'response_type', 'synthesis',
      'evaluation_focus', jsonb_build_array('structure', 'insight', 'communication', 'next_steps'),
      'next_preview', jsonb_build_array(),
      'hints', jsonb_build_array(
        jsonb_build_object(
          'tier', 1,
          'text', 'Structure your recommendation: Recap the goal, provide your finding, address risks, and suggest next steps.'
        ),
        jsonb_build_object(
          'tier', 2,
          'text', 'Include: (1) Recap of objective, (2) Market size estimate with assumptions, (3) Key risks/uncertainties, (4) Actionable next steps.'
        )
      )
    )
  ),

  -- Exhibits (slides, charts, data)
  jsonb_build_array(
    jsonb_build_object(
      'id', 'ex_1',
      'label', 'Case Creative - Expert Example',
      'type', 'reference',
      'content', jsonb_build_object(
        'title', 'End-User Segments',
        'segments', jsonb_build_array(
          'Residential (e.g., home lawns, gardens, rooftops)',
          'Commercial & Municipal (e.g., offices, schools, parks, medians)'
        ),
        'use_cases', jsonb_build_array(
          'Landscaping (non-sports applications)',
          'Sports & Recreation (e.g., football, soccer, golf, playgrounds)'
        ),
        'estimation_drivers', jsonb_build_array(
          'Surface area installed per use case',
          'Price per square foot (installed or sold)'
        )
      ),
      'caption', 'Expert framework example - not the only right answer'
    )
  ),

  -- Ground truth (NEVER exposed to AI)
  jsonb_build_object(
    'calculations', jsonb_build_object(
      -- Number of schools
      'us_population', 300000000,
      'high_school_age_population', 3000000,
      'high_school_students', 2400000,
      'num_high_schools', 9600,
      'college_age_population', 3000000,
      'four_year_college_students', 750000,
      'num_four_year_colleges', 1875,
      'community_college_students', 300000,
      'num_community_colleges', 1500,
      'total_schools', 13000,

      -- Market value
      'field_sqft', 64800,
      'annual_sqft_per_school', 3240,
      'market_size_usd', 420000000
    ),

    'model_answers', jsonb_build_object(
      'framework', jsonb_build_object(
        'description', 'Expert segmentation approach',
        'segments', jsonb_build_array(
          'End-User Segments: Residential, Commercial & Municipal',
          'Use Cases: Landscaping, Sports & Recreation',
          'Estimation Drivers: Surface area × Price/sq ft'
        )
      ),

      'math_schools', jsonb_build_object(
        'description', 'Structured bottom-up calculation',
        'approach', 'High Schools: US pop (300M) → 1% age 18 (3M) → 80% attend (2.4M) → ÷250 students/school = 9,600 schools. Four-Year Colleges: 3M age 19 → 25% attend (750K) → ÷400 students = 1,875 colleges. Community Colleges: 3M → 10% attend (300K) → ÷200 students = 1,500 colleges. Total = 13,000 schools.',
        'result', 13000,
        'units', 'schools'
      ),

      'math_market_value', jsonb_build_object(
        'description', 'Field size × adoption × replacement cycle × price',
        'assumptions', jsonb_build_array(
          'Athletic field = 120yd × 60yd = 64,800 sq ft',
          'Adoption rate = 50%',
          'Lifetime = 10 years',
          'Price = $10/sq ft'
        ),
        'approach', 'Annual sq ft/school = (64,800 × 50%) ÷ 10 = 3,240 sq ft. Market size = 13,000 schools × 3,240 sq ft × $10 = $420M.',
        'result', 420000000,
        'units', 'USD'
      ),

      'synthesis', jsonb_build_object(
        'structure', jsonb_build_array(
          'Recap: Goal was to estimate market size for artificial turf in US',
          'Finding: School market = $420M. Additional sports fields (+20%) = $84M. Airports/business (+5%) = $21M. Total ≈ $525M.',
          'Risks: Assumption of 1 field/school may be low; many have 6-10 fields. Turf coverage <50% on multi-field campuses.',
          'Next Steps: (1) Research avg fields per school, (2) Refine turf coverage estimates, (3) Size non-school segments'
        ),
        'recommended_answer', 'Based on our analysis, the total market size for artificial turf in the US is approximately $525M, with schools representing $420M of that. However, there is significant uncertainty around the number of fields per school. I recommend we: (1) Research the average number of sports fields per school to refine our estimate, (2) Validate turf coverage assumptions across multi-field campuses, and (3) Size the non-school segments more rigorously including airports, commercial, and municipal applications.'
      )
    ),

    'scoring_rubric', jsonb_build_object(
      'framework', jsonb_build_object(
        'structure', 'Clear segmentation (user types, use cases)',
        'clarifying_questions', 'Asked about scope, geography, timeline',
        'weight', 20
      ),
      'quantitative', jsonb_build_object(
        'accuracy', 'Within 20% of model answer',
        'methodology', 'Structured, top-down or bottom-up approach',
        'units', 'Correct units throughout (students, schools, sq ft, USD)',
        'weight', 40
      ),
      'communication', jsonb_build_object(
        'clarity', 'Walked through logic step-by-step',
        'sanity_checks', 'Verified reasonableness of estimates',
        'weight', 20
      ),
      'synthesis', jsonb_build_object(
        'structure', 'Recap, Finding, Risks, Next Steps',
        'insight', 'Identified key uncertainties and actionable next steps',
        'weight', 20
      )
    )
  ),

  true -- published
);

COMMIT;
