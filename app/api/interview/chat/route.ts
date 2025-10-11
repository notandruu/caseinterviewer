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

    // Get section order from case (defaults to standard flow if not specified)
    const sectionOrder = caseContext.section_order || [
      'introduction',
      'clarifying',
      'structuring',
      'quant_1',
      'quant_2',
      'creative',
      'recommendation'
    ]

    // Map user message count to section
    let currentSection = ''
    let sectionContent = ''

    if (userMessageCount < sectionOrder.length) {
      currentSection = sectionOrder[userMessageCount]
      const sectionKey = `section_${currentSection}`
      sectionContent = caseContext[sectionKey] || ''
    } else {
      // Feedback section (after all main sections)
      currentSection = 'feedback'
      sectionContent = caseContext.section_feedback_template || 'Thank you for completing the interview. You did a great job!'
    }

    // Build dynamic instruction based on current section
    let sectionInstruction = ''
    const sectionNames: Record<string, string> = {
      introduction: 'case introduction',
      clarifying: 'clarifying questions',
      structuring: 'structuring prompt',
      quant_1: 'first quantitative question',
      quant_2: 'second quantitative question',
      creative: 'creative/brainstorming prompt',
      recommendation: 'final recommendation prompt',
      feedback: 'feedback'
    }

    const sectionName = sectionNames[currentSection] || currentSection
    sectionInstruction = `You are now at the "${sectionName}" stage of the interview. Speak the following text EXACTLY as written:\n\n${sectionContent}\n\nDo NOT add any commentary, explanations, or follow-up questions beyond what's written above.`

    const systemPrompt = `You are a professional case interviewer conducting a ${caseContext.case_type} case interview.

Case Context:
- Client: ${caseContext.title}
- Industry: ${caseContext.industry}
- Difficulty: ${caseContext.difficulty}

Current Stage: ${sectionName} (user message #${userMessageCount})

${sectionInstruction}

CRITICAL RULES:
1. Speak ONLY the provided text for this section - nothing more, nothing less
2. Do NOT add: section numbers, headers, transitions, or any extra commentary
3. Do NOT ask follow-up questions unless they're in the provided text
4. Output PLAIN TEXT ONLY - no markdown, no asterisks, no formatting
5. After speaking the section text, you are DONE - do not add anything else
6. If the text is empty or missing, politely acknowledge the candidate's response and wait for them to continue

The candidate is performing well. Your job is simply to guide them through the interview by reading each section.`

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
