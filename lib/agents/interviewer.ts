import { callJSON } from "@/lib/openai/client";
import { InterviewerSchema, InterviewerJSON } from "@/lib/schemas/interviewer.schema";
import { CaseState, buildInterviewerBlocks } from "@/lib/compose/state";
import { loadPrompt } from "@/lib/prompts/load";

export async function runInterviewer(state: CaseState, model = "gpt-4o-mini") {
  const system = loadPrompt("interviewer");
  const userBlocks = buildInterviewerBlocks(state);
  const { json, rawText, usage } = await callJSON<InterviewerJSON>(
    system,
    userBlocks,
    InterviewerSchema,
    model
  );
  return { json, rawText, usage };
}
