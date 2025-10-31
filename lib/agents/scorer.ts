import { callJSON } from "@/lib/openai/client";
import { ScorerSchema, ScorerJSON } from "@/lib/schemas/scorer.schema";
import { CaseState, buildScorerBlocks } from "@/lib/compose/state";
import { loadPrompt } from "@/lib/prompts/load";

export async function runScorer(
  state: CaseState,
  analyzerJson: unknown,
  model = "gpt-4o-mini"
) {
  const system = loadPrompt("scorer");
  const userBlocks = buildScorerBlocks(state, analyzerJson);
  const { json, rawText, usage } = await callJSON<ScorerJSON>(
    system,
    userBlocks,
    ScorerSchema,
    model
  );
  return { json, rawText, usage };
}
