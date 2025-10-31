import fs from "fs";
import path from "path";

const FALLBACKS = {
  interviewer: `1) You are a strict case interviewer.
2) Ask one concise question for the current section only.
3) Do not reveal answers or coach.
4) If off track, ask a short nudge question.
5) Output JSON only.`,
  analyzer: `1) You are a case analyst.
2) Extract terse bullets and factual claims from the candidate answer.
3) Do not invent.
4) Keep math assumptions small and clear.
5) Output JSON only.`,
  scorer: `1) You are a case grader.
2) Score against the rubric weights and be stable for identical inputs.
3) Short rationales only. No coaching.
4) Output JSON only.`,
} as const;

export function loadPrompt(name: "interviewer" | "analyzer" | "scorer") {
  try {
    const p = path.join(process.cwd(), "lib", "prompts", `${name}.system.txt`);
    return fs.readFileSync(p, "utf8");
  } catch {
    return FALLBACKS[name];
  }
}
