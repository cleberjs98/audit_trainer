import { NextResponse } from 'next/server'

import { renderAiActionPlanPdf } from '@/lib/action-plans/render-ai-action-plan-pdf'
import { AiActionPlanPdfContextError } from '@/lib/ai/build-ai-action-plan-pdf-context'
import { AiActionPlanPdfGenerationError } from '@/lib/ai/generate-ai-action-plan-pdf-payload'
import { isMissingOpenAiApiKeyError } from '@/lib/ai/openai'
import {
  getOrCreateAiActionPlanPdfPayload,
  AiActionPlanPdfServiceError,
} from '@/lib/ai/ai-action-plan-pdf-service'
import { isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type SafeErrorDetails = {
  name?: string
  message?: string
  code?: string
  details?: string
  hint?: string
  status?: number
  type?: string
  param?: string
}

function sanitizeFileName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 90) || 'ai-action-plan'
  )
}

function safeErrorDetails(error: unknown): SafeErrorDetails {
  if (!error || typeof error !== 'object') {
    return { message: String(error) }
  }

  const details = error as {
    name?: unknown
    message?: unknown
    code?: unknown
    details?: unknown
    hint?: unknown
    status?: unknown
    type?: unknown
    param?: unknown
  }

  return {
    name: typeof details.name === 'string' ? details.name : undefined,
    message: typeof details.message === 'string' ? details.message : undefined,
    code: typeof details.code === 'string' ? details.code : undefined,
    details: typeof details.details === 'string' ? details.details : undefined,
    hint: typeof details.hint === 'string' ? details.hint : undefined,
    status: typeof details.status === 'number' ? details.status : undefined,
    type: typeof details.type === 'string' ? details.type : undefined,
    param: typeof details.param === 'string' ? details.param : undefined,
  }
}

function logRouteError({
  error,
  actionPlanId,
  stage,
}: {
  error: unknown
  actionPlanId: string
  stage: string
}) {
  console.error('[ai-action-plan-pdf-route]', {
    route: 'GET /action-plans/[actionPlanId]/ai-pdf',
    stage,
    actionPlanIdPresent: Boolean(actionPlanId),
    error: safeErrorDetails(error),
  })
}

function errorResponse(error: unknown) {
  if (isMissingOpenAiApiKeyError(error)) {
    return new Response('AI generation is not configured yet.', { status: 503 })
  }

  if (error instanceof AiActionPlanPdfServiceError) {
    if (
      error.code === 'not_found' ||
      error.code === 'not_completed' ||
      error.code === 'unauthorized' ||
      error.code === 'invalid_action_plan'
    ) {
      return new Response('Not found', { status: 404 })
    }

    if (error.code === 'database_not_ready') {
      return new Response('AI Action Plan PDF database setup is not ready.', {
        status: 503,
      })
    }

    return new Response('Could not generate AI Action Plan PDF.', {
      status: 500,
    })
  }

  if (error instanceof AiActionPlanPdfContextError) {
    return new Response('Not found', { status: 404 })
  }

  if (error instanceof AiActionPlanPdfGenerationError) {
    return new Response('AI returned an invalid Action Plan PDF payload.', {
      status: 502,
    })
  }

  return new Response('Could not generate AI Action Plan PDF.', {
    status: 500,
  })
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ actionPlanId: string }> }
) {
  const { actionPlanId } = await params
  let stage = 'authenticate'
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return new Response('Not found', { status: 404 })
  }

  stage = 'load-profile'
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, store_id, area_id, created_at, updated_at')
    .eq('id', user.id)
    .single<ProfileRow>()

  if (profileError || !profile || !isUserRole(profile.role)) {
    if (profileError) {
      logRouteError({ error: profileError, actionPlanId, stage })
    }
    return new Response('Not found', { status: 404 })
  }

  try {
    stage = 'get-or-create-payload'
    const result = await getOrCreateAiActionPlanPdfPayload({
      supabase,
      profile,
      actionPlanId,
    })
    stage = 'render-pdf'
    const pdf = await renderAiActionPlanPdf(result.payload)
    const storeName = result.payload.source.store_name
    const date = result.payload.source.date_label ?? 'completed'
    const fileName = `${sanitizeFileName(storeName)}-${sanitizeFileName(
      date
    )}-ai-action-plan.pdf`

    return new NextResponse(new Uint8Array(pdf), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error) {
    logRouteError({ error, actionPlanId, stage })
    return errorResponse(error)
  }
}
