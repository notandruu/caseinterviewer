export const InterviewerSchema = {
  $schema: "http://json-schema.org/draft-07/schema#",
  title: "Interviewer",
  type: "object",
  additionalProperties: false,
  properties: {
    question: { type: "string", minLength: 1 },
    tool_call: { type: "string", enum: ["none", "clarify", "show_exhibit"] },
    tool_arg: { anyOf: [{ type: "string" }, { type: "null" }] },
    end_section: { type: "boolean" },
  },
  // Strict JSON schema requires all properties listed here
  required: ["question", "tool_call", "tool_arg", "end_section"],
} as const;

export type InterviewerJSON = {
  question: string;
  tool_call: "none" | "clarify" | "show_exhibit";
  tool_arg: string | null;
  end_section: boolean;
};
