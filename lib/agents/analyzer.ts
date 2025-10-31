import { callJSON } from "@/lib/openai/client";
import { AnalyzerSchema, AnalyzerJSON } from "@/lib/schemas/analyzer.schema";
import { CaseState, buildAnalyzerBlocks } from "@/lib/compose/state";
import { loadPrompt } from "@/lib/prompts/load";

export async function runAnalyzer(
  state: CaseState,
  candidateAnswer: string,
  model = "gpt-4o-mini"
) {
  const system = loadPrompt("analyzer");
  const userBlocks = buildAnalyzerBlocks(state, candidateAnswer);
  const { json, rawText, usage } = await callJSON<AnalyzerJSON>(
    system,
    userBlocks,
    AnalyzerSchema,
    model
  );
  return { json, rawText, usage };
}
