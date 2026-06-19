'use server'

import { revalidatePath } from 'next/cache'

import type {
  AuditPeopleValues,
  CompleteAuditState,
  MissingAuditPersonRequirement,
  SaveAuditPeopleState,
  SaveAnswerState,
} from '@/components/checklist/types'
import {
  findMissingAuditPeople,
  normalizeAuditPersonName,
} from '@/lib/audits/audit-people'
import {
  findMissingCommentRequirements,
  type MissingCommentRequirement,
} from '@/lib/audits/comment-requirements'
import { isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'

type AuditAccessRow = {
  id: string
  store_id: string
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  is_locked: boolean
  scoring_model_version?: string | null
}

type CompletedAuditCheckRow = {
  id: string
  status: AuditAccessRow['status']
  is_locked: boolean
  completed_at: string | null
  total_score: number | string
  max_score: number | string
  section_scores: unknown
}

type StoreScopeRow = {
  id: string
  area_id: string
}

type QuestionRow = {
  id: string
  section_id: string
  question_text: string
  max_score: number
  is_active: boolean
  scoring_group?: 'core' | 'bonus' | null
  response_type?: 'score' | 'boolean_score' | null
  required_for_completion?: boolean | null
  scoring_model_version?: string | null
}

type SectionRow = {
  id: string
  title: string
  is_active: boolean
}

type CompletionQuestionRow = {
  id: string
  question_text: string
  max_score: number
  scoring_group: 'core' | 'bonus'
  display_number: number | null
}

type CompletionAnswerRow = {
  question_id: string
  score: number | string | null
  comment: string | null
  is_critical_flag: boolean
}

type AuditPersonRow = {
  person_type: 'team_member' | 'barista' | 'mod'
  typed_name: string
  team_member_id?: string | null
}

type SupabaseActionError = {
  code?: string
  message?: string
  details?: string
  hint?: string
}

type SaveAnswerAccess =
  | {
      ok: true
      supabase: Awaited<ReturnType<typeof createClient>>
      profile: ProfileRow
    }
  | {
      ok: false
      error: string
    }

async function getSaveAnswerAccess(
  signedOutMessage = 'You must be signed in to save answers.'
): Promise<SaveAnswerAccess> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { ok: false, error: signedOutMessage }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, store_id, area_id, created_at, updated_at')
    .eq('id', user.id)
    .single<ProfileRow>()

  if (error || !profile || !isUserRole(profile.role)) {
    return { ok: false, error: 'Your profile is not ready for this action.' }
  }

  return { ok: true, supabase, profile }
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? '').trim()
}

function isEditableAudit(status: AuditAccessRow['status'], isLocked: boolean) {
  return !isLocked && (status === 'draft' || status === 'in_progress')
}

async function canAccessAudit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: ProfileRow,
  audit: AuditAccessRow
) {
  if (profile.role === 'admin') {
    return true
  }

  if (profile.role === 'store_manager' || profile.role === 'leader') {
    return Boolean(profile.store_id) && audit.store_id === profile.store_id
  }

  if (profile.role === 'area_manager') {
    if (!profile.area_id) {
      return false
    }

    const { data: store, error } = await supabase
      .from('stores')
      .select('id, area_id')
      .eq('id', audit.store_id)
      .single<StoreScopeRow>()

    return !error && store?.area_id === profile.area_id
  }

  return false
}

function parseScore(value: string, maxScore: number) {
  if (!value) {
    return { ok: false as const, error: 'Enter a score or mark the question N/A.' }
  }

  const score = Number(value)

  if (!Number.isFinite(score)) {
    return { ok: false as const, error: 'Enter a valid score.' }
  }

  if (score < 0 || score > maxScore) {
    return {
      ok: false as const,
      error: `Score must be between 0 and ${maxScore}.`,
    }
  }

  return { ok: true as const, score }
}

