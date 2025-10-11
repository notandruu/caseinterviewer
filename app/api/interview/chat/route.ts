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
      sectionInstruction = 'This is the FIRST message. Find section "1. Case Introduction" in the script below. Speak ONLY the text in quotes after "(Spoken)" - word for word. Do not add section numbers or any other text.'
    } else if (userMessageCount === 1) {
      // After first user response - structuring
      sectionInstruction = 'The candidate gave their first response. Find section "2. Structuring Prompt" in the script. Speak ONLY the text in quotes after "(Spoken)" - exactly as written. Then STOP.'
    } else if (userMessageCount === 2) {
      // First quant question
      sectionInstruction = 'The candidate structured their approach. Find section "3. Quantitative Analysis" in the script. Speak ONLY the text in quotes after "(Spoken)" - exactly as written.'
    } else if (userMessageCount === 3) {
      // Second quant question
      sectionInstruction = 'The candidate answered the first quant. Find section "4. Quant Question – Updated Info" in the script. Speak ONLY the text in quotes after "(Spoken)" - exactly as written.'
    } else if (userMessageCount === 4) {
      // Creative thinking
      sectionInstruction = 'The candidate answered the second quant. Find section "5. Creative Thinking" in the script. Speak ONLY the text in quotes after "(Spoken)" - exactly as written.'
    } else if (userMessageCount === 5) {
      // Recommendation
      sectionInstruction = 'The candidate brainstormed ideas. Find section "6. Recommendation Prompt" in the script. Speak ONLY the text in quotes after "(Spoken)" - exactly as written.'
    } else {
      // Feedback (user message 6+)
      sectionInstruction = 'The candidate gave their recommendation. Find section "7. Interviewer Feedback" in the script. Speak ONLY the text in quotes after "(Spoken)" - exactly as written. This is the final message.'
    }

    const systemPrompt = `You are a professional case interviewer. Your ONLY job is to read from the interview script below, one section at a time.

${sectionInstruction}

CRITICAL RULES:
1. Find the correct numbered section in the script
2. Speak ONLY the text that appears in quotes after "(Spoken)"
3. Do NOT add: section numbers, headers, or any extra commentary
4. Do NOT ask follow-up questions unless they're in the script
5. Do NOT wait for more information - just read the script section and stop
6. Output PLAIN TEXT ONLY - no markdown, no asterisks, no formatting
7. After reading the script section, you are DONE - do not add anything else

INTERVIEW SCRIPT:
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
