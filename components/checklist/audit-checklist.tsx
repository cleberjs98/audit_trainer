'use client'

import {
  useMemo,
  useRef,
  useState,
} from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  ClipboardCheck,
  Gauge,
  Star,
  Target,
} from 'lucide-react'

import { createActionPlanForAuditAction } from '@/app/action-plans/actions'
import {
  completeAuditAction,
  saveAuditAnswerAction,
} from '@/app/audits/[auditId]/actions'
import {
  ChecklistAnswer,
  ChecklistAudit,
  ChecklistQuestion,
  ChecklistSection,
  initialCompleteAuditState,
  initialSaveAnswerState,
  ScorePreview,
  type CompleteAuditState,
  type SaveAnswerState,
} from '@/components/checklist/types'
import {
  MobileAppHeader,
  MobileBottomNav,
} from '@/components/navigation/mobile-app-shell'
import type { UserRole } from '@/types/user'

type AuditChecklistProps = {
  audit: ChecklistAudit
  sections: ChecklistSection[]
  scorePreview: ScorePreview
  actionPlan: {
    id: string
    status: 'open' | 'in_progress' | 'completed'
  } | null
  canManageActionPlans: boolean
  userRole: UserRole
}

type WizardMode = 'question' | 'review'

type LocalAnswerMap = Record<string, ChecklistAnswer>

type DraftAnswer = {
  score: string
  isNa: boolean
  comment: string
}

type DraftAnswerMap = Record<string, DraftAnswer>

type WizardPosition = {
  mode: WizardMode
  index: number
}

type WizardState = WizardPosition

function formatDateTime(value: string | null) {
  if (!value) {
    return 'Not available'
  }

  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Dublin',
  }).format(new Date(value))
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return Number(value)
}

function isAnswered(question: ChecklistQuestion) {
  return question.answer
    ? question.answer.isNa || question.answer.score !== null
    : false
}

function hasValidRequiredCoreAnswer(question: ChecklistQuestion) {
  const score = question.answer?.score

  return (
    Boolean(question.answer) &&
    question.answer?.isNa === false &&
    typeof score === 'number' &&
    Number.isFinite(score) &&
    score >= 0 &&
    score <= question.maxScore
  )
}

function isRequiredCoreQuestion(question: ChecklistQuestion) {
  return (
    question.scoringModelVersion === 'pret_ce_v1' &&
    question.scoringGroup === 'core' &&
    question.requiredForCompletion
  )
}

function sectionLabel(question: ChecklistQuestion) {
  return question.scoringGroup === 'bonus'
    ? 'Outstanding Card Bonus'
    : 'Core Score'
}

function questionChipLabel(question: ChecklistQuestion) {
  if (question.scoringGroup === 'bonus') {
    return 'Bonus'
  }

  return String(question.displayNumber ?? question.orderIndex)
}

function questionStepperStatus(question: ChecklistQuestion) {
  if (!question.answer) {
    return 'unanswered'
  }

  if (question.answer.isNa) {
    return 'answered'
  }

  const score = question.answer.score

  if (question.scoringGroup === 'bonus') {
    return score === question.maxScore ? 'bonus-achieved' : 'bonus-none'
  }

  if (typeof score !== 'number') {
    return 'unanswered'
  }

  if (score >= 5) {
    return 'success'
  }

  if (score === 4) {
    return 'warning'
  }

  return 'danger'
}

function stepperMarkerClass(question: ChecklistQuestion, active: boolean) {
  const status = questionStepperStatus(question)
  const activeRing = active
    ? 'ring-4 ring-primary/35 ring-offset-2 ring-offset-surface shadow-[0_0_0_7px_rgba(209,31,58,0.08)]'
    : ''

  if (question.scoringGroup === 'bonus') {
    if (status === 'bonus-achieved') {
      return `border-accent bg-accent text-foreground shadow-[0_10px_22px_rgba(255,176,32,0.24)] ${activeRing}`
    }

    if (active) {
      return 'border-primary bg-white text-primary ring-4 ring-primary/35 ring-offset-2 ring-offset-surface shadow-[0_0_0_7px_rgba(209,31,58,0.08)]'
    }

    return 'border-border bg-white text-muted-strong'
  }

  if (status === 'success') {
    return `border-success bg-success text-white shadow-[0_10px_22px_rgba(18,183,106,0.20)] ${activeRing}`
  }

  if (status === 'warning') {
    return `border-warning bg-warning text-white shadow-[0_10px_22px_rgba(247,144,9,0.20)] ${activeRing}`
  }

  if (status === 'danger') {
    return `border-danger bg-danger text-white shadow-[0_10px_22px_rgba(240,68,56,0.20)] ${activeRing}`
  }

  if (active) {
    return 'border-primary bg-primary text-white shadow-[0_10px_22px_rgba(209,31,58,0.22)]'
  }

  return 'border-border bg-white text-muted-strong'
}

