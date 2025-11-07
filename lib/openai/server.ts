import { createOpenAI } from '@ai-sdk/openai'

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not defined')
  }

  return createOpenAI({ apiKey })
}
