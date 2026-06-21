import Link from 'next/link'
import {
  ArrowRight,
  Calendar,
  CircleCheck,
  ClipboardList,
  Clock,
  FileText,
  Lock,
  LockOpen,
  Plus,
  Search,
  SlidersHorizontal,
  Store,
  User,
  type LucideIcon,
} from 'lucide-react'

import type { PretSectionScores } from '@/components/checklist/types'
import {
  MobileAppHeader,
  MobileBottomNav,
} from '@/components/navigation/mobile-app-shell'
import { AuditHistoryDeleteAction } from '@/components/audit-history/audit-history-delete-action'
import type { AuditScoreBand, AuditStatus } from '@/types/audit'
import type { UserRole } from '@/types/user'

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
  canDelete: boolean
}

type AuditHistoryListProps = {
  audits: AuditHistoryItem[]
  activeStatus: AuditStatus | null
  activeScoreBand: AuditScoreBand | null
  searchQuery: string
  userRole: UserRole
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
    return 'border-success/20 bg-success-soft text-success'
  }

  if (status === 'in_progress') {
    return 'border-warning/20 bg-warning-soft text-warning'
  }

  if (status === 'archived') {
    return 'border-border bg-background text-muted'
  }

  return 'border-primary/20 bg-primary-soft text-primary'
}

function statusIcon(status: AuditStatus): LucideIcon {
  if (status === 'completed') {
    return CircleCheck
  }

  if (status === 'in_progress') {
    return Clock
  }

  if (status === 'draft') {
    return FileText
  }

  return ClipboardList
}

