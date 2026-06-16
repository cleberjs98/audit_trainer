import { redirect } from 'next/navigation'

import { AuditChecklist } from '@/components/checklist/audit-checklist'
import type {
  ChecklistAnswer,
  ChecklistAudit,
  ChecklistQuestion,
  ChecklistSection,
  ChecklistStore,
  PretSectionScores,
  ScorePreview,
} from '@/components/checklist/types'
import { MissingProfileDashboard } from '@/components/dashboard/dashboard-shell'
import { isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'

type AuditRow = {
  id: string
  store_id: string
  status: ChecklistAudit['status']
  is_locked: boolean
  visit_date: string
  visit_time: string
  mod: string | null
  shift_type: string
  traffic_level: string
  visit_type: string
  total_score: number | string
  max_score: number | string
  percentage: number | string
  score_band: ChecklistAudit['scoreBand']
  section_scores: PretSectionScores | null
  scoring_model_version: string | null
  completed_at: string | null
}

type StoreRow = {
  id: string
  name: string
  code: string
  area_id: string
}

type SectionRow = {
  id: string
  title: string
  description: string | null
  order_index: number
}

type QuestionRow = {
  id: string
  section_id: string
  question_text: string
  question_description: string | null
  max_score: number
  is_required: boolean
  is_critical: boolean
  scoring_group?: ChecklistQuestion['scoringGroup'] | null
  response_type?: ChecklistQuestion['responseType'] | null
  required_for_completion?: boolean | null
  display_number?: number | null
  scoring_model_version?: string | null
  order_index: number
}

type AnswerRow = {
  id: string
  audit_id: string
  question_id: string
  score: number | null
  max_score: number
  is_na: boolean
  comment: string | null
  is_critical_flag: boolean
}

type ActionPlanSummaryRow = {
  id: string
  status: 'open' | 'in_progress' | 'completed'
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return Number(value)
}

function toChecklistAudit(audit: AuditRow, store: StoreRow): ChecklistAudit {
  return {
    id: audit.id,
    storeId: audit.store_id,
    status: audit.status,
    isLocked: audit.is_locked,
    visitDate: audit.visit_date,
    visitTime: audit.visit_time,
    mod: audit.mod,
    shiftType: audit.shift_type,
    trafficLevel: audit.traffic_level,
    visitType: audit.visit_type,
    totalScore: toNumber(audit.total_score),
    maxScore: toNumber(audit.max_score),
    percentage: toNumber(audit.percentage),
    scoreBand: audit.score_band,
    sectionScores: audit.section_scores,
    scoringModelVersion: audit.scoring_model_version ?? 'legacy_62_v1',
    completedAt: audit.completed_at,
    store: {
      id: store.id,
      name: store.name,
      code: store.code,
      areaId: store.area_id,
    } satisfies ChecklistStore,
  }
}

function toChecklistAnswer(answer: AnswerRow): ChecklistAnswer {
  return {
    id: answer.id,
    auditId: answer.audit_id,
    questionId: answer.question_id,
    score: answer.score === null ? null : toNumber(answer.score),
    maxScore: toNumber(answer.max_score),
    isNa: answer.is_na,
    comment: answer.comment,
    isCriticalFlag: answer.is_critical_flag,
  }
}

function buildSections(
  sections: SectionRow[],
  questions: QuestionRow[],
  answers: AnswerRow[]
): ChecklistSection[] {
  const answersByQuestion = new Map(
    answers.map((answer) => [answer.question_id, toChecklistAnswer(answer)])
  )
  const questionsBySection = new Map<string, ChecklistQuestion[]>()

  for (const question of questions) {
    const sectionQuestions = questionsBySection.get(question.section_id) ?? []

    sectionQuestions.push({
      id: question.id,
      sectionId: question.section_id,
      questionText: question.question_text,
      questionDescription: question.question_description,
      maxScore: toNumber(question.max_score),
      isRequired: question.is_required,
      isCritical: question.is_critical,
      scoringGroup: question.scoring_group ?? 'core',
      responseType: question.response_type ?? 'score',
      requiredForCompletion:
        question.required_for_completion ?? question.is_required,
      displayNumber: question.display_number ?? null,
      scoringModelVersion: question.scoring_model_version ?? 'legacy_62_v1',
      orderIndex: question.order_index,
      answer: answersByQuestion.get(question.id) ?? null,
    })

    questionsBySection.set(question.section_id, sectionQuestions)
  }

  return sections.map((section) => ({
    id: section.id,
    title: section.title,
    description: section.description,
    orderIndex: section.order_index,
    questions: (questionsBySection.get(section.id) ?? []).sort(
      (left, right) => left.orderIndex - right.orderIndex
    ),
  }))
}

function calculateScorePreview(sections: ChecklistSection[]): ScorePreview {
  const questions = sections.flatMap((section) => section.questions)
  const coreScoredQuestions = questions.filter(
    (question) =>
      question.scoringGroup === 'core' &&
      question.answer &&
      !question.answer.isNa &&
      question.answer.score !== null
  )
  const bonusScoredQuestions = questions.filter(
    (question) =>
      question.scoringGroup === 'bonus' &&
      question.answer &&
      !question.answer.isNa &&
      question.answer.score !== null
  )
  const coreScore = coreScoredQuestions.reduce(
    (total, question) => total + toNumber(question.answer?.score),
    0
  )
  const coreMaxScore = questions
    .filter((question) => question.scoringGroup === 'core')
    .reduce((total, question) => total + toNumber(question.maxScore), 0)
  const legacyCoreMaxScore = coreScoredQuestions.reduce(
    (total, question) => total + toNumber(question.maxScore),
    0
  )
  const displayCoreMaxScore = coreMaxScore > 0 ? coreMaxScore : legacyCoreMaxScore
  const bonusScore = bonusScoredQuestions.reduce(
    (total, question) => total + toNumber(question.answer?.score),
    0
  )
  const bonusMaxScore = questions
    .filter((question) => question.scoringGroup === 'bonus')
    .reduce((total, question) => total + toNumber(question.maxScore), 0)
  const combinedLabel =
    displayCoreMaxScore > 0
      ? `${coreScore}/${displayCoreMaxScore} + ${bonusScore}/${bonusMaxScore} bonus`
      : 'No scored answers yet'

  return {
    coreScore,
    coreMaxScore: displayCoreMaxScore,
    corePercentage:
      displayCoreMaxScore > 0
        ? Math.round((coreScore / displayCoreMaxScore) * 100)
        : null,
    bonusScore,
    bonusMaxScore,
    combinedLabel,
    percentage:
      displayCoreMaxScore > 0
        ? Math.round((coreScore / displayCoreMaxScore) * 100)
        : null,
    answeredCount: coreScoredQuestions.length + bonusScoredQuestions.length,
  }
}

function AuditAccessFallback() {
  return (
    <main className="min-h-screen bg-background">
      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
          <p className="text-sm font-semibold">Audit unavailable</p>
          <h1 className="mt-2 text-2xl font-semibold">
            Audit not found or access denied.
          </h1>
          <p className="mt-3 text-sm leading-6">
            The audit may not exist, or it may be outside your assigned store or
            area.
          </p>
        </div>
      </section>
    </main>
  )
}

export default async function AuditDetailPage({
  params,
}: {
  params: Promise<{ auditId: string }>
}) {
  const { auditId } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, store_id, area_id, created_at, updated_at')
    .eq('id', user.id)
    .single<ProfileRow>()

  const email = user.email ?? profile?.email ?? 'Unknown email'

  if (profileError || !profile || !isUserRole(profile.role)) {
    return <MissingProfileDashboard email={email} />
  }

  const { data: audit, error: auditError } = await supabase
    .from('audits')
    .select(
      'id, store_id, status, is_locked, visit_date, visit_time, mod, shift_type, traffic_level, visit_type, total_score, max_score, percentage, score_band, section_scores, scoring_model_version, completed_at'
    )
    .eq('id', auditId)
    .single<AuditRow>()

  if (auditError || !audit) {
    return <AuditAccessFallback />
  }

  const { data: store, error: storeError } = await supabase
    .from('stores')
    .select('id, name, code, area_id')
    .eq('id', audit.store_id)
    .single<StoreRow>()

  if (storeError || !store) {
    return <AuditAccessFallback />
  }

  const [
    { data: sectionRows },
    { data: questionRows },
    { data: answerRows },
    { data: actionPlan },
  ] =
    await Promise.all([
      supabase
        .from('checklist_sections')
        .select('id, title, description, order_index')
        .eq('is_active', true)
        .order('order_index', { ascending: true })
        .returns<SectionRow[]>(),
      supabase
        .from('audit_questions')
        .select(
          'id, section_id, question_text, question_description, max_score, is_required, is_critical, scoring_group, response_type, required_for_completion, display_number, scoring_model_version, order_index'
        )
        .eq('is_active', true)
        .order('section_id', { ascending: true })
        .order('order_index', { ascending: true })
        .returns<QuestionRow[]>(),
      supabase
        .from('audit_answers')
        .select(
          'id, audit_id, question_id, score, max_score, is_na, comment, is_critical_flag'
        )
        .eq('audit_id', audit.id)
        .returns<AnswerRow[]>(),
      supabase
        .from('action_plans')
        .select('id, status')
        .eq('audit_id', audit.id)
        .maybeSingle<ActionPlanSummaryRow>(),
    ])

  const sections = buildSections(
    sectionRows ?? [],
    questionRows ?? [],
    answerRows ?? []
  )
  const scorePreview = calculateScorePreview(sections)

  return (
    <AuditChecklist
      audit={toChecklistAudit(audit, store)}
      sections={sections}
      scorePreview={scorePreview}
      actionPlan={actionPlan ?? null}
      canManageActionPlans={profile.role !== 'leader'}
    />
  )
}
