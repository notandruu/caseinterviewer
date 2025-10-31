export const AnalyzerSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Analyzer",
  type: "object",
  additionalProperties: false,
  properties: {
    notes_bullets: { type: "array", items: { type: "string" }, maxItems: 10 },
    facts_public: { type: "array", items: { type: "string" }, maxItems: 10 },
    risks: { type: "array", items: { type: "string" }, maxItems: 5 },
    math: {
      type: "object",
      additionalProperties: false,
      properties: {
        assumptions: { type: "array", items: { type: "string" }, maxItems: 5 },
        result: { type: "string" },
      },
      // Strict requires listing all keys in properties
      required: ["assumptions", "result"],
    },
    followups: { type: "array", items: { type: "string" }, maxItems: 3 },
    section_readiness: {
      type: "string",
      enum: ["continue", "ask_more", "ready_to_score"],
    },
  },
  // Strict requires all top-level keys listed here
  required: [
    "notes_bullets",
    "facts_public",
    "risks",
    "math",
    "followups",
    "section_readiness",
  ],
} as const;

export type AnalyzerJSON = {
  notes_bullets: string[];
  facts_public: string[];
  risks: string[];
  math: { assumptions: string[]; result: string };
  followups: string[];
  section_readiness: "continue" | "ask_more" | "ready_to_score";
};