function stepperMarkerSubLabel(question: ChecklistQuestion) {
  const score = question.answer?.score

  if (!question.answer) {
    return ''
  }

  if (question.scoringGroup === 'bonus') {
    return typeof score === 'number' ? `${score}/${question.maxScore}` : ''
  }

  return typeof score === 'number' ? `${score}/${question.maxScore}` : ''
}

function stepperAriaLabel(question: ChecklistQuestion, active: boolean) {
  const prefix =
    question.scoringGroup === 'bonus'
      ? 'Go to bonus question'
      : `Go to question ${questionChipLabel(question)}`
  const score = question.answer?.score
  const status =
    question.answer && typeof score === 'number'
      ? `answered score ${score}`
      : question.answer?.isNa
        ? 'answered N/A'
        : 'unanswered'

  return `${prefix}, ${status}${active ? ', current' : ''}`
}

function persistedScoreLabel(audit: ChecklistAudit) {
  if (audit.maxScore <= 0) {
    return 'Not finalized'
  }

  if (audit.scoringModelVersion === 'pret_ce_v1') {
    const bonusScore = toNumber(audit.sectionScores?.bonus?.total_score)
    const bonusMaxScore = toNumber(audit.sectionScores?.bonus?.max_score) || 5

    return `${audit.totalScore}/${audit.maxScore} + ${bonusScore}/${bonusMaxScore} bonus`
  }

  return `${audit.totalScore}/${audit.maxScore} - ${audit.percentage}%`
}

function scoreLabel(preview: ScorePreview) {
  if (preview.coreMaxScore === 0 || preview.percentage === null) {
    return 'No scored answers yet'
  }

  return preview.combinedLabel
}

function statusTone(status: SaveAnswerState['status'] | CompleteAuditState['status']) {
  if (status === 'success') {
    return 'border-success/20 bg-success-soft text-success'
  }

  if (status === 'error') {
    return 'border-danger/20 bg-danger-soft text-danger'
  }

  return 'border-border bg-background text-muted'
}

function StatusMessage({
  state,
}: {
  state: SaveAnswerState | CompleteAuditState
}) {
  if (!state.message) {
    return null
  }

  return (
    <p
      aria-live="polite"
      className={`rounded-lg border px-3 py-2 text-sm font-medium ${statusTone(
        state.status
      )}`}
    >
      {state.message}
    </p>
  )
}

