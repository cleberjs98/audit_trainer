import OpenAI from 'openai'

export const AI_ACTION_PLAN_MODEL =
  process.env.AI_ACTION_PLAN_MODEL?.trim() || 'gpt-4.1-mini'

export class MissingOpenAiApiKeyError extends Error {
  constructor() {
    super('OPENAI_API_KEY is not configured.')
    this.name = 'MissingOpenAiApiKeyError'
  }
}

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY?.trim()

  if (!apiKey) {
    throw new MissingOpenAiApiKeyError()
  }

  return new OpenAI({ apiKey })
}

export function isMissingOpenAiApiKeyError(
  error: unknown
): error is MissingOpenAiApiKeyError {
  return error instanceof MissingOpenAiApiKeyError
}
