import 'server-only'

import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type ScoreBand = 'excellent' | 'good' | 'needs_focus' | 'critical'

type ActionPlanRow = {
  id: string
  audit_id: string | null
  store_id: string
  status: 'open' | 'in_progress' | 'completed'
  generated_by_ai: boolean
  focus_area: string | null
  summary: string | null
  created_at: string
  updated_at: string
}

type ActionPlanItemRow = {
  id: string
  action_description: string
  owner: string | null
  priority: 'low' | 'medium' | 'high'
  due_date: string | null
  success_measure: string | null
  status: 'open' | 'in_progress' | 'completed'
}

type AuditRow = {
  id: string
  store_id: string
  status: 'draft' | 'in_progress' | 'completed' | 'archived'
  visit_date: string
  visit_time: string | null
  total_score: number | string | null
  max_score: number | string | null
  percentage: number | string | null
  score_band: ScoreBand | null
  section_scores: unknown
  scoring_model_version: string | null
  completed_at: string | null
}

type StoreRow = {
  id: string
  name: string
  code: string
  area_id: string
  city: string | null
  county_or_state: string | null
  country: string | null
  location_type: string | null
  terminal: string | null
  airside_landside: string | null
}

type QuestionRow = {
  id: string
  section_id: string
  question_text: string
  max_score: number | string
  scoring_group: 'core' | 'bonus' | null
  display_number: number | null
  order_index: number
}

type AnswerRow = {
  question_id: string
  score: number | string | null
  max_score: number | string | null
  comment: string | null
  is_critical_flag: boolean
}

type EvidenceRow = {
  question_id: string | null
}

type SectionScoresJson = {
  bonus?: {
    total_score?: number | string | null
    max_score?: number | string | null
  } | null
}

export type AiActionPlanPdfContext = {
  actionPlan: {
    id: string
    status: ActionPlanRow['status']
    generatedByAi: boolean
    focusArea: string | null
    summary: string | null
    createdAt: string
    updatedAt: string
    items: Array<{
      id: string
      description: string
      owner: string | null
      priority: ActionPlanItemRow['priority']
      dueDate: string | null
      successMeasure: string | null
      status: ActionPlanItemRow['status']
    }>
  }
  audit: {
    id: string
    completedAt: string | null
    visitDate: string
    visitTime: string | null
  }
  store: {
    id: string
    name: string
    code: string
    areaId: string
    locationLabel: string | null
  }
  score: {
    coreScore: number
    coreMaxScore: 95
    bonusScore: number
    bonusMaxScore: 5
    percentage: number | null
    band: ScoreBand | null
    displayScore: string
  }
  sourceFindings: {
    lowScoringQuestions: Array<{
      displayNumber: number | null
      questionText: string
      score: number | null
      maxScore: number
      pointsLost: number
      comment: string | null
      isCritical: boolean
    }>
    perfectScoreQuestions: Array<{
      displayNumber: number | null
      questionText: string
    }>
    comments: Array<{
      displayNumber: number | null
      questionText: string
      comment: string
    }>
  }
  diagnostics: {
    actionItemCount: number
    lowScoreQuestionCount: number
    criticalIssueCount: number
    commentCount: number
    photoEvidenceCount: number
  }
}

export class AiActionPlanPdfContextError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AiActionPlanPdfContextError'
  }
}

function cleanText(value: string | null | undefined) {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : null
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

function parseSectionScores(value: unknown): SectionScoresJson | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null
  }

  return value as SectionScoresJson
}

function buildLocationLabel(store: StoreRow) {
  const parts = [
    store.city,
    store.county_or_state,
    store.country,
    store.location_type,
    store.terminal,
    store.airside_landside,
  ]
    .map(cleanText)
    .filter((part): part is string => Boolean(part))

  return parts.length > 0 ? parts.join(', ') : null
}

function buildScoreLabel({
  coreScore,
  coreMaxScore,
  bonusScore,
  bonusMaxScore,
}: {
  coreScore: number
  coreMaxScore: number
  bonusScore: number
  bonusMaxScore: number
}) {
  return `${coreScore}/${coreMaxScore} + ${bonusScore}/${bonusMaxScore} bonus`
}

function compactQuestionText(value: string) {
  return value.replace(/\s+/g, ' ').trim()
}

function sourceDateLabel(value: string | null) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'medium',
    timeZone: 'Europe/Dublin',
  }).format(date)
}

