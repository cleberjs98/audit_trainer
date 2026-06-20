import 'server-only'

import {
  buildAiActionPlanPdfContext,
  type AiActionPlanPdfContext,
} from '@/lib/ai/build-ai-action-plan-pdf-context'
import {
  AI_ACTION_PLAN_PDF_PROMPT_VERSION,
  generateAiActionPlanPdfPayload,
} from '@/lib/ai/generate-ai-action-plan-pdf-payload'
import { createAiInputHash } from '@/lib/ai/hash'
import {
  AiActionPlanPdfPayloadSchema,
  type AiActionPlanPdfPayload,
} from '@/lib/ai/schemas'
import type { ProfileRow } from '@/lib/auth/profile'
import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type StoreScopeRow = {
  id: string
  area_id: string
}

type ActionPlanScopeRow = {
  id: string
  audit_id: string | null
  store_id: string
}

type CachedAiActionPlanPdfInsightRow = {
  id: string
  input_hash: string
  payload: unknown
}

type CreatedAiActionPlanPdfInsightRow = {
  id: string
}

type SupabaseDiagnosticError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

export type AiActionPlanPdfPayloadResult = {
  aiInsightId: string
  inputHash: string
  payload: AiActionPlanPdfPayload
  reusedCachedPayload: boolean
  context: AiActionPlanPdfContext
}

export class AiActionPlanPdfServiceError extends Error {
  constructor(
    message: string,
    public readonly code:
      | 'invalid_action_plan'
      | 'not_found'
      | 'not_completed'
      | 'unauthorized'
      | 'generation_failed'
      | 'database_not_ready'
      | 'save_failed'
  ) {
    super(message)
    this.name = 'AiActionPlanPdfServiceError'
  }
}

function canAccessStore(profile: ProfileRow, store: StoreScopeRow) {
  if (profile.role === 'admin') {
    return true
  }

  if (profile.role === 'area_manager') {
    return Boolean(profile.area_id && store.area_id === profile.area_id)
  }

  if (profile.role === 'store_manager' || profile.role === 'leader') {
    return Boolean(profile.store_id && store.id === profile.store_id)
  }

  return false
}

function isDatabaseSetupError(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? ''

  return (
    error.code === '22P02' ||
    error.code === '42704' ||
    error.code === '42P01' ||
    message.includes('ai_action_plan_pdf') ||
    message.includes('invalid input value for enum') ||
    message.includes('ai_insights')
  )
}

function writeErrorMessage(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? ''

  if (
    error.code === '42501' ||
    message.includes('permission') ||
    message.includes('access denied')
  ) {
    return 'You do not have permission to save AI Action Plan PDF content.'
  }

  if (isDatabaseSetupError(error)) {
    return 'AI Action Plan PDF database setup is not ready. Apply migration 021, then try again.'
  }

  return 'Could not save AI Action Plan PDF content. Try again later.'
}

function logSupabaseError({
  stage,
  actionPlanId,
  auditId,
  error,
}: {
  stage: string
  actionPlanId: string
  auditId: string | null
  error: SupabaseDiagnosticError
}) {
  console.error('[ai-action-plan-pdf-service]', {
    stage,
    actionPlanIdPresent: Boolean(actionPlanId),
    auditIdPresent: Boolean(auditId),
    error: {
      code: error.code,
      message: error.message,
      details: error.details,
      hint: error.hint,
    },
  })
}

