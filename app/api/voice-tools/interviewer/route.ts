export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { performance } from "node:perf_hooks";
import { getCaseStateFromDB, persistInterviewerTurn } from "@/lib/supabase/queries";
import { runInterviewer } from "@/lib/agents/interviewer";
import type { CaseState } from "@/lib/compose/state";

export async function POST(req: NextRequest) {
  try {
    const startTime = performance.now();
    const body = await req.json();
    const attemptId: string | undefined = body?.attemptId;
    const isDemo = body?.demo === true || (attemptId && attemptId.startsWith("demo-"));
    
    // Get optional nudge and enforce max length
    const nudge = body?.nudge ? `Quick check: ${body.nudge}`.slice(0, 60) : undefined;

    let state: CaseState;

    if (isDemo) {
      const caseId: string | undefined = body?.caseId;
      if (!caseId) {
        return NextResponse.json({ error: "caseId required in demo mode" }, { status: 400 });
      }
      state = {
        attemptId: attemptId ?? "demo-local",
        caseId,
        currentSection: body?.section ?? "opening",
        objective: body?.objective ?? undefined,
        industry: body?.industry ?? undefined,
        last_question: null,
        snippet: body?.snippet ?? null,
        rubric: body?.rubric ?? null,
      };
    } else {
      if (!attemptId) {
        return NextResponse.json({ error: "attemptId required" }, { status: 400 });
      }
      state = await getCaseStateFromDB(attemptId);
    }

    const { json, usage, rawText } = await runInterviewer(state, undefined, nudge);

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