export function aiActionPlanPdfSourceFacts(context: AiActionPlanPdfContext) {
  return {
    action_plan_id: context.actionPlan.id,
    audit_id: context.audit.id,
    store_name: context.store.name,
    store_code: context.store.code,
    location_label: context.store.locationLabel,
    date_label:
      sourceDateLabel(context.audit.completedAt) ??
      sourceDateLabel(context.audit.visitDate),
  }
}

export function aiActionPlanPdfScoreFacts(context: AiActionPlanPdfContext) {
  return {
    display_score: context.score.displayScore,
    core_score: context.score.coreScore,
    core_max_score: context.score.coreMaxScore,
    bonus_score: context.score.bonusScore,
    bonus_max_score: context.score.bonusMaxScore,
    percentage: context.score.percentage,
    band: context.score.band,
  }
}

export async function buildAiActionPlanPdfContext(
  supabase: SupabaseServerClient,
  actionPlanId: string
): Promise<AiActionPlanPdfContext> {
  const { data: actionPlan, error: actionPlanError } = await supabase
    .from('action_plans')
    .select(
      'id, audit_id, store_id, status, generated_by_ai, focus_area, summary, created_at, updated_at'
    )
    .eq('id', actionPlanId)
    .single<ActionPlanRow>()

  if (actionPlanError || !actionPlan) {
    throw new AiActionPlanPdfContextError(
      'Action plan not found or access denied.'
    )
  }

  if (!actionPlan.audit_id) {
    throw new AiActionPlanPdfContextError(
      'AI Action Plan PDF requires a linked completed audit.'
    )
  }

  const [
    { data: items, error: itemsError },
    { data: audit, error: auditError },
    { data: store, error: storeError },
  ] = await Promise.all([
    supabase
      .from('action_plan_items')
      .select(
        'id, action_description, owner, priority, due_date, success_measure, status'
      )
      .eq('action_plan_id', actionPlan.id)
      .order('created_at', { ascending: true })
      .returns<ActionPlanItemRow[]>(),
    supabase
      .from('audits')
      .select(
        'id, store_id, status, visit_date, visit_time, total_score, max_score, percentage, score_band, section_scores, scoring_model_version, completed_at'
      )
      .eq('id', actionPlan.audit_id)
      .single<AuditRow>(),
    supabase
      .from('stores')
      .select(
        'id, name, code, area_id, city, county_or_state, country, location_type, terminal, airside_landside'
      )
      .eq('id', actionPlan.store_id)
      .single<StoreRow>(),
  ])

  if (itemsError) {
    throw new AiActionPlanPdfContextError('Could not load action plan items.')
  }

  if (auditError || !audit) {
    throw new AiActionPlanPdfContextError(
      'Linked audit not found or access denied.'
    )
  }

  if (audit.status !== 'completed') {
    throw new AiActionPlanPdfContextError(
      'AI Action Plan PDF requires a completed linked audit.'
    )
  }

  if (audit.store_id !== actionPlan.store_id) {
    throw new AiActionPlanPdfContextError(
      'Action plan and audit store mismatch.'
    )
  }

  if (audit.scoring_model_version !== 'pret_ce_v1') {
    throw new AiActionPlanPdfContextError(
      'AI Action Plan PDF requires a Pret CE V1 audit.'
    )
  }

  if (storeError || !store) {
    throw new AiActionPlanPdfContextError('Store not found or access denied.')
  }

  const [
    { data: questions, error: questionsError },
    { data: answers, error: answersError },
    { data: evidence, error: evidenceError },
  ] = await Promise.all([
    supabase
      .from('audit_questions')
      .select(
        'id, section_id, question_text, max_score, scoring_group, display_number, order_index'
      )
      .eq('is_active', true)
      .eq('scoring_model_version', 'pret_ce_v1')
      .in('scoring_group', ['core', 'bonus'])
      .returns<QuestionRow[]>(),
    supabase
      .from('audit_answers')
      .select('question_id, score, max_score, comment, is_critical_flag')
      .eq('audit_id', audit.id)
      .returns<AnswerRow[]>(),
    supabase
      .from('audit_evidence')
      .select('question_id')
      .eq('audit_id', audit.id)
      .eq('evidence_type', 'photo')
      .returns<EvidenceRow[]>(),
  ])

  if (questionsError || answersError || evidenceError) {
    throw new AiActionPlanPdfContextError(
      'Could not load supporting audit facts.'
    )
  }

  const answersByQuestion = new Map(
    (answers ?? []).map((answer) => [answer.question_id, answer])
  )
  const sourceQuestions = (questions ?? [])
    .map((question) => {
      const answer = answersByQuestion.get(question.id)

      if (!answer) {
        return null
      }

      const score = answer.score === null ? null : toNumber(answer.score)
      const maxScore = toNumber(answer.max_score ?? question.max_score)

      return {
        displayNumber: question.display_number,
        questionText: compactQuestionText(question.question_text),
        scoringGroup: question.scoring_group ?? 'core',
        score,
        maxScore,
        pointsLost:
          question.scoring_group === 'bonus'
            ? 0
            : Math.max(0, maxScore - toNumber(score)),
        comment: cleanText(answer.comment),
        isCritical: answer.is_critical_flag,
      }
    })
    .filter((question): question is NonNullable<typeof question> =>
      Boolean(question)
    )
    .sort((left, right) => {
      if (left.scoringGroup !== right.scoringGroup) {
        return left.scoringGroup === 'core' ? -1 : 1
      }

      return (
        (left.displayNumber ?? Number.MAX_SAFE_INTEGER) -
        (right.displayNumber ?? Number.MAX_SAFE_INTEGER)
      )
    })

  const sectionScores = parseSectionScores(audit.section_scores)
  const bonusQuestion = sourceQuestions.find(
    (question) => question.scoringGroup === 'bonus'
  )
  const bonusScore = toNumber(sectionScores?.bonus?.total_score ?? bonusQuestion?.score)
  const bonusMaxScore =
    toNumber(sectionScores?.bonus?.max_score ?? bonusQuestion?.maxScore) || 5
  const coreScore = toNumber(audit.total_score)
  const coreMaxScore = toNumber(audit.max_score)

  if (coreMaxScore !== 95 || bonusMaxScore !== 5) {
    throw new AiActionPlanPdfContextError(
      'AI Action Plan PDF requires the Pret CE V1 /95 + /5 scoring model.'
    )
  }

  const lowScoringQuestions = sourceQuestions
    .filter((question) => question.scoringGroup === 'core')
    .filter((question) => question.score !== null && question.score < question.maxScore)
    .sort((left, right) => {
      if (right.pointsLost !== left.pointsLost) {
        return right.pointsLost - left.pointsLost
      }

      return (left.displayNumber ?? 0) - (right.displayNumber ?? 0)
    })
    .map((question) => ({
      displayNumber: question.displayNumber,
      questionText: question.questionText,
      score: question.score,
      maxScore: question.maxScore,
      pointsLost: question.pointsLost,
      comment: question.comment,
      isCritical: question.isCritical,
    }))
  const perfectScoreQuestions = sourceQuestions
    .filter((question) => question.scoringGroup === 'core')
    .filter((question) => question.score === question.maxScore)
    .map((question) => ({
      displayNumber: question.displayNumber,
      questionText: question.questionText,
    }))
  const comments = sourceQuestions
    .filter((question) => Boolean(question.comment))
    .map((question) => ({
      displayNumber: question.displayNumber,
      questionText: question.questionText,
      comment: question.comment ?? '',
    }))

  return {
    actionPlan: {
      id: actionPlan.id,
      status: actionPlan.status,
      generatedByAi: actionPlan.generated_by_ai,
      focusArea: actionPlan.focus_area,
      summary: actionPlan.summary,
      createdAt: actionPlan.created_at,
      updatedAt: actionPlan.updated_at,
      items: (items ?? []).map((item) => ({
        id: item.id,
        description: item.action_description,
        owner: item.owner,
        priority: item.priority,
        dueDate: item.due_date,
        successMeasure: item.success_measure,
        status: item.status,
      })),
    },
    audit: {
      id: audit.id,
      completedAt: audit.completed_at,
      visitDate: audit.visit_date,
      visitTime: audit.visit_time,
    },
    store: {
      id: store.id,
      name: store.name,
      code: store.code,
      areaId: store.area_id,
      locationLabel: buildLocationLabel(store),
    },
    score: {
      coreScore,
      coreMaxScore: 95,
      bonusScore,
      bonusMaxScore: 5,
      percentage: audit.percentage === null ? null : toNumber(audit.percentage),
      band: audit.score_band,
      displayScore: buildScoreLabel({
        coreScore,
        coreMaxScore,
        bonusScore,
        bonusMaxScore,
      }),
    },
    sourceFindings: {
      lowScoringQuestions,
      perfectScoreQuestions,
      comments,
    },
    diagnostics: {
      actionItemCount: items?.length ?? 0,
      lowScoreQuestionCount: lowScoringQuestions.length,
      criticalIssueCount: lowScoringQuestions.filter((question) => question.isCritical).length,
      commentCount: comments.length,
      photoEvidenceCount: evidence?.length ?? 0,
    },
  }
}
