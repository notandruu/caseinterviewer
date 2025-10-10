import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { getMockSession } from "@/lib/auth/mock-auth"

export async function POST(req: Request) {
  try {
    const { messages, caseContext, interviewId } = await req.json()

    const isAuthenticated = await getMockSession()
    if (!isAuthenticated) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    const systemPrompt = `You are an experienced consulting interviewer conducting a case interview.

Case Context:
- Title: ${caseContext.title}
- Industry: ${caseContext.industry}
- Difficulty: ${caseContext.difficulty}
- Type: ${caseContext.case_type}
- Description: ${caseContext.description}

Your role:
1. Guide the candidate through the case interview naturally
2. Ask clarifying questions when needed
3. Provide data when requested (make up realistic numbers)
4. Challenge assumptions constructively
5. Keep responses concise (2-3 sentences max)
6. Be encouraging but professional
7. Evaluate their structure, analysis, and communication

Interview stages to guide through:
1. Framework development - Help them structure their approach
2. Data analysis - Provide relevant data when asked
3. Quantitative reasoning - Test their math and logic
4. Synthesis - Ask them to summarize findings and recommendations

Adapt your questions based on:
- If they're struggling, provide gentle guidance
- If they're doing well, increase the challenge
- If they ask for data, provide realistic numbers
- If they make assumptions, ask them to validate

Remember: You're testing their problem-solving process, not just the answer.`

    const { text } = await generateText({
      model: openai("gpt-4o-mini"),
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      temperature: 0.7,
      maxTokens: 200,
    })

    return Response.json({ message: text })
  } catch (error) {
    console.error("[v0] Error in chat route:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
