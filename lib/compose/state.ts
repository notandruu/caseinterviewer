import type { CaseStyle } from "./style";

export type CaseState = {
  attemptId: string;
  caseId: string;
  currentSection: string;
  role?: string;
  industry?: string;
  objective?: string;
  last_question?: string | null;
  snippet?: string | null;
  rubric?: {
    categories: { name: string; weight: number; desc?: string }[];
  } | null;
  caseStyle: CaseStyle;
};

export function buildInterviewerBlocks(s: CaseState, nudge?: string): string[] {
  return [
    `CaseState:
case_id: ${s.caseId}
section: ${s.currentSection}
style: ${s.caseStyle}
objective: ${s.objective ?? ""}`,
    s.snippet ? `Snippet:\n${s.snippet}` : "Snippet: none",
    s.last_question ? `LastQuestion:\n${s.last_question}` : "LastQuestion: none",
    nudge ? `Nudge:\n${nudge}` : "Nudge: none",
  ];
}

export function buildAnalyzerBlocks(s: CaseState, candidateAnswer: string): string[] {
  return [
    `CaseState:
case_id: ${s.caseId}
section: ${s.currentSection}`,
    s.snippet ? `Snippet:\n${s.snippet}` : "Snippet: none",
    `CandidateAnswer:\n${candidateAnswer}`,
  ];
}

export function buildScorerBlocks(s: CaseState, analyzerJson: unknown): string[] {
  return [
    `CaseState:
case_id: ${s.caseId}
section: ${s.currentSection}`,
    s.rubric ? `Rubric:\n${JSON.stringify(s.rubric)}` : "Rubric: none",
    `AnalyzerJSON:\n${JSON.stringify(analyzerJson)}`,
  ];
}
