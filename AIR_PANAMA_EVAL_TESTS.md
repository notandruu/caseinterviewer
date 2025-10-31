# Air Panama Case - Evaluation Tests & Rubric

## Case Overview
**Client**: Air Panama (2nd largest airline in Latin America)
**Problem**: Losing market share to low-cost carriers
**Objective**: Develop revenue growth strategy
**Key Decision**: Add 3 NYC flights vs. keep 2 Mango flights (must cancel Mango to free up aircraft)

## Case Data
- Aircraft capacity: 200 seats
- Mango utilization: 60% (120 passengers)
- NYC utilization: 80% (160 passengers)
- Mango ticket price: $500
- NYC ticket price: $700

---

## Section 1: Framework (Introduction)

### Evaluation Criteria
**NOT SCORED** - This section is only for setup and initial structuring

### What to Listen For
- Asks clarifying questions about the business
- Demonstrates business intuition
- Shows structured thinking approach

### Red Flags
- Jumps to solutions without understanding the problem
- Doesn't ask about competition or market dynamics
- Misunderstands the airline business model

---

## Section 2: Framework Development

### Evaluation Criteria
1. **Framework Quality** (40% weight)
2. **Communication** (30% weight)
3. **Business Insight** (30% weight)

### Expected Framework Components
A strong framework should include most of these:
- ✅ Revenue drivers (Volume × Price)
- ✅ Cost structure (Fixed vs. Variable)
- ✅ Network optimization / Route analysis
- ✅ Competitive positioning
- ✅ Customer segmentation
- ✅ Utilization / Load factors

### Ideal Framework Structure
```
Revenue Growth Framework:
├── Revenue Side
│   ├── Volume (Passengers)
│   │   ├── Load factor / Utilization
│   │   ├── Flight frequency
│   │   └── Route network
│   └── Price (Ticket price)
│       ├── Price elasticity by market
│       ├── Competitive pricing
│       └── Yield management
├── Cost Side
│   ├── Fixed costs (Aircraft, crew)
│   └── Variable costs (Fuel, airport fees)
└── Strategic Considerations
    ├── Competitive dynamics
    ├── Market attractiveness
    └── Operational constraints
```

### Test Cases

#### ✅ EXCELLENT Response (90-100)
```
"I'd like to structure this around revenue optimization for airlines:

First, Revenue = Flights × Passengers per flight × Ticket price
- Volume: Load factors, flight frequency, route network
- Pricing: Yield management, market willingness-to-pay

Second, Profitability considerations
- Fixed costs: Aircraft, crew (don't change with utilization)
- Variable costs: Fuel, landing fees
- High fixed costs mean utilization is critical

Third, Strategic factors
- Competitive dynamics with low-cost carriers
- Market attractiveness (business vs. leisure routes)
- Operational constraints (aircraft availability, slots)

I'd start by analyzing current routes by profitability and growth potential."
```

**Why Excellent**:
- Structured hierarchy (First, Second, Third)
- Mentions key formula (Revenue = Flights × Passengers × Price)
- Identifies fixed/variable cost distinction (critical for airlines)
- Links to business problem (low-cost competition)
- Clear next steps

#### ⚠️ ACCEPTABLE Response (70-85)
```
"I'd break this into revenue drivers and costs.

Revenue side:
- Number of flights
- How full the planes are
- Ticket prices

Cost side:
- Operating costs
- Competition from low-cost carriers

Then look at different routes and see which ones are most profitable."
```

**Why Acceptable**:
- Has basic structure
- Covers key drivers
- Missing depth on fixed/variable costs
- Lacks framework for evaluation (how to compare routes?)

#### ❌ WEAK Response (Below 70)
```
"We should look at increasing prices and adding more flights. Maybe do some marketing to get more customers. Also cut costs where we can."
```

**Why Weak**:
- No framework structure
- Lists random ideas vs. structured approach
- Doesn't show airline-specific understanding
- Would lead to unfocused analysis

---

## Section 3: Quantitative Analysis

### Prompt
"The client is considering adding 3 daily flights to NYC but must cancel 2 flights to Mango to free up aircraft. Current data shows: Mango flights run at 60% capacity with $500 tickets, while NYC flights run at 80% capacity with $700 tickets. Each aircraft has 200 seats. What would you recommend?"

### Ground Truth Calculations

#### Required Calculations
| Metric | Formula | Expected Value |
|--------|---------|----------------|
| Mango revenue per flight | 200 × 0.60 × $500 | $60,000 |
| NYC revenue per flight | 200 × 0.80 × $700 | $112,000 |
| Mango daily revenue (2 flights) | 2 × $60,000 | $120,000 |
| NYC daily revenue (3 flights) | 3 × $112,000 | $336,000 |
| Net daily revenue change | $336,000 - $120,000 | +$216,000 |
| Annual impact | $216,000 × 365 | ~$78.8M |

