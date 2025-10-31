export type NextAction =
  | { type: "continue" }
  | { type: "ask_more"; nudge?: string }
  | { type: "score" };

export function decideNext(a: {
  readiness?: "needs_clarification" | "good_to_progress" | "incomplete_data";
  nudge?: string;
  section_end?: boolean;
}): NextAction {
  if (a.readiness === "needs_clarification" || a.readiness === "incomplete_data") {
    return { type: "ask_more", nudge: a.nudge?.slice(0, 60) };
  }
  if (a.section_end) return { type: "score" };
  return { type: "continue" };
}