function parseAnswerScore({
  value,
  maxScore,
  isNa,
  scoringGroup,
  responseType,
  scoringModelVersion,
}: {
  value: string
  maxScore: number
  isNa: boolean
  scoringGroup: QuestionRow['scoring_group']
  responseType: QuestionRow['response_type']
  scoringModelVersion: string
}) {
  const isPretModel = scoringModelVersion === 'pret_ce_v1'

  if (isPretModel && isNa) {
    if (scoringGroup === 'bonus') {
      return {
        ok: false as const,
        error: 'Outstanding Card bonus cannot be marked N/A.',
      }
    }

    return {
      ok: false as const,
      error: 'Core score questions cannot be marked N/A.',
    }
  }

  if (isNa) {
    return { ok: true as const, score: null }
  }

  const scoreResult = parseScore(value, maxScore)

  if (!scoreResult.ok) {
    return scoreResult
  }

  if (
    responseType === 'boolean_score' &&
    scoreResult.score !== 0 &&
    scoreResult.score !== maxScore
  ) {
    return {
      ok: false as const,
      error: `This bonus question only allows 0 or ${maxScore}.`,
    }
  }

  return scoreResult
}

function answerWriteErrorMessage(error: { code?: string; message?: string }) {
  if (error.code === '42501') {
    return 'You do not have permission to save this answer.'
  }

  if (error.code === '23514') {
    return 'The answer does not match the allowed score rules.'
  }

  if (error.code === '23503') {
    return 'The audit or question could not be found.'
  }

  return 'Could not save this answer. Check the details and try again.'
}

function completionErrorMessage(error: { code?: string; message?: string }) {
  const message = error.message?.toLowerCase() ?? ''

  if (
    error.code === '42501' ||
    message.includes('access denied') ||
    message.includes('permission')
  ) {
    return 'You do not have permission to complete this audit.'
  }

  if (message.includes('required questions missing answers')) {
    return 'Please complete all required questions before finishing the audit.'
  }

  if (message.includes('invalid answer score')) {
    return 'One or more answers has an invalid score. Review the checklist and try again.'
  }

  if (
    message.includes('already locked') ||
    message.includes('completed') ||
    message.includes('locked')
  ) {
    return 'This audit is already locked or completed.'
  }

  if (message.includes('no scorable answers')) {
    return 'Add at least one scored answer before completing the audit.'
  }

  if (message.includes('authentication required')) {
    return 'You must be signed in to complete this audit.'
  }

  return 'Could not complete this audit. Review the checklist and try again.'
}

function safeSupabaseErrorSummary(error: SupabaseActionError) {
  return {
    code: error.code ?? null,
    message: error.message ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  }
}

function auditPeopleWriteErrorMessage(error: SupabaseActionError) {
  const message = error.message?.toLowerCase() ?? ''
  const details = error.details?.toLowerCase() ?? ''
  const hint = error.hint?.toLowerCase() ?? ''

  if (
    error.code === 'PGRST202' ||
    error.code === '42P01' ||
    message.includes('save_audit_people_v1') ||
    message.includes('relation "public.audit_people" does not exist') ||
    message.includes('relation "public.store_team_members" does not exist') ||
    message.includes('schema cache') ||
    details.includes('save_audit_people_v1') ||
    hint.includes('schema cache')
  ) {
    return 'Audit people database setup is not ready. Apply migration 016, then try again.'
  }

  if (
    error.code === '42501' ||
    message.includes('permission') ||
    message.includes('access denied')
  ) {
    return 'You do not have permission to update people for this audit.'
  }

  if (
    message.includes('locked') ||
    message.includes('completed') ||
    message.includes('cannot be edited')
  ) {
    return 'This audit is locked and cannot be edited.'
  }

  if (
    message.includes('required') ||
    message.includes('120 characters') ||
    message.includes('name')
  ) {
    return 'Enter Team Member, Barista, and MOD names before saving.'
  }

  return 'Could not save people on duty. Check the names and try again.'
}

