export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { performance } from "node:perf_hooks";
import { getCaseStateFromDB, persistAnalyzerTurn } from "@/lib/supabase/queries";
import { resolveCaseStyle } from "@/lib/compose/style";
import { runAnalyzer } from "@/lib/agents/analyzer";
import { decideNext } from "@/lib/agents/director";
import type { CaseState } from "@/lib/compose/state";

export async function POST(req: NextRequest) {
  try {
    const startTime = performance.now();
    const idempotencyKey = req.headers.get("X-Idempotency-Key");
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
      const demoVarsStyle = (body?.vars as any)?.interview_style ?? null;
      const demoFirm = body?.firm ?? null;
      const demoCaseStyle = resolveCaseStyle({ override: body?.style ?? null, varsStyle: demoVarsStyle, firm: demoFirm });

      state = {
        attemptId: attemptId ?? "demo-local",
        caseId,
        currentSection: body?.section ?? "opening",
        objective: body?.objective ?? undefined,
        industry: body?.industry ?? undefined,
        last_question: null,
        snippet: body?.snippet ?? null,
        rubric: body?.rubric ?? null,
        caseStyle: demoCaseStyle,
      };
    } else {
      if (!attemptId) {
        return NextResponse.json({ error: "attemptId required" }, { status: 400 });
      }
      state = await getCaseStateFromDB(attemptId);
    }

    // First attempt at analysis
    let { json, usage, rawText } = await runAnalyzer(state, String(answer));

    // If first attempt fails, retry with stricter instruction
    if (!json) {
      const { json: retryJson, usage: retryUsage, rawText: retryRawText } = await runAnalyzer(
        state,
        String(answer),
        "Be extremely precise and ensure valid JSON output. Do not include any explanatory text."
      );
      json = retryJson;
      usage = retryUsage;
      rawText = retryRawText;
    }

    // Calculate latency
    const latency_ms = Math.round(performance.now() - startTime);

        // Handle failed parsing after retry
    if (!json) {
      // Log raw text for debugging when analyzer returned invalid JSON
      console.error("[analyze] invalid JSON, rawText:", rawText);

      if (!isDemo && attemptId) {
        await persistAnalyzerTurn({
          attemptId,
          answer: String(answer),
          analyzer_json: rawText || "invalid-json",
          usage,
          latency_ms,
          idempotency_key: idempotencyKey || undefined,
          stage: "analyze"
        });
      }
      return NextResponse.json(
        { error: "Please rephrase your answer in one clear sentence." }, 
        { status: 502 }
      );
    }

    // Compute next action based on analyzer output
    const next_action = decideNext(json);

    // Persist the turn
    if (!isDemo && attemptId) {
      await persistAnalyzerTurn({
        attemptId,
        answer: String(answer),
        analyzer_json: json,
        usage,
        latency_ms,
        idempotency_key: idempotencyKey || undefined,
        stage: "analyze"
      });
    }

    return NextResponse.json({ 
      analyzer_json: json, 
      next_action,
      via: isDemo ? "demo" : "live" 
    });
  } catch (err) {
    console.error("[analyze] error", err);
    const isDev = process.env.NODE_ENV !== "production";
    return NextResponse.json({ error: isDev ? String(err) : "server error" }, { status: 500 });
  }
}