function ActionPlanAuditCallout({
  audit,
  actionPlan,
  canManageActionPlans,
}: {
  audit: ChecklistAudit
  actionPlan: AuditChecklistProps['actionPlan']
  canManageActionPlans: boolean
}) {
  const router = useRouter()
  const [state, setState] = useState<CompleteAuditState>({
    status: 'idle',
    message: '',
  })
  const [isCreating, setIsCreating] = useState(false)

  if (audit.status !== 'completed') {
    return (
      <section className="rounded-xl border border-border bg-surface-soft px-4 py-3 text-xs font-medium text-muted">
        Action plans become available after audit completion.
      </section>
    )
  }

  if (actionPlan) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-primary">Action Plan</p>
            <p className="mt-1 text-sm leading-6 text-muted">
              This completed audit already has a manual action plan.
            </p>
          </div>
          <Link
            href={`/action-plans/${actionPlan.id}`}
            className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            View Action Plan
          </Link>
        </div>
      </section>
    )
  }

  if (!canManageActionPlans) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4 text-sm text-muted shadow-sm">
        No action plan has been created yet.
      </section>
    )
  }

  async function handleCreateActionPlan() {
    setIsCreating(true)

    try {
      const result = await createActionPlanForAuditAction(audit.id)
      setState({
        status: result.status,
        message: result.message,
      })

      if (result.status === 'success' && result.actionPlanId) {
        router.push(`/action-plans/${result.actionPlanId}`)
      }
    } finally {
      setIsCreating(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">Action Plan</p>
          <p className="mt-1 text-sm leading-6 text-muted">
            Create a manual follow-up plan for this completed audit.
          </p>
        </div>
        <button
          type="button"
          disabled={isCreating}
          onClick={handleCreateActionPlan}
          className="min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted"
        >
          {isCreating ? 'Creating...' : 'Create Action Plan'}
        </button>
      </div>
      <div className="mt-3">
        <StatusMessage state={state} />
      </div>
    </section>
  )
}

function isRequiredCompletionMessage(message: string) {
  return message === 'Please complete all required questions before finishing the audit.'
}

function initialAnswerMap(sections: ChecklistSection[]) {
  return sections.reduce<LocalAnswerMap>((answers, section) => {
    section.questions.forEach((question) => {
      if (question.answer) {
        answers[question.id] = question.answer
      }
    })

    return answers
  }, {})
}

function flattenQuestions(
  sections: ChecklistSection[],
  answers: LocalAnswerMap
) {
  return sections
    .flatMap((section) =>
      section.questions.map((question) => ({
        ...question,
        answer: answers[question.id] ?? question.answer,
      }))
    )
    .sort((left, right) => {
      if (left.scoringGroup !== right.scoringGroup) {
        return left.scoringGroup === 'core' ? -1 : 1
      }

      const leftDisplay = left.displayNumber ?? left.orderIndex
      const rightDisplay = right.displayNumber ?? right.orderIndex

      if (leftDisplay !== rightDisplay) {
        return leftDisplay - rightDisplay
      }

      return left.orderIndex - right.orderIndex
    })
}

function initialDraftMap(questions: ChecklistQuestion[]) {
  return questions.reduce<DraftAnswerMap>((drafts, question) => {
    drafts[question.id] = {
      score:
        question.answer?.score === null || question.answer?.score === undefined
          ? ''
          : String(question.answer.score),
      isNa: question.answer?.isNa ?? false,
      comment: question.answer?.comment ?? '',
    }

    if (
      question.scoringGroup === 'bonus' &&
      question.responseType === 'boolean_score' &&
      drafts[question.id].score === ''
    ) {
      drafts[question.id].score = '0'
    }

    return drafts
  }, {})
}

function calculatePreview(questions: ChecklistQuestion[]): ScorePreview {
  const coreQuestions = questions.filter(
    (question) => question.scoringGroup === 'core'
  )
  const bonusQuestions = questions.filter(
    (question) => question.scoringGroup === 'bonus'
  )
  const coreScoredQuestions = coreQuestions.filter(
    (question) =>
      question.answer && !question.answer.isNa && question.answer.score !== null
  )
  const bonusScoredQuestions = bonusQuestions.filter(
    (question) =>
      question.answer && !question.answer.isNa && question.answer.score !== null
  )
  const coreScore = coreScoredQuestions.reduce(
    (total, question) => total + toNumber(question.answer?.score),
    0
  )
  const coreMaxScore = coreQuestions.reduce(
    (total, question) => total + toNumber(question.maxScore),
    0
  )
  const legacyCoreMaxScore = coreScoredQuestions.reduce(
    (total, question) => total + toNumber(question.maxScore),
    0
  )
  const displayCoreMaxScore = coreMaxScore > 0 ? coreMaxScore : legacyCoreMaxScore
  const bonusScore = bonusScoredQuestions.reduce(
    (total, question) => total + toNumber(question.answer?.score),
    0
  )
  const bonusMaxScore = bonusQuestions.reduce(
    (total, question) => total + toNumber(question.maxScore),
    0
  )
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

function getInitialWizardPosition(
  questions: ChecklistQuestion[]
): WizardPosition {
  const firstMissingCoreIndex = questions.findIndex(
    (question) =>
      isRequiredCoreQuestion(question) && !hasValidRequiredCoreAnswer(question)
  )

  if (firstMissingCoreIndex >= 0) {
    return { mode: 'question', index: firstMissingCoreIndex }
  }

  const firstMissingBonusIndex = questions.findIndex(
    (question) => question.scoringGroup === 'bonus' && !isAnswered(question)
  )

  if (firstMissingBonusIndex >= 0) {
    return { mode: 'question', index: firstMissingBonusIndex }
  }

  return { mode: 'review', index: Math.max(questions.length - 1, 0) }
}

function buildSavedAnswer(
  auditId: string,
  currentAnswers: LocalAnswerMap,
  state: NonNullable<SaveAnswerState['answer']>
): ChecklistAnswer {
  return {
    id: currentAnswers[state.questionId]?.id ?? `${auditId}:${state.questionId}`,
    auditId,
    questionId: state.questionId,
    score: state.score,
    maxScore: state.maxScore,
    isNa: state.isNa,
    comment: state.comment,
    isCriticalFlag: currentAnswers[state.questionId]?.isCriticalFlag ?? false,
  }
}

function QuestionInput({
  question,
  draft,
  readOnly,
  onDraftChange,
}: {
  question: ChecklistQuestion
  draft: DraftAnswer
  readOnly: boolean
  onDraftChange: (draft: DraftAnswer) => void
}) {
  const isPretQuestion = question.scoringModelVersion === 'pret_ce_v1'
  const isBonusBoolean =
    question.scoringGroup === 'bonus' &&
    question.responseType === 'boolean_score'
  const supportsNa = !isPretQuestion && question.scoringGroup !== 'bonus'
  const effectiveIsNa = supportsNa && draft.isNa

  if (isBonusBoolean) {
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-foreground">
          Outstanding Card bonus
        </legend>
        <p className="text-sm leading-6 text-muted">
          This bonus does not reduce the core score if it is not awarded.
        </p>
        <div className="grid gap-3">
          {[
            { label: 'No bonus / 0', value: '0' },
            {
              label: `Outstanding achieved / ${question.maxScore}`,
              value: String(question.maxScore),
            },
          ].map((option) => {
            const selected = draft.score === option.value

            return (
              <button
                key={option.value}
                type="button"
                disabled={readOnly}
                onClick={() => {
                  onDraftChange({ ...draft, score: option.value })
                }}
                className={`min-h-12 rounded-lg border px-4 text-left text-sm font-semibold transition ${
                  selected
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-background text-foreground hover:border-primary hover:text-primary'
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      </fieldset>
    )
  }

  if (isPretQuestion && question.scoringGroup === 'core') {
    return (
      <fieldset className="flex flex-col gap-3">
        <legend className="text-sm font-semibold text-foreground">
          Score
        </legend>
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {Array.from({ length: question.maxScore + 1 }, (_, score) => {
            const value = String(score)
            const selected = draft.score === value

            return (
              <button
                key={value}
                type="button"
                disabled={readOnly}
                onClick={() => {
                  onDraftChange({ ...draft, score: value, isNa: false })
                }}
                className={`min-h-12 rounded-xl border text-base font-bold transition ${
                  selected
                    ? 'border-primary bg-primary text-white shadow-[0_10px_22px_rgba(209,31,58,0.20)]'
                    : 'border-border bg-white text-foreground hover:border-primary hover:text-primary'
                } disabled:cursor-not-allowed disabled:opacity-70`}
              >
                {score}
              </button>
            )
          })}
        </div>
      </fieldset>
    )
  }

  return (
    <>
      <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
        Score
        <select
          value={draft.score}
          disabled={readOnly || effectiveIsNa}
          onChange={(event) =>
            onDraftChange({ ...draft, score: event.currentTarget.value })
          }
          className="min-h-12 rounded-xl border border-border bg-surface px-3 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:bg-background disabled:text-muted"
        >
          <option value="">Select score</option>
          {Array.from({ length: question.maxScore + 1 }, (_, score) => (
            <option key={score} value={score}>
              {score}
            </option>
          ))}
        </select>
      </label>

      {supportsNa ? (
        <label className="flex min-h-12 items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            disabled={readOnly}
            checked={draft.isNa}
            onChange={(event) =>
              onDraftChange({
                ...draft,
                isNa: event.currentTarget.checked,
                score: event.currentTarget.checked ? '' : draft.score,
              })
            }
            className="size-4 accent-primary"
          />
          Mark as N/A
        </label>
      ) : null}
    </>
  )
}

function ReviewCompleteCard({
  audit,
  readOnly,
  questions,
  answeredCoreCount,
  requiredCoreCount,
  missingRequiredCoreQuestions,
  preview,
  onQuestionSelect,
}: {
  audit: ChecklistAudit
  readOnly: boolean
  questions: ChecklistQuestion[]
  answeredCoreCount: number
  requiredCoreCount: number
  missingRequiredCoreQuestions: ChecklistQuestion[]
  preview: ScorePreview
  onQuestionSelect: (index: number) => void
}) {
  const router = useRouter()
  const [state, setState] = useState<CompleteAuditState>(
    initialCompleteAuditState
  )
  const [confirmed, setConfirmed] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)
  const canComplete =
    !readOnly && (audit.status === 'draft' || audit.status === 'in_progress')
  const hasMissingRequired = missingRequiredCoreQuestions.length > 0
  const shouldShowCompletionState =
    !isRequiredCompletionMessage(state.message) || hasMissingRequired

  async function handleCompleteAudit() {
    if (hasMissingRequired) {
      setState({
        status: 'error',
        message: 'Please complete all required questions before finishing the audit.',
      })
      return
    }

    if (!confirmed) {
      setState({
        status: 'error',
        message: 'Please confirm that you understand the audit will be locked.',
      })
      return
    }

    setIsCompleting(true)

    try {
      const result = await completeAuditAction(audit.id)
      setState(result)

      if (result.status === 'success') {
        router.refresh()
      }
    } finally {
      setIsCompleting(false)
    }
  }

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Review & Complete</p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            Ready to finish?
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted">
            Review the score, jump back to any missing question, then complete
            the audit when everything is ready.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs font-semibold text-muted">Core answered</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {answeredCoreCount}/{requiredCoreCount}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs font-semibold text-muted">Missing required</p>
            <p className="mt-1 text-lg font-semibold text-foreground">
              {missingRequiredCoreQuestions.length}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs font-semibold text-muted">
              {audit.maxScore > 0 ? 'Final score' : 'Preview'}
            </p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {audit.maxScore > 0 ? persistedScoreLabel(audit) : scoreLabel(preview)}
            </p>
          </div>
        </div>

        {missingRequiredCoreQuestions.length > 0 ? (
          <div className="rounded-xl border border-warning/20 bg-warning-soft p-3 text-warning">
            <p className="text-sm font-semibold">
              Complete these required questions first:
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {missingRequiredCoreQuestions.map((question) => {
                const questionIndex = questions.findIndex(
                  (item) => item.id === question.id
                )

                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => {
                      onQuestionSelect(questionIndex)
                    }}
                    className="min-h-10 rounded-lg border border-warning/30 bg-white px-3 text-sm font-semibold text-warning"
                  >
                    {questionChipLabel(question)}
                  </button>
                )
              })}
            </div>
          </div>
        ) : null}

        {audit.completedAt ? (
          <div className="rounded-xl border border-border bg-background p-3">
            <p className="text-xs font-semibold text-muted">Completed</p>
            <p className="mt-1 text-sm font-semibold text-foreground">
              {formatDateTime(audit.completedAt)}
            </p>
          </div>
        ) : null}
      </div>

      {canComplete ? (
        <div className="mt-5 flex flex-col gap-4">
          {hasMissingRequired ? (
            <div className="rounded-lg border border-warning/20 bg-warning-soft px-3 py-3 text-sm font-medium leading-6 text-warning">
              Completion is locked until every required core question is
              answered.
            </div>
          ) : (
            <>
              <label className="flex items-start gap-3 rounded-lg border border-warning/20 bg-warning-soft px-3 py-3 text-sm font-medium leading-6 text-warning">
                <input
                  type="checkbox"
                  checked={confirmed}
                  onChange={(event) => setConfirmed(event.currentTarget.checked)}
                  className="mt-1 size-4 accent-primary"
                />
                I understand this will calculate the final score and lock the
                audit.
              </label>

              {!confirmed ? (
                <div className="rounded-lg border border-border bg-background px-3 py-3 text-sm font-medium text-muted">
                  Please confirm that you understand the audit will be locked.
                </div>
              ) : null}
            </>
          )}

          {shouldShowCompletionState ? <StatusMessage state={state} /> : null}

          <button
            type="button"
            disabled={!confirmed || hasMissingRequired || isCompleting}
            onClick={handleCompleteAudit}
            className="min-h-12 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-muted"
          >
            {isCompleting ? 'Completing...' : 'Complete Audit'}
          </button>
        </div>
      ) : (
        <div className="mt-5 rounded-lg border border-border bg-background px-3 py-3 text-sm font-medium text-muted">
          This audit is completed or locked. Completion actions are unavailable.
        </div>
      )}
    </section>
  )
}

export function AuditChecklist({
  audit,
  sections,
  scorePreview,
  actionPlan,
  canManageActionPlans,
  userRole,
}: AuditChecklistProps) {
  const initialAnswers = useMemo(() => initialAnswerMap(sections), [sections])
  const initialQuestions = useMemo(
    () => flattenQuestions(sections, initialAnswers),
    [sections, initialAnswers]
  )
  const initialPosition = useMemo(
    () => getInitialWizardPosition(initialQuestions),
    [initialQuestions]
  )
  const [answers, setAnswers] = useState<LocalAnswerMap>(initialAnswers)
  const [drafts, setDrafts] = useState<DraftAnswerMap>(() =>
    initialDraftMap(initialQuestions)
  )
  const [wizard, setWizard] = useState<WizardState>(initialPosition)
  const [saveState, setSaveState] =
    useState<SaveAnswerState>(initialSaveAnswerState)
  const [isSaving, setIsSaving] = useState(false)
  const questionCardRef = useRef<HTMLDivElement>(null)
  const readOnly =
    audit.isLocked ||
    audit.status === 'completed' ||
    audit.status === 'archived'
  const questions = useMemo(
    () => flattenQuestions(sections, answers),
    [sections, answers]
  )
  const boundedStepIndex =
    questions.length > 0
      ? Math.min(wizard.index, questions.length - 1)
      : 0
  const currentQuestion = questions[boundedStepIndex] ?? null
  const preview = useMemo(
    () => (questions.length > 0 ? calculatePreview(questions) : scorePreview),
    [questions, scorePreview]
  )
  const answeredTotal = questions.filter((question) => isAnswered(question)).length
  const requiredCoreQuestions = questions.filter((question) =>
    isRequiredCoreQuestion(question)
  )
  const missingRequiredCoreQuestions = requiredCoreQuestions.filter(
    (question) => !hasValidRequiredCoreAnswer(question)
  )
  const answeredCoreCount =
    requiredCoreQuestions.length - missingRequiredCoreQuestions.length
  const progressValue =
    questions.length > 0
      ? Math.round((answeredTotal / questions.length) * 100)
      : 0
  const currentDraft =
    currentQuestion &&
    (drafts[currentQuestion.id] ??
      initialDraftMap([currentQuestion])[currentQuestion.id])

  function scrollQuestionIntoView() {
    window.setTimeout(() => {
      questionCardRef.current?.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest',
      })
    }, 0)
  }

  function handleJumpToStep(index: number) {
    const nextIndex = Math.max(0, Math.min(index, questions.length - 1))

    if (questions.length === 0) {
      return
    }

    setWizard({ mode: 'question', index: nextIndex })
    setSaveState(initialSaveAnswerState)
    scrollQuestionIntoView()
  }

  function handleBack() {
    if (boundedStepIndex <= 0) {
      return
    }

    const nextIndex = boundedStepIndex - 1

    setWizard({ mode: 'question', index: nextIndex })
    setSaveState(initialSaveAnswerState)
    scrollQuestionIntoView()
  }

  function updateDraft(questionId: string, draft: DraftAnswer) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [questionId]: draft,
    }))
  }

  async function handleSaveAndContinue() {
    if (!currentQuestion || readOnly) {
      return
    }

    const draft = currentDraft

    if (!draft) {
      return
    }

    const savedQuestionId = currentQuestion.id
    const nextStepIndex = boundedStepIndex + 1
    const formData = new FormData()

    formData.set('audit_id', audit.id)
    formData.set('question_id', savedQuestionId)
    formData.set('score', draft.score)
    formData.set('comment', draft.comment)

    if (draft.isNa) {
      formData.set('is_na', 'on')
    }

    setIsSaving(true)

    try {
      const result = await saveAuditAnswerAction(initialSaveAnswerState, formData)
      setSaveState(result)

      if (result.status !== 'success' || !result.answer) {
        return
      }

      setAnswers((currentAnswers) => ({
        ...currentAnswers,
        [result.answer!.questionId]: buildSavedAnswer(
          audit.id,
          currentAnswers,
          result.answer!
        ),
      }))
      setDrafts((currentDrafts) => ({
        ...currentDrafts,
        [result.answer!.questionId]: {
          score: result.answer!.score === null ? '' : String(result.answer!.score),
          isNa: result.answer!.isNa,
          comment: result.answer!.comment ?? '',
        },
      }))

      if (nextStepIndex < questions.length) {
        setWizard({ mode: 'question', index: nextStepIndex })
      } else {
        setWizard({ mode: 'review', index: boundedStepIndex })
      }

      scrollQuestionIntoView()
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="relative z-10 pointer-events-auto bg-background">
      <MobileAppHeader
        title="Audit Checklist"
        subtitle={audit.store.name}
        actionHref="/audits"
        actionLabel="History"
      />
      <section className="relative z-10 mx-auto flex w-full max-w-4xl flex-col gap-4 px-4 pb-28 pt-4 sm:px-6 lg:pb-8">
        <nav
          aria-label="Audit navigation"
          className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
        >
          <Link
            href="/audits"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
          >
            Back to Audit History
          </Link>
          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-surface px-4 text-sm font-semibold text-foreground shadow-sm transition hover:border-primary hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
          >
            Dashboard
          </Link>
        </nav>

        <section className="sticky top-0 z-30 rounded-[1.5rem] border border-border bg-surface/95 p-4 shadow-[0_18px_45px_rgba(23,26,31,0.10)] backdrop-blur">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-start gap-3">
              <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary-soft text-primary">
                <ClipboardCheck aria-hidden="true" className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {wizard.mode === 'review'
                    ? 'Review'
                    : currentQuestion
                      ? `Question ${boundedStepIndex + 1} of ${questions.length}`
                      : 'Checklist'}
                </p>
                <p className="mt-1 text-xl font-semibold text-foreground sm:text-2xl">
                  {audit.maxScore > 0
                    ? persistedScoreLabel(audit)
                    : scoreLabel(preview)}
                </p>
                <p className="mt-1 text-xs font-medium text-muted">
                  {answeredTotal}/{questions.length} answered
                </p>
              </div>
            </div>
            <div className="rounded-2xl border border-primary/20 bg-primary-soft px-4 py-3 text-lg font-bold text-primary">
              {progressValue}%
            </div>
          </div>

          <div
            aria-hidden="true"
            className="mt-3 h-2.5 overflow-hidden rounded-full bg-background"
          >
            <div
              className="h-full rounded-full bg-primary transition-all"
              style={{ width: `${progressValue}%` }}
            />
          </div>

          {questions.length > 0 ? (
            <nav aria-label="Jump to question" className="mt-3">
              <div className="relative overflow-x-auto pb-2 pt-2">
                <div
                  aria-hidden="true"
                  className="absolute left-6 right-6 top-7 h-1 rounded-full bg-border"
                />
                <div className="relative flex min-w-max gap-3 px-1">
                {questions.map((question, index) => {
                  const active =
                    wizard.mode === 'question' && index === boundedStepIndex
                  const subLabel = stepperMarkerSubLabel(question)

                  return (
                    <button
                      key={question.id}
                      type="button"
                      onClick={() => handleJumpToStep(index)}
                      className="group relative z-10 flex shrink-0 flex-col items-center gap-1 focus:outline-none"
                      aria-current={active ? 'step' : undefined}
                      aria-label={stepperAriaLabel(question, active)}
                    >
                      <span
                        className={`flex size-10 items-center justify-center border-2 text-xs font-black transition group-hover:scale-105 ${
                          question.scoringGroup === 'bonus'
                            ? 'rounded-full text-base'
                            : 'rounded-full'
                        } ${stepperMarkerClass(question, active)}`}
                      >
                        {question.scoringGroup === 'bonus'
                          ? '★'
                          : questionChipLabel(question)}
                      </span>
                      {subLabel ? (
                        <span
                          className={`h-4 max-w-14 truncate text-[0.65rem] font-semibold ${
                            active ? 'text-primary' : 'text-muted'
                          }`}
                        >
                          {subLabel}
                        </span>
                      ) : (
                        <span
                          aria-hidden="true"
                          className={`mt-1 size-1.5 rounded-full ${
                            active ? 'bg-primary' : 'bg-border'
                          }`}
                        />
                      )}
                    </button>
                  )
                })}
                </div>
              </div>
            </nav>
          ) : null}
        </section>

        {readOnly ? (
          <section className="rounded-2xl border border-warning/20 bg-warning-soft p-4 text-warning shadow-sm">
            <p className="text-sm font-semibold">Read-only audit</p>
            <p className="mt-2 text-sm leading-6">
              This audit is completed or locked. You can review the checklist,
              but answer changes are disabled in the normal app flow.
            </p>
          </section>
        ) : null}

        {audit.scoringModelVersion === 'legacy_62_v1' ? (
          <section className="rounded-2xl border border-warning/20 bg-warning-soft p-4 text-warning shadow-sm">
            <p className="text-sm font-semibold">Legacy checklist model</p>
            <p className="mt-2 text-sm leading-6">
              This audit was created with the legacy checklist model. Start a
              new audit to use the Pret CE V1 checklist.
            </p>
          </section>
        ) : null}

        <ActionPlanAuditCallout
          audit={audit}
          actionPlan={actionPlan}
          canManageActionPlans={canManageActionPlans}
        />

        <div
          ref={questionCardRef}
          className="relative z-10 pointer-events-auto"
        >
          {wizard.mode === 'review' ? (
            <ReviewCompleteCard
              audit={audit}
              readOnly={readOnly}
              questions={questions}
              answeredCoreCount={answeredCoreCount}
              requiredCoreCount={requiredCoreQuestions.length}
              missingRequiredCoreQuestions={missingRequiredCoreQuestions}
              preview={preview}
              onQuestionSelect={handleJumpToStep}
            />
          ) : currentQuestion ? (
            <section className="app-card rounded-[1.5rem] p-3 sm:p-4">
              <article className="rounded-[1.35rem] border border-border bg-white p-4 shadow-sm sm:p-5">
                <div className="flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-soft px-2 py-1 text-xs font-semibold text-primary">
                      {currentQuestion.scoringGroup === 'bonus' ? (
                        <Star aria-hidden="true" className="size-3.5" />
                      ) : (
                        <Target aria-hidden="true" className="size-3.5" />
                      )}
                      {sectionLabel(currentQuestion)}
                    </span>
                    {currentQuestion.isRequired ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold text-muted">
                        <AlertCircle aria-hidden="true" className="size-3.5" />
                        Required
                      </span>
                    ) : (
                      <span className="rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold text-muted">
                        Optional
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold text-muted">
                      <Gauge aria-hidden="true" className="size-3.5" />
                      Max {currentQuestion.maxScore}
                    </span>
                  </div>

                  <h2 className="text-xl font-semibold leading-7 text-foreground sm:text-2xl sm:leading-8">
                    {currentQuestion.displayNumber
                      ? `${currentQuestion.displayNumber}. `
                      : ''}
                    {currentQuestion.questionText}
                  </h2>

                  {currentQuestion.questionDescription ? (
                    <p className="text-sm leading-6 text-muted">
                      {currentQuestion.questionDescription}
                    </p>
                  ) : null}
                </div>

                <div className="mt-5 flex flex-col gap-4">
                  <QuestionInput
                    question={currentQuestion}
                    draft={currentDraft}
                    readOnly={readOnly}
                    onDraftChange={(draft) =>
                      updateDraft(currentQuestion.id, draft)
                    }
                  />

                  <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
                    Notes
                    <textarea
                      rows={3}
                      disabled={readOnly}
                      value={
                        drafts[currentQuestion.id]?.comment ??
                        currentQuestion.answer?.comment ??
                        ''
                      }
                      onChange={(event) =>
                        updateDraft(currentQuestion.id, {
                          ...(drafts[currentQuestion.id] ??
                            initialDraftMap([currentQuestion])[
                              currentQuestion.id
                            ]),
                          comment: event.currentTarget.value,
                        })
                      }
                      placeholder="Optional notes"
                      className="rounded-xl border border-border bg-surface px-3 py-3 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15 disabled:bg-background disabled:text-muted"
                    />
                  </label>

                  <StatusMessage state={saveState} />

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      disabled={boundedStepIndex === 0}
                      onClick={handleBack}
                      className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:text-muted"
                    >
                      <ArrowLeft aria-hidden="true" className="size-4" />
                      Back
                    </button>

                    {readOnly ? (
                      <div className="min-h-12 rounded-lg border border-border bg-background px-4 py-3 text-center text-sm font-semibold text-muted">
                        Read-only
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={isSaving}
                        onClick={handleSaveAndContinue}
                        className="app-primary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted"
                      >
                        <span>
                          {isSaving
                            ? 'Saving...'
                            : boundedStepIndex === questions.length - 1
                              ? 'Save & Review'
                              : 'Save & Continue'}
                        </span>
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </button>
                    )}
                  </div>

                </div>
              </article>
            </section>
          ) : (
            <section className="rounded-2xl border border-border bg-surface p-5 text-muted shadow-sm">
              No active checklist questions are available.
            </section>
          )}
        </div>
      </section>
      <MobileBottomNav role={userRole} active="audits" />
    </main>
  )
}