function scoreBandTone(scoreBand: AuditScoreBand | null) {
  if (scoreBand === 'excellent' || scoreBand === 'good') {
    return 'border-success/20 bg-success-soft text-success'
  }

  if (scoreBand === 'needs_focus') {
    return 'border-warning/20 bg-warning-soft text-warning'
  }

  if (scoreBand === 'critical') {
    return 'border-danger/20 bg-danger-soft text-danger'
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
  userRole,
}: AuditHistoryListProps) {
  const filteredAudits = filterBySearch(audits, searchQuery)
  const filtersActive = hasFilters(activeStatus, activeScoreBand, searchQuery)

  return (
    <main className="min-h-screen bg-background">
      <MobileAppHeader
        title="Audit History"
        subtitle={`${filteredAudits.length} audits in scope`}
        actionHref="/start-audit"
        actionLabel="Start"
      />

      <header className="app-topbar hidden border-b px-4 py-4 lg:block">
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

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-28 pt-4 sm:px-6 lg:gap-5 lg:px-8 lg:pb-8 lg:pt-6">
        <section className="rounded-[1.5rem] border border-white/10 bg-info p-4 text-white shadow-[0_18px_45px_rgba(23,26,31,0.14)] lg:hidden">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Audit History
              </p>
              <h1 className="mt-1 text-2xl font-semibold">Audit History</h1>
              <p className="mt-1 text-sm text-slate-300">
                {filteredAudits.length}{' '}
                {filteredAudits.length === 1 ? 'audit' : 'audits'} in scope
              </p>
            </div>
            <Link
              href="/start-audit"
              aria-label="Start audit"
              className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary text-white shadow-[0_12px_26px_rgba(209,31,58,0.28)] transition hover:bg-primary-dark focus:outline-none focus:ring-4 focus:ring-primary/25"
            >
              <Plus aria-hidden="true" className="size-6" />
            </Link>
          </div>
        </section>

        <section className="app-card hidden rounded-[1.5rem] p-5 sm:p-7 lg:block">
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
            <div className="rounded-2xl border border-border bg-surface-soft px-4 py-3">
              <p className="text-xs font-semibold text-muted">Showing</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {filteredAudits.length} audits
              </p>
            </div>
          </div>
        </section>

        <section className="app-card rounded-[1.25rem] p-3 sm:p-4">
          <div className="grid gap-3 lg:grid-cols-[1.2fr_1fr] lg:gap-4">
            <form action="/audits" className="flex flex-col gap-2">
              <label
                htmlFor="audit-search"
                className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted lg:text-sm lg:normal-case lg:tracking-normal lg:text-foreground"
              >
                <Search aria-hidden="true" className="size-4 text-primary" />
                Search store
              </label>
              <div className="flex gap-2">
                <input
                  id="audit-search"
                  name="q"
                  defaultValue={searchQuery}
                  placeholder="Store name or code"
                  className="min-h-10 min-w-0 flex-1 rounded-xl border border-border bg-background px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 sm:min-h-11"
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
                  className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-3 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20 sm:min-h-11 sm:px-5"
                >
                  <Search aria-hidden="true" className="size-4 sm:hidden" />
                  <span className="sr-only sm:not-sr-only">Search</span>
                </button>
              </div>
            </form>

            <div className="flex items-end justify-start lg:justify-end">
              <Link
                href="/audits"
                className="inline-flex min-h-10 w-auto items-center justify-center rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 sm:min-h-11 sm:px-4 lg:w-full"
              >
                Clear filters
              </Link>
            </div>
          </div>

          <div className="mt-4 grid gap-4 lg:mt-5 lg:grid-cols-2">
            <div>
              <p className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted lg:text-sm lg:normal-case lg:tracking-normal lg:text-foreground">
                <SlidersHorizontal
                  aria-hidden="true"
                  className="size-4 text-primary"
                />
                Status
              </p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:mt-3">
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
                    className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition sm:px-4 ${
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
              <p className="text-xs font-semibold uppercase tracking-wide text-muted lg:text-sm lg:normal-case lg:tracking-normal lg:text-foreground">
                Score band
              </p>
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1 lg:mt-3">
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
                    className={`shrink-0 rounded-full border px-3 py-2 text-sm font-semibold transition sm:px-4 ${
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
          <section className="grid gap-3">
            {filteredAudits.map((audit) => (
              <article
                key={audit.id}
                className="app-card rounded-[1.25rem] p-3 transition hover:border-primary/30 hover:shadow-[0_18px_40px_rgba(23,26,31,0.10)] sm:p-4"
              >
                <div className="grid gap-3 xl:grid-cols-[1fr_18rem_auto] xl:items-center">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary-soft text-primary sm:size-12">
                      <Store aria-hidden="true" className="size-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex flex-wrap gap-2">
                        {(() => {
                          const StatusIcon = statusIcon(audit.status)

                          return (
                            <span
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${statusTone(
                                audit.status
                              )}`}
                            >
                              <StatusIcon
                                aria-hidden="true"
                                className="size-3.5"
                              />
                              {formatStatus(audit.status)}
                            </span>
                          )
                        })()}
                        <span className="rounded-full border border-border bg-surface-soft px-2 py-1 text-xs font-semibold text-muted">
                          {audit.isLocked ? (
                            <Lock aria-hidden="true" className="mr-1 inline size-3.5" />
                          ) : (
                            <LockOpen aria-hidden="true" className="mr-1 inline size-3.5" />
                          )}
                          {audit.isLocked ? 'Locked' : 'Unlocked'}
                        </span>
                        {!isPretAudit(audit) ? (
                          <span className="rounded-full border border-warning/20 bg-warning-soft px-2 py-1 text-xs font-semibold text-warning">
                            Legacy
                          </span>
                        ) : null}
                      </div>
                      <h2 className="mt-2 text-base font-semibold text-foreground sm:text-lg">
                        {audit.storeName}
                      </h2>
                      <p className="text-xs font-semibold text-muted sm:text-sm">
                        {isPretAudit(audit)
                          ? 'Pret CE V1 checklist'
                          : 'Legacy checklist'}
                      </p>
                      <p className="text-sm font-medium text-muted">
                        Store {audit.storeCode} - {audit.areaName}
                      </p>
                      <div className="mt-1 flex flex-col gap-1 text-sm leading-6 text-muted sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-3">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar
                            aria-hidden="true"
                            className="size-4 text-muted-strong"
                          />
                          Visit {formatDate(audit.visitDate)} at{' '}
                          {formatTime(audit.visitTime)}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <User
                            aria-hidden="true"
                            className="size-4 text-muted-strong"
                          />
                          {audit.creatorName}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-2 sm:gap-3">
                    <div className="rounded-xl border border-border bg-surface-soft p-3">
                      <p className="text-xs font-semibold text-muted">Score</p>
                      <p className="mt-1 text-sm font-semibold text-foreground">
                        {scoreLabel(audit)}
                      </p>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-soft p-3">
                      <p className="text-xs font-semibold text-muted">Band</p>
                      <span
                        className={`mt-2 inline-flex rounded-full border px-2 py-1 text-xs font-semibold ${scoreBandTone(
                          audit.scoreBand
                        )}`}
                      >
                        {formatScoreBand(audit.scoreBand)}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-2">
                    <Link
                      href={`/audits/${audit.id}`}
                      className="app-primary-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold text-white transition focus:outline-none focus:ring-4 focus:ring-primary/20"
                    >
                      Open audit
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>

                    {audit.canDelete ? (
                      <AuditHistoryDeleteAction auditId={audit.id} />
                    ) : null}
                  </div>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>
      <MobileBottomNav role={userRole} active="audits" />
    </main>
  )
}
