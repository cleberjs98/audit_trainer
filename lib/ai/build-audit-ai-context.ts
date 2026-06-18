import type { createClient } from '@/lib/supabase/server'

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

type AuditStatus = 'draft' | 'in_progress' | 'completed' | 'archived'
type ScoreBand = 'excellent' | 'good' | 'needs_focus' | 'critical'

type AuditRow = {
  id: string
  store_id: string
  status: AuditStatus
  visit_date: string
  visit_time: string
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
}

type AnswerRow = {
  id: string
  question_id: string
  score: number | string | null
  max_score: number | string | null
  is_na: boolean
  comment: string | null
}

type QuestionRow = {
  id: string
  section_id: string
  question_text: string
  question_description: string | null
  max_score: number | string
  scoring_group: 'core' | 'bonus' | null
  response_type: 'score' | 'boolean_score' | null
  required_for_completion: boolean | null
  display_number: number | null
  order_index: number
}

type SectionRow = {
  id: string
  title: string
  order_index: number
}

type ExistingActionPlanRow = {
  id: string
  status: 'open' | 'in_progress' | 'completed'
  generated_by_ai: boolean
  focus_area: string | null
  summary: string | null
}

type SectionScoresJson = {
  bonus?: {
    total_score?: number | string | null
    max_score?: number | string | null
  } | null
}

export type CompletedAuditAiQuestion = {
  displayNumber: number | null
  sectionTitle: string
  questionText: string
  questionDescription: string | null
  scoringGroup: 'core' | 'bonus'
  responseType: 'score' | 'boolean_score'
  requiredForCompletion: boolean
  score: number | null
  maxScore: number
  isNa: boolean
  comment: string | null
}

export type CompletedAuditAiContext = {
  audit: {
    id: string
    status: 'completed'
    completedAt: string | null
    visitDate: string
    visitTime: string
    scoringModelVersion: string
  }
  store: {
    id: string
    name: string
    code: string
    areaId: string
  }
  score: {
    coreScore: number
    coreMaxScore: number
    percentage: number
    scoreBand: ScoreBand | null
    bonusScore: number
    bonusMaxScore: number
    displayLabel: string
    sectionScores: unknown
  }
  answeredQuestions: CompletedAuditAiQuestion[]
  lowScoringQuestions: CompletedAuditAiQuestion[]
  strongestQuestions: CompletedAuditAiQuestion[]
  issueComments: Array<{
    displayNumber: number | null
    sectionTitle: string
    questionText: string
    score: number | null
    maxScore: number
    comment: string
  }>
  existingActionPlan: ExistingActionPlanRow | null
}

export class AuditAiContextError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'AuditAiContextError'
  }
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

function isAnsweredScore(question: CompletedAuditAiQuestion) {
  return !question.isNa && question.score !== null && question.maxScore > 0
}

