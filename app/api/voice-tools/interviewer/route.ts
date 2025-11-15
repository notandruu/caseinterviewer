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
      last_transcript,
      analyzer_readiness,
      next_action_type,
    } = body || {};
    const isDemo = demo === true || (attemptId && String(attemptId).startsWith("demo-"));

    // Normalize nudge text (limit length for safety)
    const rawNudge = nudge ? String(nudge).slice(0, 120) : undefined;

    // Phase and nudge specific instructions (expanded to 10-phase model)
    function phaseInstruction(p?: string): string {
      switch (p) {
        case "greeting":
          return "GREETING ONLY: Say hello, introduce yourself as the interviewer, and tell them you'll present a business case. Do NOT present the case yet. 1-2 sentences max. Example: 'Hi, I'm your interviewer today. I'll present a business case and then we'll work through it together.'";
        case "case_prompt":
          return "CASE PRESENTATION: In a single output string, first present the business situation in 1–2 sentences using the Case background below, then end with exactly: 'What are your initial thoughts?' Keep it concise and neutral.";
        case "clarification":
          return "You are in the clarification phase. Answer the candidate's clarifying questions directly and factually. If they seem ready to structure, acknowledge it.";
        case "framework":
          return "You are in the framework phase. Ask the candidate to outline their structure or framework for analyzing the case. Listen for MECE thinking and logical flow.";
        case "exploration":
          return "You are in the exploration phase. Guide the candidate deeper into their chosen branch of analysis. Ask about drivers, hypotheses, or what data they would want to see.";
        case "quant_check":
          return "You are in the quantitative check phase. Present a quantitative problem or data exhibit. Ask the candidate to interpret it, calculate something, or draw insights from the numbers.";
        case "creative_check":
          return "You are in the creative check phase. Present a curveball, edge case, or creative challenge that tests adaptability. This could be a constraint, new information, or a 'what if' scenario.";
        case "synthesis":
          return "You are in the synthesis phase. Ask the candidate to synthesize everything and form a recommendation. They should tie together their structure, findings, and quantitative insights.";
        case "closing":
          return "You are closing the case. Ask if they have final thoughts or questions. Acknowledge their work and wrap up professionally.";
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
        last_transcript: last_transcript ?? null,
        snippet: snippet ?? null,
        rubric: rubric ?? null,
        caseStyle: demoCaseStyle,
        caseBackground: null,
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

    // If we're in done phase, return a final summary with goodbye and dynamic feedback
    if (phase === "done") {
      const turnCount = typeof body?.turn_count === 'number' ? body.turn_count : 0;
      const hadTranscript = !!last_transcript;
      const readiness = analyzer_readiness || "unknown";
      
      // Generate constructive feedback based on conversation signals
      const feedback = generateFeedback({
        turnCount,
        hadTranscript,
        readiness,
        lastTranscript: last_transcript,
      });
      
      return NextResponse.json({
        question: `The interview is complete. ${feedback} Thank you for your work today. Goodbye!`,
        tool_call: "none",
        tool_arg: null,
        end_section: true,
        via: isDemo ? "demo" : "db",
      })
    }
    
    function generateFeedback(opts: { turnCount: number; hadTranscript: boolean; readiness: string; lastTranscript?: string | null }): string {
      const { turnCount, hadTranscript, readiness, lastTranscript } = opts;
      const parts: string[] = [];
      
      // Turn count feedback
      if (turnCount >= 5) {
        parts.push("You engaged deeply with the case and explored multiple angles.");
      } else if (turnCount >= 3) {
        parts.push("You covered key areas of the case effectively.");
      } else if (turnCount > 0) {
        parts.push("You touched on important aspects, though more exploration could strengthen your analysis.");
      }
      
      // Readiness/clarity feedback
      if (readiness === "good_to_progress") {
        parts.push("Your responses were clear and structured.");
      } else if (readiness === "needs_clarification") {
        parts.push("Some of your points could benefit from more specificity.");
      }
      
      // Engagement feedback
      if (hadTranscript && lastTranscript && lastTranscript.trim().length > 0) {
        if (lastTranscript.toLowerCase().includes("goodbye") || lastTranscript.toLowerCase().includes("thank")) {
          parts.push("You closed professionally.");
        } else {
          parts.push("You stayed engaged throughout.");
        }
      }
      
      // Default if no parts
      if (parts.length === 0) {
        parts.push("Your performance showed solid analytical thinking.");
      }
      
      return parts.join(" ");
    }

    // For greeting phase, don't include case details yet
    const includeCaseBackground = phase !== "greeting";
    const trimmedCaseText = typeof caseText === "string" ? caseText.trim() : "";
    const snippetForContext = typeof state.snippet === "string" ? state.snippet : "";
    const fallbackBackground = "A company faces a business challenge. Present the situation succinctly and proceed.";
    const backgroundSource = includeCaseBackground
      ? (trimmedCaseText.length > 0
          ? trimmedCaseText
          : (snippetForContext.trim().length > 0 ? snippetForContext : fallbackBackground))
      : null;
    const promptBackground = backgroundSource ? backgroundSource.slice(0, 3200) : null;
    
    // Combine phase & nudge guidance into a compact nudge string for the interviewer prompt.
    const wantsNumber = typeof last_transcript === 'string' && /\b(how much|how many|what (is|was) the|by how (much|many))\b/i.test(last_transcript);

    const combinedNudge = [
      last_transcript
        ? `Candidate latest request:\n${String(last_transcript).slice(0, 400)}\nPriority: Address this request directly before introducing new topics. Do not pivot back to generic drivers unless explicitly asked.`
        : "",
      phaseInstruction(phase),
      phase === "case_prompt"
        ? "OUTPUT FORMAT: Start with 'Case:' followed by a 1–2 sentence summary using the Case background, then append ' What are your initial thoughts?' Do not ask generic approach questions without presenting the case."
        : "",
      analyzer_readiness === 'needs_clarification' && last_transcript
        ? "Analyzer: needs_clarification. Ask one clarifying question specifically about the candidate's latest request."
        : "",
      wantsNumber
        ? "Candidate is requesting a specific figure. Ask ONE scoping question to pin down: the exact metric definition (e.g., absolute percentage change vs percentage points) and the time window (e.g., Q3 vs Q2 or Q3 YoY)."
        : "",
      next_action_type ? `LastNextActionType: ${next_action_type}` : "",
      last_question ? `Do not repeat: \"${String(last_question).slice(0, 120)}\"` : "",
      nudgeInstruction(rawNudge),
    ]
      .filter(Boolean)
      .join("\n\n");

    // Avoid leaking case-specific snippet during greeting
    const stateForPrompt: CaseState = phase === "greeting"
      ? { ...state, snippet: null, last_question: null, caseBackground: null }
      : { ...state, caseBackground: promptBackground };

    const { json, usage, rawText } = await runInterviewer(stateForPrompt, "gpt-4o-mini", combinedNudge);

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
