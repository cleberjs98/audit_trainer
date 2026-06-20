import { zodTextFormat } from 'openai/helpers/zod'
import type { ZodError } from 'zod'

import {
  AI_ACTION_PLAN_MODEL,
  getOpenAIClient,
} from '@/lib/ai/openai'
import {
  AiActionPlanPdfPayloadSchema,
  type AiActionPlanPdfPayload,
} from '@/lib/ai/schemas'
import {
  aiActionPlanPdfScoreFacts,
  aiActionPlanPdfSourceFacts,
  type AiActionPlanPdfContext,
} from '@/lib/ai/build-ai-action-plan-pdf-context'

export const AI_ACTION_PLAN_PDF_PROMPT_VERSION = 'v2.2.5-ai-action-plan-pdf'

export class AiActionPlanPdfGenerationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiActionPlanPdfGenerationError'
  }
}

export type GenerateAiActionPlanPdfPayloadResult = {
  payload: AiActionPlanPdfPayload
  model: string
}

const SYSTEM_PROMPT = `
You generate structured content for Audit Trainer AI Action Plan PDFs.
Output English only.
The output is content only, not markdown, HTML, or a PDF.
Use short, premium, operational, coaching-focused language for a clean one-page A4 Audit Trainer app-style PDF.
The exported PDF title must be "Action Plan"; do not title the document "AI Action Plan".
The existing action_plan and action_plan_items are the primary source. Transform, group, shorten, and organize those items only.
Do not create a new action plan, do not create replacement action items, and do not invent priorities unrelated to the existing action_plan_items.
Use linked audit facts only as supporting evidence for store identity, score, comments, critical issues, and wins.
Never invent store facts, dates, scores, bonus status, question results, people, or photo evidence.
Do not mention internal database IDs in user-facing fields except source.action_plan_id and source.audit_id, which are required structured source fields.
Do not change, recalculate, or reinterpret official audit scores.
Keep the Outstanding Card bonus separate from the core score.
Generate exactly 3 action_areas. If there are fewer source action items, group the available items without inventing unrelated work.
Use practical action verbs. Avoid corporate filler.
Keep section/card titles to 8 words or fewer where practical.
For action_areas, use titles of 5 to 6 words or fewer where practical.
Action_area titles must be complete phrases and must not end with "and", "or", "at", "to", "&", or "with".
For each action_area, write exactly 2 or 3 short action bullets. Each bullet should be a direct operational action.
For action_area goals, use one poster-ready sentence of 55 characters or fewer.
Shorten feedback_summary before shortening action bullets or goals.
Make wins titles short, complete, and specific. Do not end titles with "and", "or", "&", "to", or "with".
Keep wins details to 1 or 2 short lines.
Keep action bullets to 10 words or fewer where practical.
Keep feedback summaries to one compact sentence.
Keep closing_message to one concise sentence.
Do not generate visual concepts, location-themed background ideas, or decorative wording unless it is actual store/location data.
Prioritize readable one-page app-style layout over exhaustive detail.
All schema fields must be present. Use null for nullable fields when no value applies; never omit fields.
Do not use markdown syntax in any field.
`.trim()

function validationSummary(error: ZodError) {
  return error.issues.slice(0, 8).map((issue) => ({
    path: issue.path.join('.'),
    code: issue.code,
    message: issue.message,
  }))
}

function safeGenerationErrorDetails(error: unknown) {
  if (!error || typeof error !== 'object') {
    return { message: String(error) }
  }

  const details = error as {
    name?: unknown
    message?: unknown
    status?: unknown
    code?: unknown
    type?: unknown
    param?: unknown
  }

  return {
    name: typeof details.name === 'string' ? details.name : undefined,
    message: typeof details.message === 'string' ? details.message : undefined,
    status: typeof details.status === 'number' ? details.status : undefined,
    code: typeof details.code === 'string' ? details.code : undefined,
    type: typeof details.type === 'string' ? details.type : undefined,
    param: typeof details.param === 'string' ? details.param : undefined,
  }
}

