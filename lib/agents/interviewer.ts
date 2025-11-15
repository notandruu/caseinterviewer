import { callJSON } from "@/lib/openai/client";
import { InterviewerSchema, InterviewerJSON } from "@/lib/schemas/interviewer.schema";
import { CaseState, buildInterviewerBlocks } from "@/lib/compose/state";
import { loadPrompt } from "@/lib/prompts/load";

export async function runInterviewer(state: CaseState, model = "gpt-4o-mini", nudge?: string) {
  const system = loadPrompt("interviewer");
  // Allow richer guidance: trim but keep more context, avoid redundant prefix
  const cleaned = nudge ? String(nudge).replace(/\s+/g, ' ').trim() : undefined;
  const safeNudge = cleaned ? cleaned.slice(0, 1800) : undefined;
  const userBlocks = buildInterviewerBlocks(state, safeNudge);
  const { json, rawText, usage } = await callJSON<InterviewerJSON>(
    system,
    userBlocks,
    InterviewerSchema,
    model
  );
  return { json, rawText, usage };
}