export async function getOrCreateAiActionPlanPdfPayload({
  supabase,
  profile,
  actionPlanId,
}: {
  supabase: SupabaseServerClient
  profile: ProfileRow
  actionPlanId: string
}): Promise<AiActionPlanPdfPayloadResult> {
  const cleanActionPlanId = actionPlanId.trim()

  if (!cleanActionPlanId) {
    throw new AiActionPlanPdfServiceError(
      'Action plan id is required.',
      'invalid_action_plan'
    )
  }

  const { data: plan, error: planError } = await supabase
    .from('action_plans')
    .select('id, audit_id, store_id')
    .eq('id', cleanActionPlanId)
    .single<ActionPlanScopeRow>()

  if (planError || !plan) {
    if (planError) {
      logSupabaseError({
        stage: 'load-action-plan',
        actionPlanId: cleanActionPlanId,
        auditId: null,
        error: planError,
      })
    }
    throw new AiActionPlanPdfServiceError(
      'Action plan not found or access denied.',
      'not_found'
    )
  }

  if (!plan.audit_id) {
    throw new AiActionPlanPdfServiceError(
      'AI Action Plan PDF requires a linked completed audit.',
      'not_found'
    )
  }

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, area_id')
    .eq('id', plan.store_id)
    .single<StoreScopeRow>()

  if (storeError || !store || !canAccessStore(profile, store)) {
    if (storeError) {
      logSupabaseError({
        stage: 'load-store-scope',
        actionPlanId: plan.id,
        auditId: plan.audit_id,
        error: storeError,
      })
    }
    throw new AiActionPlanPdfServiceError(
      'You do not have permission to generate content for this action plan.',
      'unauthorized'
    )
  }

  const context = await buildAiActionPlanPdfContext(supabase, plan.id)
  const inputHash = createAiInputHash({
    promptVersion: AI_ACTION_PLAN_PDF_PROMPT_VERSION,
    actionPlanId: plan.id,
    auditId: plan.audit_id,
    context,
  })

  const { data: cachedRows, error: cacheError } = await supabase
    .from('ai_insights')
    .select('id, input_hash, payload')
    .eq('audit_id', plan.audit_id)
    .eq('scope_type', 'audit')
    .eq('insight_type', 'ai_action_plan_pdf')
    .eq('status', 'generated')
    .eq('prompt_version', AI_ACTION_PLAN_PDF_PROMPT_VERSION)
    .eq('input_hash', inputHash)
    .contains('source_action_plan_ids', [plan.id])
    .order('generated_at', { ascending: false })
    .limit(1)
    .returns<CachedAiActionPlanPdfInsightRow[]>()

  if (cacheError && isDatabaseSetupError(cacheError)) {
    logSupabaseError({
      stage: 'cache-lookup',
      actionPlanId: plan.id,
      auditId: plan.audit_id,
      error: cacheError,
    })
    throw new AiActionPlanPdfServiceError(
      writeErrorMessage(cacheError),
      'database_not_ready'
    )
  }

  if (cacheError) {
    logSupabaseError({
      stage: 'cache-lookup-non-blocking',
      actionPlanId: plan.id,
      auditId: plan.audit_id,
      error: cacheError,
    })
  }

  if (!cacheError && cachedRows && cachedRows.length > 0) {
    const cached = cachedRows[0]
    const validatedCached = AiActionPlanPdfPayloadSchema.safeParse(
      cached.payload
    )

    if (validatedCached.success) {
      return {
        aiInsightId: cached.id,
        inputHash: cached.input_hash,
        payload: validatedCached.data,
        reusedCachedPayload: true,
        context,
      }
    }
  }

  const generated = await generateAiActionPlanPdfPayload(context)

  const { data: createdInsight, error: insertError } = await supabase
    .from('ai_insights')
    .insert({
      insight_type: 'ai_action_plan_pdf',
      scope_type: 'audit',
      audit_id: context.audit.id,
      store_id: context.store.id,
      area_id: context.store.areaId,
      source_audit_ids: [context.audit.id],
      source_action_plan_ids: [context.actionPlan.id],
      input_hash: inputHash,
      prompt_version: AI_ACTION_PLAN_PDF_PROMPT_VERSION,
      model: generated.model,
      payload: generated.payload,
      status: 'generated',
      generated_by: profile.id,
    })
    .select('id')
    .single<CreatedAiActionPlanPdfInsightRow>()

  if (insertError || !createdInsight) {
    if (insertError) {
      logSupabaseError({
        stage: 'insert-ai-insight',
        actionPlanId: context.actionPlan.id,
        auditId: context.audit.id,
        error: insertError,
      })
    }
    throw new AiActionPlanPdfServiceError(
      insertError
        ? writeErrorMessage(insertError)
        : 'Could not save AI Action Plan PDF content. Try again later.',
      insertError && isDatabaseSetupError(insertError)
        ? 'database_not_ready'
        : 'save_failed'
    )
  }

  return {
    aiInsightId: createdInsight.id,
    inputHash,
    payload: generated.payload,
    reusedCachedPayload: false,
    context,
  }
}
