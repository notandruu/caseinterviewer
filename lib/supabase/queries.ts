import { createClient } from "@/lib/supabase/server";
import { CaseState } from "@/lib/compose/state";

// Helpers to append a JSON turn into case_attempts.turns
async function appendTurn(
  attemptId: string,
  turn: Record<string, any>
): Promise<void> {
  const supabase = await createClient();
  const { data: row, error: getErr } = await supabase
    .from("case_attempts")
    .select("turns")
    .eq("id", attemptId)
    .single();

  if (getErr) {
    console.error("appendTurn fetch error", getErr);
    return;
  }

  const turns = Array.isArray(row?.turns) ? row.turns : [];
  turns.push({ ...turn, created_at: new Date().toISOString() });

  const { error: updErr } = await supabase
    .from("case_attempts")
    .update({ turns, updated_at: new Date().toISOString() })
    .eq("id", attemptId);

  if (updErr) console.error("appendTurn update error", updErr);
}

export async function getCaseStateFromDB(attemptId: string): Promise<CaseState> {
  const supabase = await createClient();

  const { data: attempt, error: aErr } = await supabase
    .from("case_attempts")
    .select("id, case_id, current_section, current_line_id")
    .eq("id", attemptId)
    .single();

  if (aErr || !attempt) throw new Error("case_attempt not found");

  const { data: kase } = await supabase
    .from("cases")
    .select("id, objective, industry")
    .eq("id", attempt.case_id)
    .single();

  // Try to use the current script line as context snippet
  let snippet: string | null = null;
  let rubric: CaseState["rubric"] = null;

  if (attempt.current_line_id) {
    const { data: line } = await supabase
      .from("script_lines")
      .select("text_template, rubric")
      .eq("id", attempt.current_line_id)
      .maybeSingle();

    if (line?.text_template) {
      snippet = String(line.text_template).slice(0, 600);
    }
    if (line?.rubric) {
      try {
        const parsed = JSON.parse(line.rubric);
        if (Array.isArray(parsed?.categories)) {
          rubric = { categories: parsed.categories };
        }
      } catch {
        // rubric not JSON
        rubric = null;
      }
    }
  }

  return {
    attemptId,
    caseId: attempt.case_id,
    currentSection: attempt.current_section,
    objective: kase?.objective ?? undefined,
    industry: kase?.industry ?? undefined,
    last_question: null, // can be derived from last interviewer turn if you want
    snippet,
    rubric,
  };
}

export async function persistInterviewerTurn(params: {
  attemptId: string;
  question: string;
  usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
}) {
  await appendTurn(params.attemptId, {
    stage: "interviewer",
    question_text: params.question,
    tokens_in: params.usage?.input_tokens ?? params.usage?.prompt_tokens ?? null,
    tokens_out: params.usage?.output_tokens ?? params.usage?.completion_tokens ?? null,
  });
}

export async function persistAnalyzerTurn(params: {
  attemptId: string;
  answer: string;
  analyzer_json: unknown;
  usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
}) {
  await appendTurn(params.attemptId, {
    stage: "analyzer",
    answer_text: params.answer,
    analyzer_json: params.analyzer_json,
    tokens_in: params.usage?.input_tokens ?? params.usage?.prompt_tokens ?? null,
    tokens_out: params.usage?.output_tokens ?? params.usage?.completion_tokens ?? null,
  });
}

export async function persistScorerTurn(params: {
  attemptId: string;
  scorer_json: unknown;
  usage?: { input_tokens?: number; output_tokens?: number; prompt_tokens?: number; completion_tokens?: number };
}) {
  const supabase = await createClient();
  await appendTurn(params.attemptId, {
    stage: "scorer",
    scorer_json: params.scorer_json,
    tokens_in: params.usage?.input_tokens ?? params.usage?.prompt_tokens ?? null,
    tokens_out: params.usage?.output_tokens ?? params.usage?.completion_tokens ?? null,
  });

  // also mirror into case_attempts.scores for quick reads
  const { error } = await supabase
    .from("case_attempts")
    .update({ scores: params.scorer_json, updated_at: new Date().toISOString() })
    .eq("id", params.attemptId);

  if (error) console.error("persistScorerTurn scores update error", error);
}
