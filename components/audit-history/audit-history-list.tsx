import Link from 'next/link'

import type { AuditStatus } from '@/types/audit'

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
  createdAt: string
}

type AuditHistoryListProps = {
  audits: AuditHistoryItem[]
  activeStatus: AuditStatus | null
}

const STATUS_OPTIONS = [
  { label: 'All statuses', value: null },
  { label: 'Draft', value: 'draft' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
  { label: 'Archived', value: 'archived' },
] as const satisfies readonly {
  label: string
  value: AuditStatus | null
}[]

function formatStatus(status: AuditStatus) {
  return status
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

function scoreLabel(audit: AuditHistoryItem) {
  if (audit.maxScore <= 0) {
    return 'Not finalized'
  }

  return `${audit.totalScore}/${audit.maxScore} - ${audit.percentage}%`
}

function statusHref(status: AuditStatus | null) {
  return status ? `/audits?status=${status}` : '/audits'
}

export function AuditHistoryList({
  audits,
  activeStatus,
}: AuditHistoryListProps) {
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

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-primary">Audit History</p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            Review audits available to your role.
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
            This list is read-only. Open an audit to continue checklist work or
            review a completed audit inside your assigned store or area scope.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">
            Filter by status
          </p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {STATUS_OPTIONS.map((option) => {
              const isActive = option.value === activeStatus

              return (
                <Link
                  key={option.label}
                  href={statusHref(option.value)}
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
        </section>

        {audits.length === 0 ? (
          <section className="rounded-2xl border border-border bg-surface p-6 text-muted shadow-sm">
            <p className="text-base font-semibold text-foreground">
              No audits found.
            </p>
            <p className="mt-2 text-sm leading-6">
              Start a new audit or change the status filter to see available
              audit records.
            </p>
          </section>
        ) : (
          <section className="grid gap-4">
            {audits.map((audit) => (
              <article
                key={audit.id}
                className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <span className="rounded-full border border-primary/20 bg-primary/10 px-2 py-1 text-xs font-semibold text-primary">
                        {formatStatus(audit.status)}
                      </span>
                      <span className="rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold text-muted">
                        {audit.isLocked ? 'Locked' : 'Unlocked'}
                      </span>
                    </div>
                    <h2 className="mt-3 text-xl font-semibold text-foreground">
                      {audit.storeName} ({audit.storeCode})
                    </h2>
                    <p className="mt-2 text-sm leading-6 text-muted">
                      {audit.areaName} - {formatDate(audit.visitDate)} at{' '}
                      {formatTime(audit.visitTime)}
                    </p>
                  </div>

                  <Link
                    href={`/audits/${audit.id}`}
                    className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    Open audit
                  </Link>
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background p-3">
                    <dt className="text-xs font-semibold text-muted">Score</dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">
                      {scoreLabel(audit)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <dt className="text-xs font-semibold text-muted">
                      Started by
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