export async function buildCompletedAuditAiContext(
  supabase: SupabaseServerClient,
  auditId: string
): Promise<CompletedAuditAiContext> {
  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select(
      'id, store_id, status, visit_date, visit_time, total_score, max_score, percentage, score_band, section_scores, scoring_model_version, completed_at'
    )
    .eq('id', auditId)
    .single<AuditRow>()

  if (auditError || !audit) {
    throw new AuditAiContextError('Audit not found or access denied.')
  }

  if (audit.status !== 'completed') {
    throw new AuditAiContextError(
      'AI action plans can only be generated for completed audits.'
    )
  }

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, name, code, area_id')
    .eq('id', audit.store_id)
    .single<StoreRow>()

  if (storeError || !store) {
    throw new AuditAiContextError('Store not found or access denied.')
  }

  const [
    { data: answers, error: answersError },
    { data: questions, error: questionsError },
    { data: sections, error: sectionsError },
    { data: existingActionPlan, error: actionPlanError },
  ] = await Promise.all([
    supabase
      .from('audit_answers')
      .select('id, question_id, score, max_score, is_na, comment')
      .eq('audit_id', audit.id)
      .returns<AnswerRow[]>(),
    supabase
      .from('audit_questions')
      .select(
        'id, section_id, question_text, question_description, max_score, scoring_group, response_type, required_for_completion, display_number, order_index'
      )
      .eq('is_active', true)
      .order('section_id', { ascending: true })
      .order('order_index', { ascending: true })
      .returns<QuestionRow[]>(),
    supabase
      .from('checklist_sections')
      .select('id, title, order_index')
      .eq('is_active', true)
      .returns<SectionRow[]>(),
    supabase
      .from('action_plans')
      .select('id, status, generated_by_ai, focus_area, summary')
      .eq('audit_id', audit.id)
      .maybeSingle<ExistingActionPlanRow>(),
  ])

  if (answersError || questionsError || sectionsError) {
    throw new AuditAiContextError('Could not load completed audit context.')
  }

  if (actionPlanError && actionPlanError.code !== 'PGRST116') {
    throw new AuditAiContextError('Could not load existing action plan context.')
  }

  const answersByQuestion = new Map(
    (answers ?? []).map((answer) => [answer.question_id, answer])
  )
  const sectionsById = new Map((sections ?? []).map((section) => [section.id, section]))
  const answeredQuestions = (questions ?? [])
    .map((question): CompletedAuditAiQuestion | null => {
      const answer = answersByQuestion.get(question.id)

      if (!answer) {
        return null
      }

      return {
        displayNumber: question.display_number,
        sectionTitle: sectionsById.get(question.section_id)?.title ?? 'Checklist',
        questionText: question.question_text,
        questionDescription: question.question_description,
        scoringGroup: question.scoring_group ?? 'core',
        responseType: question.response_type ?? 'score',
        requiredForCompletion: question.required_for_completion ?? true,
        score: answer.score === null ? null : toNumber(answer.score),
        maxScore: toNumber(answer.max_score ?? question.max_score),
        isNa: answer.is_na,
        comment: answer.comment,
      }
    })
    .filter((question): question is CompletedAuditAiQuestion => Boolean(question))
    .sort((left, right) => {
      const leftDisplay = left.displayNumber ?? Number.MAX_SAFE_INTEGER
      const rightDisplay = right.displayNumber ?? Number.MAX_SAFE_INTEGER

      if (leftDisplay !== rightDisplay) {
        return leftDisplay - rightDisplay
      }

      return left.questionText.localeCompare(right.questionText)
    })

  const sectionScores = parseSectionScores(audit.section_scores)
  const bonusQuestions = answeredQuestions.filter(
    (question) => question.scoringGroup === 'bonus'
  )
  const bonusScore =
    toNumber(sectionScores?.bonus?.total_score) ||
    bonusQuestions.reduce((total, question) => total + toNumber(question.score), 0)
  const bonusMaxScore =
    toNumber(sectionScores?.bonus?.max_score) ||
    bonusQuestions.reduce((total, question) => total + question.maxScore, 0)

  const coreScore = toNumber(audit.total_score)
  const coreMaxScore = toNumber(audit.max_score)

  const lowScoringQuestions = answeredQuestions
    .filter((question) => question.scoringGroup === 'core')
    .filter(isAnsweredScore)
    .filter((question) => toNumber(question.score) / question.maxScore <= 0.6)
    .slice(0, 8)

  const strongestQuestions = answeredQuestions
    .filter((question) => question.scoringGroup === 'core')
    .filter(isAnsweredScore)
    .filter((question) => toNumber(question.score) === question.maxScore)
    .slice(0, 8)

  const issueComments = answeredQuestions
    .filter((question) => question.comment?.trim())
    .map((question) => ({
      displayNumber: question.displayNumber,
      sectionTitle: question.sectionTitle,
      questionText: question.questionText,
      score: question.score,
      maxScore: question.maxScore,
      comment: question.comment?.trim() ?? '',
    }))

  return {
    audit: {
      id: audit.id,
      status: 'completed',
      completedAt: audit.completed_at,
      visitDate: audit.visit_date,
      visitTime: audit.visit_time,
      scoringModelVersion: audit.scoring_model_version ?? 'legacy_62_v1',
    },
    store: {
      id: store.id,
      name: store.name,
      code: store.code,
      areaId: store.area_id,
    },
    score: {
      coreScore,
      coreMaxScore,
      percentage: toNumber(audit.percentage),
      scoreBand: audit.score_band,
      bonusScore,
      bonusMaxScore,
      displayLabel: buildScoreLabel({
        coreScore,
        coreMaxScore,
        bonusScore,
        bonusMaxScore,
      }),
      sectionScores: audit.section_scores,
    },
    answeredQuestions,
    lowScoringQuestions,
    strongestQuestions,
    issueComments,
    existingActionPlan: existingActionPlan ?? null,
  }
}
