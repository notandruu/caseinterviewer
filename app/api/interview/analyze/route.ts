import { generateText } from "ai"
import { createClient } from "@/lib/supabase/server"

export async function POST(req: Request) {
  try {
    const { interviewId, userMessage } = await req.json()

    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const systemPrompt = `You are analyzing a candidate's response in a case interview. Provide real-time assessment of:
1. Whether they're on the right track
2. If they should be prompted to go deeper
3. If they're missing key considerations

Keep your analysis brief and actionable. Return JSON format:
{
  "on_track": boolean,
  "needs_prompting": boolean,
  "missing_elements": [string],
  "suggested_prompt": string
}`

    const { text } = await generateText({
      model: "openai/gpt-4o-mini",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Candidate said: "${userMessage}"` },
      ],
      temperature: 0.5,
      maxTokens: 200,
    })

    let analysis
    try {
      analysis = JSON.parse(text)
    } catch {
      analysis = {
        on_track: true,
        needs_prompting: false,
        missing_elements: [],
        suggested_prompt: "Can you elaborate on that?",
      }
    }

    return Response.json({ analysis })
  } catch (error) {
    console.error("[v0] Error analyzing response:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
