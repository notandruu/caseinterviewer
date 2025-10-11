import { generateText } from "ai"
import { createOpenAI } from "@ai-sdk/openai"

export async function POST(req: Request) {
  try {
    const { messages, caseContext, interviewId } = await req.json()

    // Use OpenAI API directly for demo
    // TODO: Switch to Echo SDK router for production usage metering
    const openai = createOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    })

    // Count only user messages to track interview progress
    const userMessageCount = messages.filter((m: any) => m.role === 'user').length
    let sectionInstruction = ''

    if (userMessageCount === 0) {
      // First message - case introduction
      sectionInstruction = 'This is the FIRST message. Find "1. Case Introduction" in the script below and speak ONLY that section word-for-word. Do not add anything else.'
    } else if (userMessageCount === 1) {
      // After first user response - structuring
      sectionInstruction = 'The candidate gave their first response. Now move to "2. Structuring Prompt" in the script. Read it EXACTLY as written to ask them to structure their approach. Do NOT wait for more info - immediately present the structuring prompt.'
    } else if (userMessageCount >= 2 && userMessageCount <= 4) {
      // Mid interview - deeper exploration (user messages 2-4)
      sectionInstruction = 'The candidate responded to structuring. Now move to "3. Deeper Exploration" in the script. Present the next question from this section (Quant 1, Quant 2, or Brainstorm). If you already asked a question from this section, ask the NEXT one. Keep moving through the questions - do not wait.'
    } else if (userMessageCount >= 5 && userMessageCount <= 6) {
      // Late interview - recommendation (user messages 5-6)
      sectionInstruction = 'The candidate responded. Now move to "4. Recommendation Prompt" in the script. Ask them to synthesize everything and provide their final recommendation. Read the prompt EXACTLY as written.'
    } else {
      // End - feedback (user message 7+)
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
    console.error("[Interview Chat] Error:", error)

    if (error?.status === 429) {
      return Response.json({
        error: "Rate limit exceeded",
        message: "Too many requests. Please try again in a moment."
      }, { status: 429 })
    }

    return Response.json({
      error: "Internal server error",
      message: error?.message || "An error occurred during the interview."
    }, { status: 500 })
  }
}
