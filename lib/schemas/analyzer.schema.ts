export const AnalyzerSchema = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  title: 'AnalyzerSchema',
  type: 'object',
  additionalProperties: false,
  properties: {
    strengths: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 5,
      description: "Key positive points from the candidate's response",
    },
    red_flags: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 5,
      description: 'Areas of concern in the response',
    },
    math_steps: {
      type: 'array',
      items: { type: 'string' },
      maxItems: 10,
      description: 'Mathematical calculations performed by the candidate',
    },
    estimates: {
      type: 'object',
      additionalProperties: { type: 'number' },
      description: 'Estimated values provided by the candidate',
    },
    readiness: {
      type: 'string',
      enum: ['needs_clarification', 'good_to_progress', 'incomplete_data'],
      description: 'Assessment of whether the response is ready to move forward',
    },
    nudge: {
      type: 'string',
      maxLength: 60,
      description: 'Optional guidance prompt if clarification needed',
    },
    section_end: {
      type: 'boolean',
      description: 'Whether this is a natural endpoint for the section',
    },
  },
  required: [
    'strengths',
    'red_flags',
    'math_steps',
    'estimates',
    'readiness',
    'section_end',
  ],
} as const;

export type AnalyzerJSON = {
  strengths: string[];
  red_flags: string[];
  math_steps: string[];
  estimates: Record<string, number>;
  readiness: 'needs_clarification' | 'good_to_progress' | 'incomplete_data';
  nudge?: string;
  section_end: boolean;
};
