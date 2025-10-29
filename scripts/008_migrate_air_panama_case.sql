-- Migrate existing Air Panama case from single prompt to structured sections

UPDATE public.cases
SET
  section_introduction = '"Your client is *Air Panama*, the second-largest airline in Latin America.
They operate from Mexico City with routes across the Americas, and limited service to Europe and Asia.
Recently, revenue and profit have fallen. Smaller competitors now offer direct flights to North America, drawing customers away from Air Panama''s hub model.
Your task: help the client find ways to grow revenue in this changing market."',

  section_clarifying = NULL, -- Optional - can be added later if needed

  section_structuring = '"Take a minute to structure your approach.
When you''re ready, walk me through your high-level framework for identifying revenue opportunities for Air Panama."',

  section_quant_1 = '"The client is weighing adding 3 daily flights to New York City, but that would require canceling 2 daily flights to Mango, Brazil, using the same planes.
Each aircraft seats 200 passengers. Mango flights run at 60% utilization, with average fares of $500.
NYC flights would run at 80% utilization, also $500 per ticket.
Assume costs are the same.
Can you calculate the revenue lost from canceling Mango, and how much NYC needs to make to break even?"',

  section_quant_2 = '"Here''s an update:
Air Panama currently runs 12 daily NYC flights. With expansion, they''d go to 15.
They expect utilization to fall to 70% and fares to drop to $450 due to competition.
Should they still move forward with the NYC expansion?"',

  section_creative = '"Beyond revenue levers, what other ways could Air Panama improve profitability?"',

  section_recommendation = '"Now, imagine the client asks for your final recommendation.
Please summarize the situation, give your recommendation, outline key risks, and suggest next steps."',

  section_feedback_template = '"Thanks. Here''s quick feedback:
Your structure was {structure_quality} and you analyzed the right levers—volume, pricing, and utilization.
Your math was {math_quality}.
To improve, {improvement_suggestion}.
Your final recommendation was {recommendation_quality}. Overall, {overall_assessment}. Keep practicing your brainstorming pace."',

  num_sections = 6, -- Not using clarifying section
  section_order = ARRAY['introduction', 'structuring', 'quant_1', 'quant_2', 'creative', 'recommendation']

WHERE title = 'Air Panama Revenue Growth';

-- If no case exists with that exact title, you can also match by industry or just update all cases
-- Adjust the WHERE clause as needed for your data
