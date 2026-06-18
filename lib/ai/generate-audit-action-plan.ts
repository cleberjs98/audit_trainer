import { zodTextFormat } from 'openai/helpers/zod'

import {
  AI_ACTION_PLAN_MODEL,
  getOpenAIClient,
} from '@/lib/ai/openai'
import { AiActionPlanPayloadSchema } from '@/lib/ai/schemas'
import type { AiActionPlanPayload } from '@/lib/ai/schemas'
import type {
  CompletedAuditAiContext,
} from '@/lib/ai/build-audit-ai-context'

export const AI_ACTION_PLAN_PROMPT_VERSION = 'v2.1.0'

export class AiGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiGenerationError'
  }
}

export type GenerateAuditActionPlanResult = {
  payload: AiActionPlanPayload
  model: string
}

const SYSTEM_PROMPT = `
You generate operational action plans for Audit Trainer.
Output English only.
Be professional, practical, coaching-focused, and specific to store operations.
Use only evidence from the provided audit context and comments.
Do not invent facts, people, store conditions, or database records.
Do not mention internal database IDs in user-facing text.
Do not change, recalculate, or reinterpret official audit scores.
Treat the score fields as factual input.
Keep the Outstanding Card bonus separate from the core score.
Generate 3 to 5 action_items.
Each action item must be specific, measurable, and suitable for store operations.
Each due_in_days value must be between 1 and 30.
Each priority must be low, medium, or high.
`.trim()

export async function generateAuditActionPlan(
  context: CompletedAuditAiContext
): Promise<GenerateAuditActionPlanResult> {
  const client = getOpenAIClient()

  const response = await client.responses.parse({
    model: AI_ACTION_PLAN_MODEL,
    input: [
      {
        role: 'system',
        content: SYSTEM_PROMPT,
      },
      {
        role: 'user',
        content: JSON.stringify({
          task: 'Generate a validated AI action plan payload for this completed audit.',
          promptVersion: AI_ACTION_PLAN_PROMPT_VERSION,
          context,
        }),
      },
    ],
    text: {
      format: zodTextFormat(
        AiActionPlanPayloadSchema,
        'audit_action_plan_payload'
      ),
    },
  })

  const parsed = response.output_parsed

  if (!parsed) {
    throw new AiGenerationError('AI returned no structured action plan payload.')
  }

  const validated = AiActionPlanPayloadSchema.safeParse(parsed)

  if (!validated.success) {
    throw new AiGenerationError('AI returned an invalid action plan payload.')
  }

  return {
    payload: validated.data,
    model: AI_ACTION_PLAN_MODEL,
  }
}