function toAuditPeopleValues(rows: AuditPersonRow[]): AuditPeopleValues {
  const people: AuditPeopleValues = {
    teamMemberName: '',
    baristaName: '',
    modName: '',
  }

  for (const row of rows) {
    if (row.person_type === 'team_member') {
      people.teamMemberName = row.typed_name
    } else if (row.person_type === 'barista') {
      people.baristaName = row.typed_name
    } else if (row.person_type === 'mod') {
      people.modName = row.typed_name
    }
  }

  return people
}

async function loadMissingCommentRequirements(
  supabase: Awaited<ReturnType<typeof createClient>>,
  auditId: string
): Promise<{
  ok: true
  missing: MissingCommentRequirement[]
} | {
  ok: false
  message: string
}> {
  const [{ data: questionRows, error: questionError }, { data: answerRows, error: answerError }] =
    await Promise.all([
      supabase
        .from('audit_questions')
        .select('id, question_text, max_score, scoring_group, display_number')
        .eq('is_active', true)
        .eq('scoring_model_version', 'pret_ce_v1')
        .in('scoring_group', ['core', 'bonus'])
        .returns<CompletionQuestionRow[]>(),
      supabase
        .from('audit_answers')
        .select('question_id, score, comment, is_critical_flag')
        .eq('audit_id', auditId)
        .returns<CompletionAnswerRow[]>(),
    ])

  if (questionError || answerError) {
    return {
      ok: false,
      message: 'Could not validate required comments. Review the checklist and try again.',
    }
  }

  const answersByQuestionId = new Map(
    (answerRows ?? []).map((answer) => [
      answer.question_id,
      {
        score: answer.score === null ? null : Number(answer.score),
        comment: answer.comment,
        isCriticalFlag: answer.is_critical_flag,
      },
    ])
  )

  const questions = (questionRows ?? []).map((question) => ({
    id: question.id,
    questionText: question.question_text,
    displayNumber: question.display_number,
    scoringGroup: question.scoring_group,
    maxScore: Number(question.max_score),
    answer: answersByQuestionId.get(question.id) ?? null,
  }))

  return {
    ok: true,
    missing: findMissingCommentRequirements(questions),
  }
}

async function loadMissingAuditPeople(
  supabase: Awaited<ReturnType<typeof createClient>>,
  auditId: string
): Promise<{
  ok: true
  missing: MissingAuditPersonRequirement[]
} | {
  ok: false
  message: string
}> {
  const { data, error } = await supabase
    .from('audit_people')
    .select('person_type, typed_name')
    .eq('audit_id', auditId)
    .returns<AuditPersonRow[]>()

  if (error) {
    console.error(
      '[audit_people] Could not validate missing people fields',
      safeSupabaseErrorSummary(error)
    )

    return {
      ok: false,
      message: 'Could not validate people on duty. Review the details and try again.',
    }
  }

  return {
    ok: true,
    missing: findMissingAuditPeople(toAuditPeopleValues(data ?? [])),
  }
}

