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

    // Determine which section to use based on conversation history
    const messageCount = messages.length
    let sectionInstruction = ''

    if (messageCount === 0) {
      // First message - case introduction
      sectionInstruction = 'This is the FIRST message. Find "1. Case Introduction" in the script below and speak ONLY that section word-for-word. Do not add anything else.'
    } else if (messageCount <= 2) {
      // Early in interview - structuring
      sectionInstruction = 'Find "2. Structuring Prompt" in the script below and speak it. Guide them to structure their approach.'
    } else if (messageCount <= 6) {
      // Mid interview - quant and brainstorm
      sectionInstruction = 'Find "3. Deeper Exploration" in the script below. Present the next question (Quant 1, Quant 2, or Brainstorm) based on what you\'ve already asked.'
    } else if (messageCount <= 8) {
      // Late interview - recommendation
      sectionInstruction = 'Find "4. Recommendation Prompt" in the script below and ask for their final recommendation.'
    } else {
      // End - feedback
      sectionInstruction = 'Find "5. Interviewer Feedback" in the script below and provide closing feedback.'
    }

    const systemPrompt = `You are a case interviewer. Your job is simple: read from the script below, section by section.

${sectionInstruction}

CASE SCRIPT:
${caseContext.prompt}

RULES:
- Speak the script content EXACTLY as written (it's already in spoken form)
- Do NOT add section numbers or headers when speaking
- Do NOT speak multiple sections at once
- Keep it natural and conversational
- Output PLAIN TEXT ONLY - no markdown, no special characters`

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
  } catch (error) {
    console.error("[v0] Error in chat route:", error)
    return Response.json({ error: "Internal server error" }, { status: 500 })
  }
}
