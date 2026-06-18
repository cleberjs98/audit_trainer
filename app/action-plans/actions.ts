'use server'

import { revalidatePath } from 'next/cache'

import type {
  ActionItemStatus,
  ActionPlanActionState,
  ActionPlanItemPayload,
  ActionPlanStatus,
  ActionPriority,
} from '@/components/action-plans/types'
import {
  buildCompletedAuditAiContext,
  AuditAiContextError,
} from '@/lib/ai/build-audit-ai-context'
import {
  generateAuditActionPlan,
  AI_ACTION_PLAN_PROMPT_VERSION,
  AiGenerationError,
} from '@/lib/ai/generate-audit-action-plan'
import { createAiInputHash } from '@/lib/ai/hash'
import { isMissingOpenAiApiKeyError } from '@/lib/ai/openai'
import type { AiActionPlanPayload } from '@/lib/ai/schemas'
import { isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'

const ACTION_PRIORITIES = ['low', 'medium', 'high'] as const
const ACTION_ITEM_STATUSES = ['open', 'in_progress', 'completed'] as const
const ACTION_PLAN_STATUSES = ['open', 'in_progress', 'completed'] as const

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type StoreScopeRow = {
  id: string
  area_id: string
}

type AuditForPlanRow = {
  id: string
  store_id: string
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
}

type ActionPlanScopeRow = {
  id: string
  audit_id: string
  store_id: string
  status: ActionPlanStatus
  generated_by_ai: boolean
}

type ActionPlanItemScopeRow = {
  id: string
  action_plan_id: string
}

type ExistingPlanRow = {
  id: string
}

type CreateAiActionPlanRpcRow = {
  action_plan_id: string
  ai_insight_id: string
}

type GenerateAiActionPlanState = {
  success: boolean
  status: 'success' | 'error'
  message: string
  actionPlanId?: string
  aiInsightId?: string
}

function errorState(message: string): ActionPlanActionState {
  return { status: 'error', message }
}

function successState(
  message: string,
  actionPlanId?: string
): ActionPlanActionState {
  return { status: 'success', message, actionPlanId }
}

function aiSuccessState({
  message,
  actionPlanId,
  aiInsightId,
}: {
  message: string
  actionPlanId: string
  aiInsightId: string
}): GenerateAiActionPlanState {
  return { success: true, status: 'success', message, actionPlanId, aiInsightId }
}

function aiErrorState(
  message: string,
  actionPlanId?: string
): GenerateAiActionPlanState {
  return { success: false, status: 'error', message, actionPlanId }
}

function isActionPriority(value: string): value is ActionPriority {
  return ACTION_PRIORITIES.includes(value as ActionPriority)
}

function isActionItemStatus(value: string): value is ActionItemStatus {
  return ACTION_ITEM_STATUSES.includes(value as ActionItemStatus)
}

function isActionPlanStatus(value: string): value is ActionPlanStatus {
  return ACTION_PLAN_STATUSES.includes(value as ActionPlanStatus)
}

function cleanOptional(value: string) {
  const trimmed = value.trim()

  return trimmed.length > 0 ? trimmed : null
}

function validateDate(value: string) {
  const trimmed = value.trim()

  if (!trimmed) {
    return null
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return 'Due date must use YYYY-MM-DD format.'
  }

  return null
}

function validatePayload(payload: ActionPlanItemPayload) {
  const actionDescription = payload.actionDescription.trim()
  const dueDateError = validateDate(payload.dueDate)

  if (!actionDescription) {
    return {
      error: 'Action description is required.',
      value: null,
    }
  }

  if (!isActionPriority(payload.priority)) {
    return {
      error: 'Choose a valid priority.',
      value: null,
    }
  }

  if (!isActionItemStatus(payload.status)) {
    return {
      error: 'Choose a valid item status.',
      value: null,
    }
  }

  if (dueDateError) {
    return {
      error: dueDateError,
      value: null,
    }
  }

  return {
    error: null,
    value: {
      action_description: actionDescription,
      owner: cleanOptional(payload.owner),
      priority: payload.priority,
      due_date: cleanOptional(payload.dueDate),
      success_measure: cleanOptional(payload.successMeasure),
      status: payload.status,
    },
  }
}

function aiGenerationErrorMessage(error: unknown) {
  if (isMissingOpenAiApiKeyError(error)) {
    return 'AI generation is not configured yet. Add OPENAI_API_KEY on the server.'
  }

  if (error instanceof AuditAiContextError) {
    return error.message
  }

  if (error instanceof AiGenerationError) {
    return 'AI returned an invalid action plan. Try again later.'
  }

  return 'Could not generate an AI action plan. Try again later.'
}

function aiRpcErrorMessage(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? ''

  if (
    error.code === '23505' ||
    message.includes('already exists') ||
    message.includes('duplicate')
  ) {
    return 'This audit already has an action plan.'
  }

  if (
    error.code === '42501' ||
    message.includes('permission') ||
    message.includes('access denied')
  ) {
    return 'You do not have permission to generate a plan for this audit.'
  }

  if (message.includes('completed audits') || message.includes('completed')) {
    return 'AI action plans can only be generated for completed audits.'
  }

  if (message.includes('action items') || message.includes('payload')) {
    return 'AI returned an invalid action plan. Try again later.'
  }

  return 'Could not save the AI action plan. Try again later.'
}

async function getAuthenticatedProfile(
  supabase: SupabaseServerClient,
  signedOutMessage: string
) {
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return {
      profile: null,
      error: signedOutMessage,
    }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, store_id, area_id, created_at, updated_at')
    .eq('id', user.id)
    .single<ProfileRow>()

  if (error || !profile || !isUserRole(profile.role)) {
    return {
      profile: null,
      error: 'Your profile is not ready for action plan management.',
    }
  }

  return { profile, error: null }
}

function canManageStore(profile: ProfileRow, store: StoreScopeRow) {
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

async function loadStoreScope(
  supabase: SupabaseServerClient,
  storeId: string
) {
  const { data: store, error } = await supabase
    .from('stores')
    .select('id, area_id')
    .eq('id', storeId)
    .single<StoreScopeRow>()

  if (error || !store) {
    return null
  }

  return store
}

async function loadPlanForManagement(
  supabase: SupabaseServerClient,
  profile: ProfileRow,
  actionPlanId: string
) {
  const { data: plan, error } = await supabase
    .from('action_plans')
    .select('id, audit_id, store_id, status, generated_by_ai')
    .eq('id', actionPlanId)
    .single<ActionPlanScopeRow>()

  if (error || !plan) {
    return {
      plan: null,
      error: 'Action plan not found or access denied.',
    }
  }

  const store = await loadStoreScope(supabase, plan.store_id)

  if (!store || !canManageStore(profile, store)) {
    return {
      plan: null,
      error: 'You do not have permission to update this action plan.',
    }
  }

  if (plan.status === 'completed' && profile.role !== 'admin') {
    return {
      plan: null,
      error: 'Completed action plans are read-only.',
    }
  }

  return { plan, error: null }
}

export async function createActionPlanForAuditAction(
  auditId: string
): Promise<ActionPlanActionState> {
  const cleanAuditId = auditId.trim()

  if (!cleanAuditId) {
    return errorState('Audit id is required.')
  }

  const supabase = await createClient()
  const { profile, error: accessError } = await getAuthenticatedProfile(
    supabase,
    'You must be signed in to create an action plan.'
  )

  if (accessError || !profile) {
    return errorState(accessError ?? 'You cannot create this action plan.')
  }

  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('id, store_id, status')
    .eq('id', cleanAuditId)
    .single<AuditForPlanRow>()

  if (auditError || !audit) {
    return errorState('Audit not found or access denied.')
  }

  if (audit.status !== 'completed') {
    return errorState('Action plans can only be created for completed audits.')
  }

  const store = await loadStoreScope(supabase, audit.store_id)

  if (!store || !canManageStore(profile, store)) {
    return errorState('You do not have permission to create a plan for this audit.')
  }

  const { data: existingPlan } = await supabase
    .from('action_plans')
    .select('id')
    .eq('audit_id', audit.id)
    .maybeSingle<ExistingPlanRow>()

  if (existingPlan) {
    revalidatePath(`/audits/${audit.id}`)
    revalidatePath('/action-plans')

    return successState('This audit already has an action plan.', existingPlan.id)
  }

  const { data: createdPlan, error: insertError } = await supabase
    .from('action_plans')
    .insert({
      audit_id: audit.id,
      store_id: audit.store_id,
      generated_by_ai: false,
      status: 'open',
      focus_area: 'Manual Action Plan',
      summary: 'Manual action plan created for completed audit.',
    })
    .select('id')
    .single<ExistingPlanRow>()

  if (insertError || !createdPlan) {
    if (insertError?.code === '23505') {
      return errorState('This audit already has an action plan.')
    }

    return errorState(insertError?.message ?? 'Could not create action plan.')
  }

  revalidatePath(`/audits/${audit.id}`)
  revalidatePath('/action-plans')
  revalidatePath(`/action-plans/${createdPlan.id}`)

  return successState('Action plan created successfully.', createdPlan.id)
}

export async function generateAiActionPlanForAuditAction(
  auditId: string
): Promise<GenerateAiActionPlanState> {
  const cleanAuditId = auditId.trim()

  if (!cleanAuditId) {
    return aiErrorState('Audit id is required.')
  }

  const supabase = await createClient()
  const { profile, error: accessError } = await getAuthenticatedProfile(
    supabase,
    'You must be signed in to generate an AI action plan.'
  )

  if (accessError || !profile) {
    return aiErrorState(accessError ?? 'You cannot generate this action plan.')
  }

  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select('id, store_id, status')
    .eq('id', cleanAuditId)
    .single<AuditForPlanRow>()

  if (auditError || !audit) {
    return aiErrorState('Audit not found or access denied.')
  }

  if (audit.status !== 'completed') {
    return aiErrorState(
      'AI action plans can only be generated for completed audits.'
    )
  }

  const store = await loadStoreScope(supabase, audit.store_id)

  if (!store || !canManageStore(profile, store)) {
    return aiErrorState(
      'You do not have permission to generate a plan for this audit.'
    )
  }

  const { data: existingPlan } = await supabase
    .from('action_plans')
    .select('id')
    .eq('audit_id', audit.id)
    .maybeSingle<ExistingPlanRow>()

  if (existingPlan) {
    revalidatePath(`/audits/${audit.id}`)
    revalidatePath('/action-plans')
    revalidatePath(`/action-plans/${existingPlan.id}`)

    return {
      success: false,
      status: 'error',
      message: 'This audit already has an action plan.',
      actionPlanId: existingPlan.id,
    }
  }

  let aiPayload: AiActionPlanPayload
  let aiModel: string
  let inputHash: string

  try {
    const context = await buildCompletedAuditAiContext(supabase, audit.id)

    inputHash = createAiInputHash(context)

    const generated = await generateAuditActionPlan(context)

    aiPayload = generated.payload
    aiModel = generated.model
  } catch (error) {
    return aiErrorState(aiGenerationErrorMessage(error))
  }

  const { data: created, error: rpcError } = await supabase
    .rpc('create_ai_action_plan_v1', {
      p_audit_id: audit.id,
      p_input_hash: inputHash,
      p_prompt_version: AI_ACTION_PLAN_PROMPT_VERSION,
      p_model: aiModel,
      p_payload: aiPayload,
    })
    .single<CreateAiActionPlanRpcRow>()

  if (rpcError || !created) {
    return aiErrorState(
      rpcError
        ? aiRpcErrorMessage(rpcError)
        : 'Could not save the AI action plan. Try again later.'
    )
  }

  revalidatePath(`/audits/${audit.id}`)
  revalidatePath('/action-plans')
  revalidatePath(`/action-plans/${created.action_plan_id}`)
  revalidatePath('/dashboard')

  return aiSuccessState({
    message: 'AI action plan generated successfully.',
    actionPlanId: created.action_plan_id,
    aiInsightId: created.ai_insight_id,
  })
}

export async function createActionPlanItemAction(
  actionPlanId: string,
  payload: ActionPlanItemPayload
): Promise<ActionPlanActionState> {
  const cleanActionPlanId = actionPlanId.trim()

  if (!cleanActionPlanId) {
    return errorState('Action plan id is required.')
  }

  const validated = validatePayload(payload)

  if (validated.error || !validated.value) {
    return errorState(validated.error ?? 'Check the action item details.')
  }

  const supabase = await createClient()
  const { profile, error: accessError } = await getAuthenticatedProfile(
    supabase,
    'You must be signed in to create action items.'
  )

  if (accessError || !profile) {
    return errorState(accessError ?? 'You cannot create this action item.')
  }

  const { plan, error } = await loadPlanForManagement(
    supabase,
    profile,
    cleanActionPlanId
  )

  if (error || !plan) {
    return errorState(error ?? 'You cannot create this action item.')
  }

  if (plan.status === 'completed') {
    return errorState('Completed action plans are read-only.')
  }

  const { error: insertError } = await supabase
    .from('action_plan_items')
    .insert({
      action_plan_id: plan.id,
      ...validated.value,
    })

  if (insertError) {
    return errorState(insertError.message ?? 'Could not create action item.')
  }

  revalidatePath('/action-plans')
  revalidatePath(`/action-plans/${plan.id}`)

  return successState('Action item created successfully.', plan.id)
}

export async function updateActionPlanItemAction(
  itemId: string,
  payload: ActionPlanItemPayload
): Promise<ActionPlanActionState> {
  const cleanItemId = itemId.trim()

  if (!cleanItemId) {
    return errorState('Action item id is required.')
  }

  const validated = validatePayload(payload)

  if (validated.error || !validated.value) {
    return errorState(validated.error ?? 'Check the action item details.')
  }

  const supabase = await createClient()
  const { profile, error: accessError } = await getAuthenticatedProfile(
    supabase,
    'You must be signed in to update action items.'
  )

  if (accessError || !profile) {
    return errorState(accessError ?? 'You cannot update this action item.')
  }

  const { data: item, error: itemError } = await supabase
    .from('action_plan_items')
    .select('id, action_plan_id')
    .eq('id', cleanItemId)
    .single<ActionPlanItemScopeRow>()

  if (itemError || !item) {
    return errorState('Action item not found or access denied.')
  }

  const { plan, error } = await loadPlanForManagement(
    supabase,
    profile,
    item.action_plan_id
  )

  if (error || !plan) {
    return errorState(error ?? 'You cannot update this action item.')
  }

  if (plan.status === 'completed') {
    return errorState('Completed action plans are read-only.')
  }

  const { error: updateError } = await supabase
    .from('action_plan_items')
    .update(validated.value)
    .eq('id', item.id)

  if (updateError) {
    return errorState(updateError.message ?? 'Could not update action item.')
  }

  revalidatePath('/action-plans')
  revalidatePath(`/action-plans/${plan.id}`)

  return successState('Action item updated successfully.', plan.id)
}

export async function updateActionPlanItemStatusAction(
  itemId: string,
  status: ActionItemStatus
): Promise<ActionPlanActionState> {
  const cleanItemId = itemId.trim()

  if (!cleanItemId) {
    return errorState('Action item id is required.')
  }

  if (!isActionItemStatus(status)) {
    return errorState('Choose a valid item status.')
  }

  const supabase = await createClient()
  const { profile, error: accessError } = await getAuthenticatedProfile(
    supabase,
    'You must be signed in to update action items.'
  )

  if (accessError || !profile) {
    return errorState(accessError ?? 'You cannot update this action item.')
  }

  const { data: item, error: itemError } = await supabase
    .from('action_plan_items')
    .select('id, action_plan_id')
    .eq('id', cleanItemId)
    .single<ActionPlanItemScopeRow>()

  if (itemError || !item) {
    return errorState('Action item not found or access denied.')
  }

  const { plan, error } = await loadPlanForManagement(
    supabase,
    profile,
    item.action_plan_id
  )

  if (error || !plan) {
    return errorState(error ?? 'You cannot update this action item.')
  }

  if (plan.status === 'completed') {
    return errorState('Completed action plans are read-only.')
  }

  const { error: updateError } = await supabase
    .from('action_plan_items')
    .update({ status })
    .eq('id', item.id)

  if (updateError) {
    return errorState(updateError.message ?? 'Could not update item status.')
  }

  revalidatePath('/action-plans')
  revalidatePath(`/action-plans/${plan.id}`)

  return successState('Action item status updated.', plan.id)
}

export async function updateActionPlanStatusAction(
  actionPlanId: string,
  status: ActionPlanStatus
): Promise<ActionPlanActionState> {
  const cleanActionPlanId = actionPlanId.trim()

  if (!cleanActionPlanId) {
    return errorState('Action plan id is required.')
  }

  if (!isActionPlanStatus(status)) {
    return errorState('Choose a valid action plan status.')
  }

  const supabase = await createClient()
  const { profile, error: accessError } = await getAuthenticatedProfile(
    supabase,
    'You must be signed in to update action plans.'
  )

  if (accessError || !profile) {
    return errorState(accessError ?? 'You cannot update this action plan.')
  }

  const { plan, error } = await loadPlanForManagement(
    supabase,
    profile,
    cleanActionPlanId
  )

  if (error || !plan) {
    return errorState(error ?? 'You cannot update this action plan.')
  }

  const { error: updateError } = await supabase
    .from('action_plans')
    .update({ status })
    .eq('id', plan.id)

  if (updateError) {
    return errorState(updateError.message ?? 'Could not update action plan.')
  }

  revalidatePath('/action-plans')
  revalidatePath(`/action-plans/${plan.id}`)

  return successState('Action plan status updated.', plan.id)
}