export async function saveAuditPeopleAction(
  auditId: string,
  peopleInput: AuditPeopleValues
): Promise<SaveAuditPeopleState> {
  const access = await getSaveAnswerAccess(
    'You must be signed in to save people on duty.'
  )

  if (!access.ok) {
    return { status: 'error', message: access.error }
  }

  const trimmedAuditId = auditId.trim()

  if (!trimmedAuditId) {
    return {
      status: 'error',
      message: 'Audit not found or access denied.',
    }
  }

  const people: AuditPeopleValues = {
    teamMemberName: normalizeAuditPersonName(peopleInput.teamMemberName),
    baristaName: normalizeAuditPersonName(peopleInput.baristaName),
    modName: normalizeAuditPersonName(peopleInput.modName),
  }
  const missingPeople = findMissingAuditPeople(people)

  if (missingPeople.length > 0) {
    return {
      status: 'error',
      message: 'Enter Team Member, Barista, and MOD names before saving.',
    }
  }

  if (
    people.teamMemberName.length > 120 ||
    people.baristaName.length > 120 ||
    people.modName.length > 120
  ) {
    return {
      status: 'error',
      message: 'People names must be 120 characters or fewer.',
    }
  }

  const { data: audit, error: auditError } = await access.supabase
    .from('audits')
    .select('id, store_id, status, is_locked, scoring_model_version')
    .eq('id', trimmedAuditId)
    .single<AuditAccessRow>()

  if (auditError || !audit) {
    return {
      status: 'error',
      message: 'Audit not found or access denied.',
    }
  }

  const canAccess = await canAccessAudit(access.supabase, access.profile, audit)

  if (!canAccess) {
    return {
      status: 'error',
      message: 'You do not have permission to update people for this audit.',
    }
  }

  if (!isEditableAudit(audit.status, audit.is_locked)) {
    return {
      status: 'error',
      message: 'This audit is locked and cannot be edited.',
    }
  }

  const { data, error } = await access.supabase
    .rpc('save_audit_people_v1', {
      p_audit_id: audit.id,
      p_team_member_name: people.teamMemberName,
      p_barista_name: people.baristaName,
      p_mod_name: people.modName,
    })
    .returns<AuditPersonRow[]>()

  if (error) {
    console.error(
      '[audit_people] saveAuditPeopleAction RPC failed',
      safeSupabaseErrorSummary(error)
    )

    return {
      status: 'error',
      message: auditPeopleWriteErrorMessage(error),
    }
  }

  const savedPeople = toAuditPeopleValues(Array.isArray(data) ? data : [])

  revalidatePath(`/audits/${audit.id}`)
  revalidatePath('/audits')

  return {
    status: 'success',
    message: 'People on duty saved.',
    people: savedPeople,
  }
}

export async function saveAuditAnswerAction(
  _previousState: SaveAnswerState,
  formData: FormData
): Promise<SaveAnswerState> {
  const access = await getSaveAnswerAccess()

  if (!access.ok) {
    return { status: 'error', message: access.error }
  }

  const auditId = getText(formData, 'audit_id')
  const questionId = getText(formData, 'question_id')
  const scoreInput = getText(formData, 'score')
  const comment = getText(formData, 'comment')
  const isNa = formData.get('is_na') === 'on'
  const isCriticalFlag = formData.get('is_critical_flag') === 'on'

  if (!auditId || !questionId) {
    return {
      status: 'error',
      message: 'The audit or question is missing. Refresh and try again.',
    }
  }

  const { data: audit, error: auditError } = await access.supabase
    .from('audits')
    .select('id, store_id, status, is_locked, scoring_model_version')
    .eq('id', auditId)
    .single<AuditAccessRow>()

  if (auditError || !audit) {
    return {
      status: 'error',
      message: 'Audit not found or access denied.',
    }
  }

  const canAccess = await canAccessAudit(access.supabase, access.profile, audit)

  if (!canAccess) {
    return {
      status: 'error',
      message: 'You do not have permission to edit this audit.',
    }
  }

  if (!isEditableAudit(audit.status, audit.is_locked)) {
    return {
      status: 'error',
      message: 'This audit is locked and cannot be edited.',
    }
  }

  const { data: question, error: questionError } = await access.supabase
    .from('audit_questions')
    .select(
      'id, section_id, question_text, max_score, is_active, scoring_group, response_type, required_for_completion, scoring_model_version'
    )
    .eq('id', questionId)
    .single<QuestionRow>()

  if (questionError || !question || !question.is_active) {
    return {
      status: 'error',
      message: 'Question not found or inactive.',
    }
  }

  const { data: section, error: sectionError } = await access.supabase
    .from('checklist_sections')
    .select('id, title, is_active')
    .eq('id', question.section_id)
    .single<SectionRow>()

  if (sectionError || !section || !section.is_active) {
    return {
      status: 'error',
      message: 'Question section is unavailable.',
    }
  }

  const scoreResult = parseAnswerScore({
    value: scoreInput,
    maxScore: question.max_score,
    isNa,
    scoringGroup: question.scoring_group ?? 'core',
    responseType: question.response_type ?? 'score',
    scoringModelVersion: question.scoring_model_version ?? 'legacy_62_v1',
  })

  if (!scoreResult.ok) {
    return { status: 'error', message: scoreResult.error }
  }

  const { error } = await access.supabase.from('audit_answers').upsert(
    {
      audit_id: audit.id,
      question_id: question.id,
      question_text_snapshot: question.question_text,
      section_title_snapshot: section.title,
      score: scoreResult.score,
      max_score: question.max_score,
      is_na: isNa,
      comment: comment || null,
      is_critical_flag: isCriticalFlag,
    },
    { onConflict: 'audit_id,question_id' }
  )

  if (error) {
    return {
      status: 'error',
      message: answerWriteErrorMessage(error),
    }
  }

  return {
    status: 'success',
    message: 'Answer saved.',
    answer: {
      questionId: question.id,
      score: scoreResult.score,
      maxScore: question.max_score,
      isNa,
      comment: comment || null,
      isCriticalFlag,
    },
  }
}

