import { createOpenAI } from '@ai-sdk/openai'

export function getEchoOpenAI() {
  const apiKey = process.env.ECHO_API_KEY

  if (!apiKey) {
    throw new Error('ECHO_API_KEY is not defined in environment variables')
  }

  // Echo wraps OpenAI with automatic usage tracking and billing
  return createOpenAI({
    apiKey,
    baseURL: 'https://api.echo.dev/v1/openai', // Echo's proxy endpoint
  })
}

export function getOpenAI() {
  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('OPENAI_API_KEY is not defined in environment variables')
  }

  return createOpenAI({
    apiKey,
  })
}
