import Link from 'next/link'

import type { PretSectionScores } from '@/components/checklist/types'
import type { AuditScoreBand, AuditStatus } from '@/types/audit'

export type AuditHistoryItem = {
  id: string
  storeName: string
  storeCode: string
  areaName: string
  creatorName: string
  creatorEmail: string | null
  status: AuditStatus
  isLocked: boolean
  visitDate: string
  visitTime: string
  totalScore: number
  maxScore: number
  percentage: number
  scoreBand: AuditScoreBand | null
  sectionScores: PretSectionScores | null
  scoringModelVersion: string
  createdAt: string
  completedAt: string | null
}

type AuditHistoryListProps = {
  audits: AuditHistoryItem[]
  activeStatus: AuditStatus | null
  activeScoreBand: AuditScoreBand | null
  searchQuery: string
}

const STATUS_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Draft', value: 'draft' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
] as const satisfies readonly {
  label: string
  value: AuditStatus | null
}[]

const SCORE_BAND_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Excellent', value: 'excellent' },
  { label: 'Good', value: 'good' },
  { label: 'Needs Focus', value: 'needs_focus' },
  { label: 'Critical', value: 'critical' },
] as const satisfies readonly {
  label: string
  value: AuditScoreBand | null
}[]

function formatStatus(status: AuditStatus) {
  return status
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatScoreBand(scoreBand: AuditScoreBand | null) {
  if (!scoreBand) {
    return 'Not scored'
  }

  return scoreBand
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatDate(value: string) {
  const [year, month, day] = value.split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}

function formatTime(value: string) {
  return value.slice(0, 5)
}

function isPretAudit(audit: AuditHistoryItem) {
  return audit.scoringModelVersion === 'pret_ce_v1'
}

function isCompleted(audit: AuditHistoryItem) {
  return audit.status === 'completed'
}

function toNumber(value: number | string | null | undefined) {
  if (value === null || value === undefined) {
    return 0
  }

  return Number(value)
}

function scoreLabel(audit: AuditHistoryItem) {
  if (isPretAudit(audit)) {
    if (!isCompleted(audit) || audit.maxScore <= 0) {
      return 'Not finalized'
    }

    const bonusScore = toNumber(audit.sectionScores?.bonus?.total_score)
    const bonusMaxScore = toNumber(audit.sectionScores?.bonus?.max_score) || 5

    return `${audit.totalScore}/${audit.maxScore} + ${bonusScore}/${bonusMaxScore} bonus`
  }

  if (!isCompleted(audit) || audit.maxScore <= 0) {
    return audit.status === 'draft' || audit.status === 'in_progress'
      ? 'Legacy draft'
      : 'Not finalized'
  }

  return `${audit.totalScore}/${audit.maxScore}`
}

function statusTone(status: AuditStatus) {
  if (status === 'completed') {
    return 'border-green-200 bg-green-50 text-green-800'
  }

  if (status === 'in_progress') {
    return 'border-amber-200 bg-amber-50 text-amber-900'
  }

  if (status === 'archived') {
    return 'border-border bg-background text-muted'
  }

  return 'border-primary/20 bg-primary/10 text-primary'
}

function scoreBandTone(scoreBand: AuditScoreBand | null) {
  if (scoreBand === 'excellent' || scoreBand === 'good') {
    return 'border-green-200 bg-green-50 text-green-800'
  }

  if (scoreBand === 'needs_focus') {
    return 'border-amber-200 bg-amber-50 text-amber-900'
  }

  if (scoreBand === 'critical') {
    return 'border-red-200 bg-red-50 text-red-800'
  }

  return 'border-border bg-background text-muted'
}

function buildHref({
  status,
  scoreBand,
  searchQuery,
}: {
  status: AuditStatus | null
  scoreBand: AuditScoreBand | null
  searchQuery: string
}) {
  const params = new URLSearchParams()

  if (status) {
    params.set('status', status)
  }

  if (scoreBand) {
    params.set('score_band', scoreBand)
  }

  if (searchQuery) {
    params.set('q', searchQuery)
  }

  const query = params.toString()

  return query ? `/audits?${query}` : '/audits'
}

function filterBySearch(audits: AuditHistoryItem[], searchQuery: string) {
  const normalizedSearch = searchQuery.trim().toLowerCase()

  if (!normalizedSearch) {
    return audits
  }

  return audits.filter((audit) => {
    const haystack = `${audit.storeName} ${audit.storeCode}`.toLowerCase()

    return haystack.includes(normalizedSearch)
  })
}

function hasFilters(
  activeStatus: AuditStatus | null,
  activeScoreBand: AuditScoreBand | null,
  searchQuery: string
) {
  return Boolean(activeStatus || activeScoreBand || searchQuery.trim())
}

export function AuditHistoryList({
  audits,
  activeStatus,
  activeScoreBand,
  searchQuery,
}: AuditHistoryListProps) {
  const filteredAudits = filterBySearch(audits, searchQuery)
  const filtersActive = hasFilters(activeStatus, activeScoreBand, searchQuery)

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
              <p className="text-xs font-medium text-muted">Audit History</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Back to dashboard
            </Link>
            <Link
              href="/start-audit"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Start New Audit
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-primary">Audit History</p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">
                Review audits in your scope
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
                Open drafts to continue the guided checklist, or review completed
                Pret CE scores with the core result and Outstanding Card bonus
                shown separately.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-xs font-semibold text-muted">Showing</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {filteredAudits.length} audits
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
            <form action="/audits" className="flex flex-col gap-2">
              <label
                htmlFor="audit-search"
                className="text-sm font-semibold text-foreground"
              >
                Search store
              </label>
              <div className="flex flex-col gap-2 sm:flex-row">
                <input
                  id="audit-search"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Store name or code"
                  className="min-h-11 flex-1 rounded-lg border border-border bg-background px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
                {activeStatus ? (
                  <input type="hidden" name="status" value={activeStatus} />
                ) : null}
                {activeScoreBand ? (
                  <input
                    type="hidden"
                    name="score_band"
                    value={activeScoreBand}
                  />
                ) : null}
                <button
                  type="submit"
                  className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  Search
                </button>
              </div>
            </form>

            <div className="flex items-end">
              <Link
                href="/audits"
                className="inline-flex min-h-11 w-full items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                Clear filters
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <div>
              <p className="text-sm font-semibold text-foreground">Status</p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {STATUS_OPTIONS.map((option) => {
                  const isActive = option.value === activeStatus

                  return (
                    <Link
                      key={option.label}
                      href={buildHref({
                        status: option.value,
                        scoreBand: activeScoreBand,
                        searchQuery,
                      })}
                      className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-background text-foreground hover:border-primary hover:text-primary'
                      }`}
                    >
                      {option.label}
                    </Link>
                  )
                })}
              </div>
            </div>

            <div>
              <p className="text-sm font-semibold text-foreground">
                Score band
              </p>
              <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                {SCORE_BAND_OPTIONS.map((option) => {
                  const isActive = option.value === activeScoreBand

                  return (
                    <Link
                      key={option.label}
                      href={buildHref({
                        status: activeStatus,
                        scoreBand: option.value,
                        searchQuery,
                      })}
                      className={`shrink-0 rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                        isActive
                          ? 'border-primary bg-primary text-white'
                          : 'border-border bg-background text-foreground hover:border-primary hover:text-primary'
                      }`}
                    >
                      {option.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>
        </section>

        {filteredAudits.length === 0 ? (
          <section className="rounded-2xl border border-border bg-surface p-6 text-muted shadow-sm">
            <p className="text-base font-semibold text-foreground">
              {filtersActive ? 'No audits match these filters.' : 'No audits found.'}
            </p>
            <p className="mt-2 text-sm leading-6">
              {filtersActive
                ? 'Clear the filters or try a different store search.'
                : 'Start a new audit to begin the Pret CE V1 guided checklist.'}
            </p>
            <Link
              href="/start-audit"
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Start New Audit
            </Link>
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {filteredAudits.map((audit) => (
              <article
                key={audit.id}
                className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    <span
                      className={`rounded-full border px-2 py-1 text-xs font-semibold ${statusTone(
                        audit.status
                      )}`}
                    >
                      {formatStatus(audit.status)}
                    </span>
                    <span className="rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold text-muted">
                      {audit.isLocked ? 'Locked' : 'Unlocked'}
                    </span>
                    {!isPretAudit(audit) ? (
                      <span className="rounded-full border border-amber-200 bg-amber-50 px-2 py-1 text-xs font-semibold text-amber-900">
                        Legacy checklist
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">
                        {audit.storeName}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-muted">
                        Store {audit.storeCode} - {audit.areaName}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Visit {formatDate(audit.visitDate)} at{' '}
                        {formatTime(audit.visitTime)}
                      </p>
                    </div>

                    <Link
                      href={`/audits/${audit.id}`}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      Open audit
                    </Link>
                  </div>
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-2">
                  <div className="rounded-xl border border-border bg-background p-3">
                    <dt className="text-xs font-semibold text-muted">Score</dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">
                      {scoreLabel(audit)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <dt className="text-xs font-semibold text-muted">
                      Score band
                    </dt>
                    <dd
                      className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${scoreBandTone(
                        audit.scoreBand
                      )}`}
                    >
                      {formatScoreBand(audit.scoreBand)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <dt className="text-xs font-semibold text-muted">
                      Auditor
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">
                      {audit.creatorName}
                    </dd>
                    {audit.creatorEmail ? (
                      <dd className="mt-1 break-words text-xs text-muted">
                        {audit.creatorEmail}
                      </dd>
                    ) : null}
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <dt className="text-xs font-semibold text-muted">
                      Created
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">
                      {formatDate(audit.createdAt.slice(0, 10))}
                    </dd>
                    {audit.completedAt ? (
                      <dd className="mt-1 text-xs text-muted">
                        Completed {formatDate(audit.completedAt.slice(0, 10))}
                      </dd>
                    ) : null}
                  </div>
                </dl>
              </article>
            ))}
          </section>
        )}
      </section>
    </main>
  )
}
