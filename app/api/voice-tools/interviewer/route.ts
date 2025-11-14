export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { performance } from "node:perf_hooks";
import fs from "fs";
import path from "path";
import { getCaseStateFromDB, persistInterviewerTurn } from "@/lib/supabase/queries";
import { resolveCaseStyle } from "@/lib/compose/style";
import { runInterviewer } from "@/lib/agents/interviewer";
import type { CaseState } from "@/lib/compose/state";

function loadCaseText(caseId?: string): string {
  try {
    // For now we hardcode the demo case mapping
    if (caseId === "00000000-0000-0000-0000-000000000000") {
      const filePath = path.join(
        process.cwd(),
        "app",
        "elevenlabs-demo",
        "cases",
        "case1demo.txt"
      );
      return fs.readFileSync(filePath, "utf8");
    }
  } catch (err) {
    console.warn("[interviewer] failed to read case file:", err);
  }
  return "";
}

export async function POST(req: NextRequest) {
  try {
    const startTime = performance.now();
    const body = await req.json();
    const {
      attemptId,
      demo,
      caseId,
      section,
      snippet,
      style,
      objective,
      industry,
      rubric,
      nudge,
      phase,
      firm,
      vars,
      last_question,
    } = body || {};
    const isDemo = demo === true || (attemptId && String(attemptId).startsWith("demo-"));

    // Normalize nudge text (limit length for safety)
    const rawNudge = nudge ? String(nudge).slice(0, 120) : undefined;

    // Phase and nudge specific instructions
    function phaseInstruction(p?: string): string {
      switch (p) {
        case "opening":
          return "You are at the opening of the case. Briefly present the business situation and then ask an open clarifying question that invites exploration.";
        case "structuring":
          return "You are in the structuring phase. Ask the candidate to outline a clear, MECE structure or issue tree for this problem.";
        case "analysis":
          return "You are in the analysis phase. Ask a focused question about drivers, data, or a specific calculation. Keep to one or two sentences.";
        case "recommendation":
          return "You are in the recommendation phase. Ask the candidate to summarise their recommendation including rationale, key risks, and next steps.";
        case "done":
          return "The case is complete. If forced to ask, acknowledge completion politely.";
        default:
          return "Continue the case with a helpful, concise follow-up question that moves the conversation forward.";
      }
    }

    function nudgeInstruction(n?: string | null): string {
      if (!n) return "";
      return `Incorporate this guidance into your next question without repeating prior wording: "${n}".`;
    }

    let state: CaseState;

    if (isDemo) {
      if (!caseId) {
        return NextResponse.json({ error: "caseId required in demo mode" }, { status: 400 });
      }
      const demoVarsStyle = (vars as any)?.interview_style ?? null;
      const demoFirm = firm ?? null;
      const demoCaseStyle = resolveCaseStyle({ override: style ?? null, varsStyle: demoVarsStyle, firm: demoFirm });

      state = {
        attemptId: attemptId ?? "demo-local",
        caseId,
        currentSection: section ?? "opening",
        objective: objective ?? undefined,
        industry: industry ?? undefined,
        last_question: last_question ?? null,
        snippet: snippet ?? null,
        rubric: rubric ?? null,
        caseStyle: demoCaseStyle,
      };
    } else {
      if (!attemptId) {
        return NextResponse.json({ error: "attemptId required" }, { status: 400 });
      }
      state = await getCaseStateFromDB(attemptId);
    }

    // If caller provided an override style in non-demo mode, apply it
    if (!isDemo && style) {
      (state as any).caseStyle = resolveCaseStyle({ override: style ?? null });
    }

    // Load case background from file if available
    const caseText = loadCaseText(caseId);

    // Combine phase & nudge guidance into a compact nudge string for the interviewer prompt.
    const combinedNudge = [
      `Case background:\n${caseText || snippet || "Margins are declining for a client. Understand why and what to do."}`,
      phaseInstruction(phase),
      last_question ? `Do not repeat: \"${String(last_question).slice(0, 120)}\"` : "",
      nudgeInstruction(rawNudge)
    ]
      .filter(Boolean)
      .join('\n\n')
      .slice(0, 400); // expanded for richer case context

    const { json, usage, rawText } = await runInterviewer(state, "gpt-4o-mini", combinedNudge);

    if (!json?.question) {
      // only persist in real mode
      if (!isDemo && attemptId) {
        await persistInterviewerTurn({
          attemptId,
          question: rawText || "invalid-json",
          usage,
        });
      }
      return NextResponse.json({ error: "Invalid interviewer JSON" }, { status: 502 });
    }

    if (!isDemo && attemptId) {
      await persistInterviewerTurn({
        attemptId,
        question: json.question,
        usage,
      });
    }

    return NextResponse.json({
      question: json.question,
      tool_call: json.tool_call ?? "none",
      tool_arg: json.tool_arg ?? null,
      end_section: json.end_section ?? false,
      via: isDemo ? "demo" : "db",
    });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