### Evaluation Rubric

#### Quantitative Accuracy (40% weight)
- **100**: All calculations correct (within 5% tolerance)
- **75**: Core calculations correct (revenue per flight), may miss annual
- **50**: Methodology correct but arithmetic errors
- **25**: Major calculation errors or wrong approach
- **0**: No calculations attempted

#### Insight Quality (30% weight)
Expected insights (should mention 2-3):
- ✅ Higher utilization makes NYC more profitable per flight
- ✅ Higher ticket price in NYC compounds the advantage
- ✅ Fixed costs favor fuller aircraft (mentioned cost structure)
- ✅ NYC market has lower price elasticity (business travelers)
- ✅ Revenue increase is substantial (~65M+ annually)

#### Sanity Checks (15% weight)
- ✅ Profit/Revenue calculations consistent (profit = revenue - cost)
- ✅ No negative numbers where unexpected
- ✅ Percentages used correctly
- ✅ Annual vs. daily calculations clearly distinguished

#### Communication (15% weight)
- Clear structure in presenting numbers
- Shows work / explains methodology
- Appropriate precision (doesn't over-specify)
- Links numbers to business recommendation

### Test Cases

#### ✅ EXCELLENT Response (90-100)
```
"Let me calculate the revenue impact:

Current Mango flights (canceling 2):
- Revenue per flight: 200 seats × 60% × $500 = $60,000
- Daily revenue: 2 flights × $60,000 = $120,000

New NYC flights (adding 3):
- Revenue per flight: 200 seats × 80% × $700 = $112,000
- Daily revenue: 3 flights × $112,000 = $336,000

Net change: +$216,000 per day
Annual impact: $216,000 × 365 = ~$79 million

I recommend proceeding with the NYC expansion. The numbers show:
1. NYC flights generate 87% more revenue per flight ($112k vs $60k)
2. Higher utilization (80% vs 60%) drives better returns on fixed aircraft costs
3. NYC market likely has business travelers with lower price sensitivity
4. Annual revenue increase of $79M is substantial for growth strategy"
```

**Why Excellent**:
- All calculations correct and clearly shown
- Work is organized and easy to follow
- Converts to annual for business context
- Provides 3-4 substantive insights
- Links numbers to strategic recommendation
- Shows understanding of airline economics (fixed costs, utilization)

#### ⚠️ ACCEPTABLE Response (70-85)
```
"Mango revenue: 120 passengers × $500 = $60,000 per flight
So 2 flights = $120,000 per day

NYC revenue: 160 passengers × $700 = $112,000 per flight
So 3 flights = $336,000 per day

Difference is $216,000 more per day with NYC, so I'd recommend switching to NYC."
```

**Why Acceptable**:
- Core calculations correct
- Clear recommendation
- Missing annual projection
- Limited insights (doesn't explain WHY NYC is better beyond the numbers)
- Doesn't mention cost structure or utilization advantage

#### ❌ WEAK Response (Below 70)
```
"NYC makes more money because the ticket price is higher and more seats are filled. I think we should do NYC instead of Mango."
```

**Why Weak**:
- No calculations shown
- No quantification of the benefit
- Can't verify thinking or methodology
- Doesn't demonstrate analytical rigor

---

## Section 4: Synthesis & Recommendation

### Prompt
"Based on your analysis, please summarize your final recommendation and reasoning to the CEO."

### Evaluation Criteria

#### Recommendation Quality (40% weight)
Must include:
- ✅ Clear recommendation (Go/No-Go on NYC expansion)
- ✅ Key supporting data points
- ✅ Risk factors or considerations
- ✅ Implementation considerations

#### Strategic Thinking (30% weight)
Look for:
- ✅ Links to broader revenue growth strategy
- ✅ Mentions competitive positioning
- ✅ Considers market dynamics (business vs. leisure)
- ✅ Addresses original problem (low-cost carrier competition)

#### Communication (30% weight)
- Executive-appropriate (concise, high-level)
- Leads with recommendation
- Uses the "Situation-Complication-Resolution" or "Pyramid Principle"
- Appropriate level of detail

### Test Cases

#### ✅ EXCELLENT Response (90-100)
```
"I recommend proceeding with the NYC route expansion. Here's why:

Bottom line: This shift generates an additional $79 million in annual revenue while better positioning us against low-cost competitors.

Key supporting points:
1. Financial impact: NYC routes deliver $112K per flight vs. $60K for Mango - an 87% improvement driven by both higher fares ($700 vs $500) and utilization (80% vs 60%)

2. Strategic fit: NYC's business travel market has lower price sensitivity than leisure routes like Mango, insulating us from low-cost carrier pricing pressure

3. Operational efficiency: Higher load factors maximize returns on fixed aircraft and crew costs - critical for competing with LCCs

Risks to monitor:
- Mango market reaction: Consider partnerships with regional carriers to maintain presence
- NYC market saturation: Start with 3 flights and monitor demand before further expansion
- Operational constraints: Ensure crew scheduling and maintenance can support the shift

Next steps: Finalize aircraft reallocation timeline and begin marketing to business travelers in NYC corridor."
```

**Why Excellent**:
- Leads with clear recommendation
- Quantifies impact ($79M)
- Provides structured supporting points
- Links back to original problem (LCC competition)
- Shows strategic thinking (business vs. leisure markets)
- Acknowledges risks
- Suggests next steps
- CEO-level communication (concise but complete)

#### ⚠️ ACCEPTABLE Response (70-85)
```
"I recommend switching to NYC flights because they make more money.

The analysis shows:
- NYC makes $336k per day vs $120k for Mango
- That's $216k more per day
- NYC flights are fuller and have higher ticket prices

This helps with the revenue growth goal. We should start implementing this soon."
```

**Why Acceptable**:
- Clear recommendation
- Includes key numbers
- Logical reasoning
- Missing strategic context
- No risk discussion
- Doesn't address competitive dynamics
- Less executive-level polish

#### ❌ WEAK Response (Below 70)
```
"We should do NYC because it's better. The numbers show it makes more money and the planes are fuller. This will help us compete."
```

**Why Weak**:
- Vague recommendation
- No specific numbers
- No structure
- Doesn't address risks
- Lacks business insight
- Too informal for CEO presentation

---

## Automated Scoring Criteria

### Framework Section
```javascript
{
  dimension: "framework",
  weight: 0.4,
  passing_score: 70,
  check_for: [
    "revenue",
    "volume",
    "price",
    "utilization",
    "cost",
    "profitability"
  ]
}
```

### Analysis Section
```javascript
{
  expected_calculations: {
    "mango_revenue_per_flight": 60000,
    "nyc_revenue_per_flight": 112000,
    "mango_daily_revenue": 120000,
    "nyc_daily_revenue": 336000,
    "net_daily_change": 216000,
    "annual_impact": 78840000 // 216000 × 365
  },
  tolerance: 0.05, // 5%
  key_insights: [
    "utilization",
    "higher yield",
    "fixed costs",
    "business travel",
    "price elasticity"
  ]
}
```

### Synthesis Section
```javascript
{
  required_elements: {
    recommendation: "must be clear go/no-go",
    quantification: "must mention $79M or $216k/day",
    strategic_link: "must connect to LCC competition or growth strategy",
    risks: "bonus points if mentioned"
  }
}
```

---

## Sample Test Execution

### Test Case 1: Strong Candidate
**Framework**: 95/100 - Comprehensive, structured, airline-specific
**Analysis**: 98/100 - All calcs correct, strong insights on utilization
**Synthesis**: 92/100 - Executive-level, clear recommendation, addressed risks
**Overall**: 95/100 - **STRONG PASS**

### Test Case 2: Average Candidate
**Framework**: 75/100 - Basic structure, missing some depth
**Analysis**: 82/100 - Core calculations correct, limited insights
**Synthesis**: 78/100 - Clear recommendation, lacking strategic depth
**Overall**: 78/100 - **PASS**

### Test Case 3: Weak Candidate
**Framework**: 55/100 - Unstructured, no airline-specific thinking
**Analysis**: 45/100 - Major calculation errors
**Synthesis**: 50/100 - Vague recommendation, no quantification
**Overall**: 50/100 - **FAIL**

---

## Quick Reference: Evaluation Checklist

### ✅ PASS Indicators
- [ ] Shows structured thinking (framework)
- [ ] Core revenue calculation correct (60k vs 112k per flight)
- [ ] Recognizes utilization advantage (80% vs 60%)
- [ ] Mentions fixed cost dynamics
- [ ] Clear recommendation with quantification
- [ ] Links to business problem

### ❌ FAIL Indicators
- [ ] No structured approach
- [ ] Cannot perform basic multiplication
- [ ] Doesn't understand airline economics
- [ ] Vague or no recommendation
- [ ] No quantitative analysis
- [ ] Misses the $216k/day difference

---

## Notes for Evaluators

1. **Be flexible on format**: Candidates may structure differently but should cover key elements
2. **Focus on thinking, not memorization**: Strong business intuition > perfect recall of formulas
3. **Tolerate arithmetic errors if methodology is sound**: 5% tolerance on calculations
4. **Reward strategic insights**: Connecting to LCC competition, market dynamics shows maturity
5. **Communication matters**: CEO-level synthesis is a key skill for consultants
