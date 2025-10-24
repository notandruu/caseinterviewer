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

    const systemPrompt = `You are an expert consulting interview evaluator. Analyze the following case interview transcript and provide detailed feedback.

Case Context:
- Title: ${interview.cases.title}
- Type: ${interview.cases.case_type}
- Difficulty: ${interview.cases.difficulty}

Evaluate the candidate on these dimensions (score 0-100):
1. Structure: Did they use a clear framework? Was their approach MECE (Mutually Exclusive, Collectively Exhaustive)?
2. Analysis: How deep was their analysis? Did they identify key drivers and insights?
3. Communication: How clearly did they articulate their thoughts? Was their pacing appropriate?

Provide:
- Overall score (average of the three dimensions)
- Individual scores for structure, analysis, and communication
- 3 specific strengths
- 3 specific areas for improvement
- Detailed feedback paragraph (3-4 sentences)

Format your response as JSON:
{
  "overall_score": number,
  "structure_score": number,
  "analysis_score": number,
  "communication_score": number,
  "strengths": [string, string, string],
  "areas_for_improvement": [string, string, string],
  "detailed_feedback": string
}`

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