export async function completeAuditAction(
  auditId: string
): Promise<CompleteAuditState> {
  const access = await getSaveAnswerAccess(
    'You must be signed in to complete this audit.'
  )

  if (!access.ok) {
    return { status: 'error', message: access.error }
  }

  const trimmedAuditId = auditId.trim()

  if (!trimmedAuditId) {
    return {
      status: 'error',
      message: 'Audit not found or access denied.',
    }
  }

  const { data: audit, error: auditError } = await access.supabase
    .from('audits')
    .select('id, store_id, status, is_locked, scoring_model_version')
    .eq('id', trimmedAuditId)
    .single<AuditAccessRow>()

  if (auditError || !audit) {
    return {
      status: 'error',
      message: 'Audit not found or access denied.',
    }
  }

  const canAccess = await canAccessAudit(access.supabase, access.profile, audit)

  if (!canAccess) {
    return {
      status: 'error',
      message: 'You do not have permission to complete this audit.',
    }
  }

  if (!isEditableAudit(audit.status, audit.is_locked)) {
    return {
      status: 'error',
      message: 'This audit is already locked or completed.',
    }
  }

  const peopleValidation = await loadMissingAuditPeople(
    access.supabase,
    audit.id
  )

  if (!peopleValidation.ok) {
    return {
      status: 'error',
      message: peopleValidation.message,
    }
  }

  const commentValidation = await loadMissingCommentRequirements(
    access.supabase,
    audit.id
  )

  if (!commentValidation.ok) {
    return {
      status: 'error',
      message: commentValidation.message,
    }
  }

  if (commentValidation.missing.length > 0) {
    return {
      status: 'error',
      message:
        peopleValidation.missing.length > 0
          ? 'Please complete people on duty and required comments before completing the audit.'
          : 'Please add the required comments before completing the audit.',
      missingCommentRequirements: commentValidation.missing,
      missingPeopleFields: peopleValidation.missing,
    }
  }

  if (peopleValidation.missing.length > 0) {
    return {
      status: 'error',
      message: 'Please complete people on duty before completing the audit.',
      missingPeopleFields: peopleValidation.missing,
    }
  }

  const { error } = await access.supabase.rpc('complete_audit_v1', {
    p_audit_id: audit.id,
  })

  if (error) {
    return {
      status: 'error',
      message: completionErrorMessage(error),
    }
  }

  const { data: completedAudit, error: completedAuditError } =
    await access.supabase
      .from('audits')
      .select(
        'id, status, is_locked, completed_at, total_score, max_score, section_scores'
      )
      .eq('id', audit.id)
      .single<CompletedAuditCheckRow>()

  if (completedAuditError || !completedAudit) {
    return {
      status: 'error',
      message: 'Could not verify audit completion.',
    }
  }

  if (completedAudit.status !== 'completed' || !completedAudit.is_locked) {
    return {
      status: 'error',
      message: 'Audit completion did not persist.',
    }
  }

  revalidatePath(`/audits/${audit.id}`)
  revalidatePath('/audits')

  return {
    status: 'success',
    message: 'Audit completed successfully.',
  }
}
