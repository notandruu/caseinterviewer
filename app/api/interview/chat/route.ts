import { generateText } from "ai"
import { isEchoAuthenticated } from "@/lib/auth/echo-auth"
import { createOpenAI } from "@ai-sdk/openai"

export async function POST(req: Request) {
  try {
    const { messages, caseContext, interviewId } = await req.json()

    const isAuthenticated = await isEchoAuthenticated()

    // Allow demo users (with demo interview IDs) to proceed without auth
    const isDemoInterview = interviewId?.startsWith('demo-')

    if (!isAuthenticated && !isDemoInterview) {
      return Response.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Create OpenAI instance configured to use Echo SDK router
    const openai = createOpenAI({
      baseURL: "https://echo.router.merit.systems/v1",
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Determine which section to use based on conversation history
    const messageCount = messages.length
    let sectionInstruction = ''

    if (messageCount === 0) {
      // First message - case introduction
      sectionInstruction = 'This is the FIRST message. Find "1. Case Introduction" in the script below and speak ONLY that section word-for-word. Do not add anything else.'
    } else if (messageCount <= 2) {
      // Early in interview - structuring (messages 1-2)
      sectionInstruction = 'The candidate just gave their response. Now move to "2. Structuring Prompt" in the script. Read it EXACTLY as written to ask them to structure their approach. Do NOT wait for more info - immediately present the structuring prompt.'
    } else if (messageCount <= 6) {
      // Mid interview - deeper exploration (messages 3-6)
      sectionInstruction = 'The candidate responded. Now move to "3. Deeper Exploration" in the script. Present the next question from this section (Quant 1, Quant 2, or Brainstorm). If you already asked a question from this section, ask the NEXT one. Keep moving through the questions - do not wait.'
    } else if (messageCount <= 8) {
      // Late interview - recommendation (messages 7-8)
      sectionInstruction = 'The candidate responded. Now move to "4. Recommendation Prompt" in the script. Ask them to synthesize everything and provide their final recommendation. Read the prompt EXACTLY as written.'
    } else {
      // End - feedback (message 9+)
      sectionInstruction = 'Final stage. Find "5. Interviewer Feedback" in the script and provide your closing feedback based on their performance. Keep it concise and specific.'
    }

    const systemPrompt = `You are a case interviewer. Your job is to KEEP THE INTERVIEW MOVING by reading from the script below, section by section.

${sectionInstruction}

CRITICAL RULES:
- After the candidate responds, IMMEDIATELY move to the next section of the script
- Do NOT ask "Is there anything else?" or wait for more information
- Do NOT engage in back-and-forth discussion - keep progressing through the case
- Speak the script content EXACTLY as written (it's already in spoken form)
- Do NOT add section numbers or headers when speaking
- Do NOT speak multiple sections at once
- Keep it natural and conversational (but KEEP MOVING FORWARD)
- Output PLAIN TEXT ONLY - no markdown, no special characters

CASE SCRIPT:
${caseContext.prompt}`

    const { text } = await generateText({
      model: openai("gpt-4o"),
      messages: [
        { role: "system", content: systemPrompt },
        ...messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
      ],
      temperature: 0.7,
      maxTokens: 300, // Increased for case opening and data presentation
    })

    // Strip markdown formatting to prevent TTS from reading asterisks
    const cleanText = text
      .replace(/\*\*(.+?)\*\*/g, '$1')  // Remove bold **text**
      .replace(/\*(.+?)\*/g, '$1')      // Remove italic *text*
      .replace(/_(.+?)_/g, '$1')        // Remove italic _text_
      .replace(/~~(.+?)~~/g, '$1')      // Remove strikethrough ~~text~~
      .replace(/`(.+?)`/g, '$1')        // Remove code `text`

    return Response.json({ message: cleanText })
  } catch (error: any) {
    console.error("[v0] Error in chat route:", error)

    // Handle Echo balance/quota errors
    if (error?.status === 402 || error?.message?.includes('insufficient')) {
      return Response.json({
        error: "Insufficient balance",
        message: "You don't have enough credits. Please add funds to continue.",
        requiresPayment: true
      }, { status: 402 })
    }

    if (error?.status === 429) {
      return Response.json({
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again in a moment."
      }, { status: 429 })
    }

    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