function withGroundedFacts(
  payload: AiActionPlanPdfPayload,
  context: AiActionPlanPdfContext
): AiActionPlanPdfPayload {
  const scoreFacts = aiActionPlanPdfScoreFacts(context)

  return {
    ...payload,
    report_kind: 'ai_action_plan_pdf',
    title: 'Action Plan',
    subtitle: 'Mystery Shopper Feedback & Goals',
    source: aiActionPlanPdfSourceFacts(context),
    score_overview: {
      ...payload.score_overview,
      ...scoreFacts,
      target_message:
        payload.score_overview.target_message ??
        'Focus the team on the highest-impact actions from the recorded plan.',
    },
    source_summary: {
      action_item_count: context.diagnostics.actionItemCount,
      low_score_question_count: context.diagnostics.lowScoreQuestionCount,
      critical_issue_count: context.diagnostics.criticalIssueCount,
      comment_count: context.diagnostics.commentCount,
      photo_evidence_count: context.diagnostics.photoEvidenceCount,
    },
  }
}

export async function generateAiActionPlanPdfPayload(
  context: AiActionPlanPdfContext
): Promise<GenerateAiActionPlanPdfPayloadResult> {
  const client = getOpenAIClient()

  let response: Awaited<ReturnType<typeof client.responses.parse>>

  try {
    response = await client.responses.parse({
      model: AI_ACTION_PLAN_MODEL,
      input: [
        {
          role: 'system',
          content: SYSTEM_PROMPT,
        },
        {
          role: 'user',
          content: JSON.stringify({
            task: 'Generate a structured AI Action Plan PDF payload.',
            promptVersion: AI_ACTION_PLAN_PDF_PROMPT_VERSION,
            immutableFacts: {
              source: aiActionPlanPdfSourceFacts(context),
              score_overview: aiActionPlanPdfScoreFacts(context),
              source_summary: context.diagnostics,
            },
            primarySource: {
              actionPlan: context.actionPlan,
            },
            supportingAuditFacts: {
              audit: context.audit,
              store: context.store,
              score: context.score,
              findings: context.sourceFindings,
              diagnostics: context.diagnostics,
            },
          }),
        },
      ],
      text: {
        format: zodTextFormat(
          AiActionPlanPdfPayloadSchema,
          'ai_action_plan_pdf_payload'
        ),
      },
    })
  } catch (error) {
    console.error('[ai-action-plan-pdf-generation]', {
      stage: 'openai-structured-output',
      model: AI_ACTION_PLAN_MODEL,
      actionPlanIdPresent: Boolean(context.actionPlan.id),
      auditIdPresent: Boolean(context.audit.id),
      error: safeGenerationErrorDetails(error),
    })
    throw new AiActionPlanPdfGenerationError(
      'AI Action Plan PDF generation request failed.'
    )
  }

  const parsed = response.output_parsed

  if (!parsed) {
    throw new AiActionPlanPdfGenerationError(
      'AI returned no structured Action Plan PDF payload.'
    )
  }

  const validated = AiActionPlanPdfPayloadSchema.safeParse(parsed)

  if (!validated.success) {
    console.error('[ai-action-plan-pdf-generation]', {
      stage: 'validate-model-output',
      model: AI_ACTION_PLAN_MODEL,
      actionPlanIdPresent: Boolean(context.actionPlan.id),
      auditIdPresent: Boolean(context.audit.id),
      issues: validationSummary(validated.error),
    })
    throw new AiActionPlanPdfGenerationError(
      'AI returned an invalid Action Plan PDF payload.'
    )
  }

  const groundedPayload = withGroundedFacts(validated.data, context)
  const groundedValidation =
    AiActionPlanPdfPayloadSchema.safeParse(groundedPayload)

  if (!groundedValidation.success) {
    console.error('[ai-action-plan-pdf-generation]', {
      stage: 'validate-grounded-output',
      model: AI_ACTION_PLAN_MODEL,
      actionPlanIdPresent: Boolean(context.actionPlan.id),
      auditIdPresent: Boolean(context.audit.id),
      issues: validationSummary(groundedValidation.error),
    })
    throw new AiActionPlanPdfGenerationError(
      'AI Action Plan PDF payload could not be grounded.'
    )
  }

  return {
    payload: groundedValidation.data,
    model: AI_ACTION_PLAN_MODEL,
  }
}
