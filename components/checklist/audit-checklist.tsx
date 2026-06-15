'use client'

import Link from 'next/link'
import { useActionState, useMemo, useState } from 'react'

import {
  completeAuditAction,
  initialCompleteAuditState,
  initialSaveAnswerState,
  saveAuditAnswerAction,
  type CompleteAuditState,
  type SaveAnswerState,
} from '@/app/audits/[auditId]/actions'
import type {
  ChecklistAudit,
  ChecklistQuestion,
  ChecklistSection,
  ScorePreview,
} from '@/components/checklist/types'

type AuditChecklistProps = {
  audit: ChecklistAudit
  sections: ChecklistSection[]
  scorePreview: ScorePreview
}

function formatStatus(status: string) {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatVisitType(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatScoreBand(value: string | null) {
  if (!value) {
    return 'Not finalized'
  }

  if (value === 'excellent') {
    return 'Excellent / Bonus Standard'
  }

  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatTime(value: string) {
  return value.slice(0, 5)
}

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

function scoreLabel(preview: ScorePreview) {
  if (preview.maxScore === 0 || preview.percentage === null) {
    return 'No scored answers yet'
  }

  return `${preview.totalScore}/${preview.maxScore} - ${preview.percentage}%`
}

function persistedScoreLabel(audit: ChecklistAudit) {
  if (audit.maxScore <= 0) {
    return 'Not finalized'
  }

  return `${audit.totalScore}/${audit.maxScore} - ${audit.percentage}%`
}

function StatusMessage({
  state,
}: {
  state: SaveAnswerState | CompleteAuditState
}) {
  if (!state.message) {
    return null
  }

  const tone =
    state.status === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : 'border-red-200 bg-red-50 text-red-800'

  return (
    <p
      aria-live="polite"
      className={`rounded-lg border px-3 py-2 text-sm font-medium ${tone}`}
    >
      {state.message}
    </p>
  )
}

function ReviewCompleteCard({
  audit,
  readOnly,
}: {
  audit: ChecklistAudit
  readOnly: boolean
}) {
  const [state, formAction, isPending] = useActionState(
    completeAuditAction,
    initialCompleteAuditState
  )
  const [confirmed, setConfirmed] = useState(false)
  const canComplete =
    !readOnly && (audit.status === 'draft' || audit.status === 'in_progress')

  return (
    <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <p className="text-sm font-semibold text-primary">
            Review & Complete
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-foreground">
            Finish this audit when the checklist is ready.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
            Completion calculates the final score through the secure database
            RPC, locks the audit, and makes completed audits read-only in the
            normal app flow. Unanswered required questions will block
            completion.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-background p-4 lg:min-w-72">
          <p className="text-xs font-semibold text-muted">Persisted score</p>
          <p className="mt-1 text-lg font-semibold text-foreground">
            {persistedScoreLabel(audit)}
          </p>
          <p className="mt-2 text-xs font-semibold text-muted">Rating</p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {formatScoreBand(audit.scoreBand)}
          </p>
          {audit.completedAt ? (
            <>
              <p className="mt-2 text-xs font-semibold text-muted">
                Completed
              </p>
              <p className="mt-1 text-sm font-semibold text-foreground">
                {formatDateTime(audit.completedAt)}
              </p>
            </>
          ) : null}
        </div>
      </div>

      {canComplete ? (
        <form action={formAction} className="mt-5 flex flex-col gap-4">
          <input type="hidden" name="audit_id" value={audit.id} />

          <label className="flex items-start gap-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-3 text-sm font-medium leading-6 text-amber-900">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(event) => setConfirmed(event.currentTarget.checked)}
              className="mt-1 size-4 accent-primary"
            />
            I understand this will calculate the final score and lock the
            audit.
          </label>

          <StatusMessage state={state} />

          <button
            type="submit"
            disabled={!confirmed || isPending}
            className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-muted"
          >
            {isPending ? 'Completing...' : 'Complete audit'}
          </button>
        </form>
      ) : (
        <div className="mt-5 rounded-lg border border-border bg-background px-3 py-3 text-sm font-medium text-muted">
          This audit is completed or locked. Completion actions are unavailable.
        </div>
      )}
    </section>
  )
}

function QuestionCard({
  auditId,
  question,
  readOnly,
}: {
  auditId: string
  question: ChecklistQuestion
  readOnly: boolean
}) {
  const [state, formAction, isPending] = useActionState(
    saveAuditAnswerAction,
    initialSaveAnswerState
  )
  const [isNa, setIsNa] = useState(question.answer?.isNa ?? false)
  const currentScore = question.answer?.score

  return (
    <article className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="flex flex-wrap gap-2">
            {question.isRequired ? (
              <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                Required
              </span>
            ) : (
              <span className="rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold text-muted">
                Optional
              </span>
            )}
            {question.isCritical ? (
              <span className="rounded-full border border-red-200 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700">
                Critical
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 text-base font-semibold leading-6 text-foreground">
            {question.questionText}
          </h3>
          {question.questionDescription ? (
            <p className="mt-2 text-sm leading-6 text-muted">
              {question.questionDescription}
            </p>
          ) : null}
        </div>
        <p className="shrink-0 rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground">
          Max {question.maxScore}
        </p>
      </div>

      <form action={formAction} className="mt-4 flex flex-col gap-4">
        <input type="hidden" name="audit_id" value={auditId} />
        <input type="hidden" name="question_id" value={question.id} />

        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          Score
          <input
            name="score"
            type="number"
            min={0}
            max={question.maxScore}
            step="1"
            disabled={readOnly || isNa}
            defaultValue={currentScore ?? ''}
            placeholder={`0-${question.maxScore}`}
            className="min-h-11 rounded-lg border border-border bg-surface px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background disabled:text-muted"
          />
        </label>

        <label className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-3 text-sm font-semibold text-foreground">
          <input
            name="is_na"
            type="checkbox"
            disabled={readOnly}
            defaultChecked={isNa}
            onChange={(event) => setIsNa(event.currentTarget.checked)}
            className="size-4 accent-primary"
          />
          Mark as N/A
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          Notes
          <textarea
            name="comment"
            rows={3}
            disabled={readOnly}
            defaultValue={question.answer?.comment ?? ''}
            placeholder="Optional notes"
            className="rounded-lg border border-border bg-surface px-3 py-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background disabled:text-muted"
          />
        </label>

        <StatusMessage state={state} />

        {readOnly ? (
          <p className="rounded-lg border border-border bg-background px-3 py-3 text-sm font-medium text-muted">
            This audit is read-only. Completed or locked audits cannot be edited
            in the normal app flow.
          </p>
        ) : (
          <button
            type="submit"
            disabled={isPending}
            className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-muted"
          >
            {isPending ? 'Saving...' : 'Save answer'}
          </button>
        )}
      </form>
    </article>
  )
}

export function AuditChecklist({
  audit,
  sections,
  scorePreview,
}: AuditChecklistProps) {
  const [activeSectionIndex, setActiveSectionIndex] = useState(0)
  const readOnly =
    audit.isLocked ||
    audit.status === 'completed' ||
    audit.status === 'archived'
  const activeSection = sections[activeSectionIndex] ?? null
  const answeredTotal = useMemo(
    () =>
      sections.reduce(
        (total, section) =>
          total +
          section.questions.filter(
            (question) =>
              question.answer
                ? question.answer.isNa || question.answer.score !== null
                : false
          ).length,
        0
      ),
    [sections]
  )
  const questionTotal = useMemo(
    () =>
      sections.reduce((total, section) => total + section.questions.length, 0),
    [sections]
  )

  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/90 px-4 py-4 shadow-sm">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              AT
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                Audit Trainer
              </p>
              <p className="text-xs font-medium text-muted">Checklist</p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">
                {audit.store.name} ({audit.store.code})
              </p>
              <h1 className="mt-2 text-3xl font-semibold text-foreground">
                Store audit checklist
              </h1>
              <p className="mt-3 text-sm leading-6 text-muted">
                {audit.visitDate} at {formatTime(audit.visitTime)} -{' '}
                {formatVisitType(audit.visitType)}
              </p>
              {audit.mod ? (
                <p className="mt-1 text-sm leading-6 text-muted">
                  MOD: {audit.mod}
                </p>
              ) : null}
            </div>

            <div className="grid gap-3 sm:grid-cols-3 lg:min-w-96">
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-xs font-semibold text-muted">Status</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {formatStatus(audit.status)}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-xs font-semibold text-muted">Lock state</p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {audit.isLocked ? 'Locked' : 'Unlocked'}
                </p>
              </div>
              <div className="rounded-xl border border-border bg-background p-3">
                <p className="text-xs font-semibold text-muted">
                  {audit.maxScore > 0 ? 'Final score' : 'Score preview'}
                </p>
                <p className="mt-1 text-sm font-semibold text-foreground">
                  {audit.maxScore > 0
                    ? persistedScoreLabel(audit)
                    : scoreLabel(scorePreview)}
                </p>
              </div>
            </div>
          </div>
        </section>

        {readOnly ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
            <p className="text-sm font-semibold">Read-only audit</p>
            <p className="mt-2 text-sm leading-6">
              This audit is completed or locked. You can review the checklist,
              but answer changes are disabled in the normal app flow.
            </p>
          </section>
        ) : null}

        <section className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-sm font-medium text-muted">Answered</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {answeredTotal}/{questionTotal}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-sm font-medium text-muted">Scored answers</p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {scorePreview.answeredCount}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-sm font-medium text-muted">
              {audit.maxScore > 0 ? 'Final rating' : 'Preview only'}
            </p>
            <p className="mt-2 text-xl font-semibold text-foreground">
              {audit.maxScore > 0 ? formatScoreBand(audit.scoreBand) : 'Not persisted'}
            </p>
          </div>
        </section>

        <ReviewCompleteCard audit={audit} readOnly={readOnly} />

        <nav
          aria-label="Checklist sections"
          className="flex gap-2 overflow-x-auto pb-1"
        >
          {sections.map((section, index) => {
            const isActive = index === activeSectionIndex

            return (
              <button
                key={section.id}
                type="button"
                onClick={() => setActiveSectionIndex(index)}
                className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                  isActive
                    ? 'border-primary bg-primary text-white'
                    : 'border-border bg-surface text-foreground hover:border-primary hover:text-primary'
                }`}
              >
                {index + 1}. {section.title}
              </button>
            )
          })}
        </nav>

        {activeSection ? (
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">
                  Section {activeSectionIndex + 1} of {sections.length}
                </p>
                <h2 className="mt-2 text-2xl font-semibold text-foreground">
                  {activeSection.title}
                </h2>
                {activeSection.description ? (
                  <p className="mt-2 text-sm leading-6 text-muted">
                    {activeSection.description}
                  </p>
                ) : null}
              </div>
              <p className="rounded-lg border border-border bg-background px-3 py-2 text-sm font-semibold text-muted">
                {activeSection.questions.length} questions
              </p>
            </div>

            <div className="mt-5 grid gap-4">
              {activeSection.questions.map((question) => (
                <QuestionCard
                  key={question.id}
                  auditId={audit.id}
                  question={question}
                  readOnly={readOnly}
                />
              ))}
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-between">
              <button
                type="button"
                disabled={activeSectionIndex === 0}
                onClick={() =>
                  setActiveSectionIndex((index) => Math.max(index - 1, 0))
                }
                className="min-h-11 rounded-lg border border-border bg-white px-5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:text-muted"
              >
                Previous section
              </button>
              <button
                type="button"
                disabled={activeSectionIndex === sections.length - 1}
                onClick={() =>
                  setActiveSectionIndex((index) =>
                    Math.min(index + 1, sections.length - 1)
                  )
                }
                className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-muted"
              >
                Next section
              </button>
            </div>
          </section>
        ) : (
          <section className="rounded-2xl border border-border bg-surface p-5 text-muted shadow-sm">
            No active checklist sections are available.
          </section>
        )}
      </section>
    </main>
  )
}
