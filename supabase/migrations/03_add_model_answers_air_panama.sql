-- Add model answers to Air Panama case for AI feedback generation
-- This enhances the ground_truth with ideal responses for each section

UPDATE cases
SET ground_truth = jsonb_set(
  COALESCE(ground_truth, '{}'::jsonb),
  '{model_answers}',
  '{
    "framework": {
      "description": "Profitability framework breaking down revenue and costs",
      "key_elements": [
        "Revenue streams (ticket sales, ancillary revenue)",
        "Cost structure (fixed costs: aircraft, staff; variable costs: fuel, maintenance)",
        "Market factors (demand, competition, pricing power)",
        "Operational efficiency (load factor, route optimization)"
      ],
      "sample_structure": "I would approach this using a profitability framework. First, I will look at the revenue side by analyzing ticket pricing, passenger volume, and ancillary revenues like baggage fees. Then I will examine the cost structure, breaking it into fixed costs like aircraft leasing and staff salaries, and variable costs like fuel and maintenance. Finally, I will consider market dynamics such as competition from other airlines and customer demand trends."
    },
    "analysis": {
      "description": "Quantitative analysis of per-flight profitability",
      "key_insights": [
        "Load factor (90%) is strong, indicating good demand",
        "Revenue per passenger ($150) vs cost per passenger ($120)",
        "Break-even analysis shows profitability threshold",
        "Cost optimization opportunities exist in fuel efficiency"
      ],
      "quantitative_approach": "Calculate revenue per flight (90 passengers × $150 = $13,500), then calculate cost per flight (fixed $5,000 + variable $120 × 90 = $15,800), yielding a loss of $2,300 per flight",
      "sample_reasoning": "Looking at the numbers, we have 90% load factor with 100 seats, meaning 90 passengers per flight. At $150 per ticket, that generates $13,500 in revenue. On the cost side, fixed costs are $5,000 per flight plus variable costs of $120 per passenger, totaling $15,800. This shows we are losing $2,300 per flight. The key issue is that our break-even point would require either higher ticket prices, lower costs, or higher load factors above 90%."
    },
    "synthesis": {
      "description": "Recommendation to improve profitability",
      "recommended_structure": "Restate the problem, provide clear recommendation with rationale, outline implementation steps, acknowledge risks",
      "key_points": [
        "Primary recommendation: Increase ticket prices by 18% to $177",
        "Secondary recommendation: Reduce variable costs through fuel efficiency",
        "Implementation: Gradual price increase testing market elasticity",
        "Risk mitigation: Monitor competitor pricing and customer retention"
      ],
      "sample_recommendation": "Based on my analysis, Air Panama should increase ticket prices to reach profitability. Specifically, to break even, we need revenue of $15,800 per flight. With 90 passengers, this requires a ticket price of approximately $177, which is an 18% increase from current $150. However, I recommend implementing this gradually - start with a 10% increase to $165 and monitor demand elasticity. Additionally, we should pursue cost reduction opportunities, particularly in fuel efficiency which could save $10-15 per passenger. The risk is that price increases may reduce load factor, so we need to carefully monitor booking rates and be prepared to adjust pricing dynamically based on route performance."
    }
  }'::jsonb,
  true
)
WHERE title = 'Air Panama';

-- Add common mistakes to watch for
UPDATE cases
SET ground_truth = jsonb_set(
  ground_truth,
  '{common_mistakes}',
  '{
    "framework": [
      "Forgetting to mention both revenue AND cost sides",
      "Not structuring the framework before diving into numbers",
      "Overlooking market/competitive factors",
      "Being too vague - not listing specific revenue streams or cost categories"
    ],
    "analysis": [
      "Making calculation errors (especially variable vs fixed costs)",
      "Not clearly stating assumptions",
      "Failing to calculate break-even point",
      "Not identifying the key driver of unprofitability",
      "Jumping to conclusions without showing work"
    ],
    "synthesis": [
      "Providing recommendation without supporting rationale",
      "Not quantifying the impact of recommendations",
      "Ignoring implementation challenges or risks",
      "Recommendation is not actionable or specific",
      "Failing to prioritize multiple recommendations"
    ]
  }'::jsonb,
  true
)
WHERE title = 'Air Panama';

-- Verify the update
SELECT
  title,
  ground_truth->'model_answers' as model_answers,
  ground_truth->'common_mistakes' as common_mistakes
FROM cases
WHERE title = 'Air Panama';
