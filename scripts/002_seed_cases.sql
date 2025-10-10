-- Seed sample cases for the simulator
INSERT INTO public.cases (title, description, industry, difficulty, case_type, estimated_duration, prompt, key_concepts) VALUES
(
  'Coffee Chain Expansion',
  'A national coffee chain is considering expanding into a new city. Should they proceed?',
  'Retail',
  'beginner',
  'market-entry',
  30,
  'Our client is a successful coffee chain with 200 locations across the country. They are considering opening their first location in Portland, Oregon. The CEO wants to know if this is a good opportunity and what factors they should consider.',
  ARRAY['market analysis', 'competitive landscape', 'customer segmentation', 'financial projections']
),
(
  'Tech Startup Profitability',
  'A SaaS company is struggling with profitability despite strong revenue growth.',
  'Technology',
  'intermediate',
  'profitability',
  35,
  'Our client is a B2B SaaS company that provides project management software. They have grown revenue by 150% year-over-year but are still not profitable. The board is concerned and wants to understand what is driving the losses and how to become profitable.',
  ARRAY['cost structure', 'revenue analysis', 'unit economics', 'operational efficiency']
),
(
  'Airline Market Sizing',
  'Estimate the size of the business travel market for domestic flights in the US.',
  'Transportation',
  'beginner',
  'market-sizing',
  25,
  'Our client is a major airline considering launching a premium business travel service. Before investing, they want to understand the size of the domestic business travel market in the United States. Can you estimate the annual market size?',
  ARRAY['market sizing', 'segmentation', 'assumptions', 'sanity checks']
),
(
  'Pharmaceutical Pricing Strategy',
  'A pharmaceutical company needs to price a new breakthrough drug.',
  'Healthcare',
  'advanced',
  'pricing',
  40,
  'Our client has developed a breakthrough treatment for a rare disease that currently has no cure. They need to determine the optimal pricing strategy for this drug. What factors should they consider and what price would you recommend?',
  ARRAY['value-based pricing', 'competitive analysis', 'regulatory considerations', 'stakeholder analysis']
),
(
  'E-commerce Growth Strategy',
  'An online retailer wants to double revenue in the next two years.',
  'E-commerce',
  'intermediate',
  'growth-strategy',
  35,
  'Our client is a mid-sized e-commerce company selling home goods online. They currently generate $50M in annual revenue and want to double that to $100M within two years. What strategies would you recommend to achieve this growth target?',
  ARRAY['growth levers', 'customer acquisition', 'retention strategies', 'market expansion']
),
(
  'Manufacturing Operations Improvement',
  'A manufacturing plant is experiencing quality issues and delays.',
  'Manufacturing',
  'advanced',
  'operations',
  40,
  'Our client operates a manufacturing facility that produces automotive parts. Over the past six months, they have seen an increase in defect rates from 2% to 8% and delivery delays have doubled. The plant manager needs help identifying the root causes and implementing solutions.',
  ARRAY['process analysis', 'root cause analysis', 'quality control', 'supply chain management']
);
