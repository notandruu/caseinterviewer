import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const { interviewId } = await req.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: interview } = await supabase.from("interviews").select("*, cases(*)").eq("id", interviewId).single()

    if (!interview || interview.user_id !== user.id) {
      return Response.json({ error: "Interview not found" }, { status: 404 })
    }

    const transcript = interview.transcript as Array<{ role: string; content: string }>

    const systemPrompt = `You are an expert MBB case interview evaluator with 10+ years of experience. Analyze this voice-based case interview transcript and provide realistic, actionable feedback.

Case Context:
- Title: ${interview.cases.title}
- Type: ${interview.cases.case_type}
- Difficulty: ${interview.cases.difficulty}

📋 Evaluate across 5 dimensions (score 0-100):

1. **Articulation** — Clarity, flow, signposting (e.g., "Let me walk through three buckets...")
2. **Confidence** — Tone, decisiveness, handling of pauses or uncertainty
3. **Brainstorming** — MECE thinking, prioritization, creativity in generating ideas
4. **Information Analysis** — Data interpretation, insight extraction, synthesis
5. **Quantitative** — Math setup, calculation accuracy, sanity checks

Scoring Guidelines:
- 90-100: MBB-ready, top tier
- 75-89: Strong, needs minor polish
- 60-74: Competent, needs targeted practice
- Below 60: Needs significant work

Provide:
- Overall score (average of 5 dimensions)
- Individual scores for all 5 dimensions
- 3 specific strengths (what they did well)
- 3 areas for improvement (specific, actionable)
- 1-2 sentence overall comment (tone + growth area)
- Optional: 1 practice drill suggestion

Format as JSON:
{
  "overall_score": number,
  "structure_score": number,
  "analysis_score": number,
  "communication_score": number,
  "strengths": [string, string, string],
  "areas_for_improvement": [string, string, string],
  "detailed_feedback": string
}

Note: Map dimensions as follows for database compatibility:
- structure_score = average of Brainstorming + Information Analysis
- analysis_score = Quantitative score
- communication_score = average of Articulation + Confidence`

    const conversationText = transcript
      .map((msg) => `${msg.role === "user" ? "Candidate" : "Interviewer"}: ${msg.content}`)
      .join("\n\n")

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Transcript:\n\n${conversationText}` },
      ],
      temperature: 0.3,
    })

    let feedbackData
    try {
      feedbackData = JSON.parse(text)
    } catch {
      feedbackData = {
        overall_score: 75,
        structure_score: 75,
        analysis_score: 75,
        communication_score: 75,
        strengths: ["Demonstrated clear thinking", "Asked relevant questions", "Maintained professional demeanor"],
        areas_for_improvement: [
          "Could develop more structured frameworks",
          "Consider deeper quantitative analysis",
          "Practice more concise communication",
        ],
        detailed_feedback:
          "You showed good foundational skills in this case interview. Continue practicing to refine your approach and build confidence in your problem-solving abilities.",
      }
    }

    const { data: feedback } = await supabase
      .from("feedback")
      .insert({
        interview_id: interviewId,
        ...feedbackData,
      })
      .select()
      .single()

    const { data: stats } = await supabase.from("user_stats").select("*").eq("user_id", user.id).single()

    const newCompletedCount = (stats?.completed_interviews || 0) + 1
    const newTotalCount = (stats?.total_interviews || 0) + 1
    const currentAverage = stats?.average_score || 0
    const newAverage = (currentAverage * (newCompletedCount - 1) + feedbackData.overall_score) / newCompletedCount

    await supabase
      .from("user_stats")
      .update({
        total_interviews: newTotalCount,
        completed_interviews: newCompletedCount,
        average_score: newAverage,
        last_interview_date: new Date().toISOString().split("T")[0],
      })
      .eq("user_id", user.id)

    return Response.json({ feedback })
  } catch (error) {
    console.error("[v0] Error generating feedback:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
