export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getCaseStateFromDB, persistAnalyzerTurn } from "@/lib/supabase/queries";
import { runAnalyzer } from "@/lib/agents/analyzer";
import type { CaseState } from "@/lib/compose/state";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const attemptId: string | undefined = body?.attemptId;
    const answer: string | undefined = body?.answer;
    if (!answer) return NextResponse.json({ error: "answer required" }, { status: 400 });

    const isDemo = body?.demo === true || (attemptId && attemptId.startsWith("demo-"));

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

    const { json, usage, rawText } = await runAnalyzer(state, String(answer));

    if (!json) {
      if (!isDemo && attemptId) {
        await persistAnalyzerTurn({
          attemptId,
          answer: String(answer),
          analyzer_json: rawText || "invalid-json",
          usage,
        });
      }
      return NextResponse.json({ error: "Invalid analyzer JSON" }, { status: 502 });
    }

    if (!isDemo && attemptId) {
      await persistAnalyzerTurn({
        attemptId,
        answer: String(answer),
        analyzer_json: json,
        usage,
      });
    }

    return NextResponse.json({ analyzer_json: json, via: isDemo ? "demo" : "db" });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "server error" }, { status: 500 });
  }
}
