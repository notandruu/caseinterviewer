export const ScorerSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Scorer",
  type: "object",
  additionalProperties: false,
  properties: {
    total: { type: "integer", minimum: 0, maximum: 100 },
    buckets: {
      type: "array",
      maxItems: 6,
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          score: { type: "integer", minimum: 0, maximum: 5 },
          rationale: { type: "string" },
        },
        required: ["name", "score", "rationale"],
      },
    },
    decision: { type: "string", enum: ["below", "meets", "exceeds"] },
  },
  required: ["total", "buckets", "decision"],
} as const;

export type ScorerJSON = {
  total: number;
  buckets: { name: string; score: number; rationale: string }[];
  decision: "below" | "meets" | "exceeds";
};
