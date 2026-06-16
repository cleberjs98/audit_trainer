import Link from 'next/link'

import {
  ActionPlanStatusBadge,
  ManualPlanBadge,
} from '@/components/action-plans/action-plan-badges'
import type {
  ActionPlanListItem,
  ActionPlanStatus,
} from '@/components/action-plans/types'

type ActionPlanListProps = {
  actionPlans: ActionPlanListItem[]
  activeStatus: ActionPlanStatus | null
}

const STATUS_OPTIONS = [
  { label: 'All', value: null },
  { label: 'Open', value: 'open' },
  { label: 'In Progress', value: 'in_progress' },
  { label: 'Completed', value: 'completed' },
] as const satisfies readonly {
  label: string
  value: ActionPlanStatus | null
}[]

function formatDate(value: string | null) {
  if (!value) {
    return 'Not available'
  }

  const [date] = value.split('T')
  const [year, month, day] = date.split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}

function scoreLabel(plan: ActionPlanListItem) {
  if (plan.auditMaxScore <= 0 || plan.auditStatus !== 'completed') {
    return 'Not finalized'
  }

  return `${plan.auditTotalScore}/${plan.auditMaxScore}`
}

function buildHref(status: ActionPlanStatus | null) {
  return status ? `/action-plans?status=${status}` : '/action-plans'
}

export function ActionPlanList({
  actionPlans,
  activeStatus,
}: ActionPlanListProps) {
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
              <p className="text-xs font-medium text-muted">Action Plans</p>
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
              href="/audits"
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Audit History
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-primary">
            Manual Action Plans
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-foreground">
                Track follow-up work
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
                Review manual action plans created from completed audits. AI
                generation is not included in V1.
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-xs font-semibold text-muted">Showing</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {actionPlans.length} plans
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <p className="text-sm font-semibold text-foreground">Status</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {STATUS_OPTIONS.map((option) => {
              const isActive = option.value === activeStatus

              return (
                <Link
                  key={option.label}
                  href={buildHref(option.value)}
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

        {actionPlans.length === 0 ? (
          <section className="rounded-2xl border border-border bg-surface p-6 text-muted shadow-sm">
            <p className="text-base font-semibold text-foreground">
              No action plans found.
            </p>
            <p className="mt-2 text-sm leading-6">
              Complete an audit, then create a manual action plan from the audit
              detail page.
            </p>
            <Link
              href="/audits"
              className="mt-4 inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              View Audit History
            </Link>
          </section>
        ) : (
          <section className="grid gap-4 lg:grid-cols-2">
            {actionPlans.map((plan) => (
              <article
                key={plan.id}
                className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
              >
                <div className="flex flex-col gap-4">
                  <div className="flex flex-wrap gap-2">
                    <ActionPlanStatusBadge status={plan.status} />
                    <ManualPlanBadge generatedByAi={plan.generatedByAi} />
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <h2 className="text-xl font-semibold text-foreground">
                        {plan.storeName}
                      </h2>
                      <p className="mt-1 text-sm font-medium text-muted">
                        Store {plan.storeCode}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-muted">
                        Audit visit {formatDate(plan.auditVisitDate)}
                        {plan.auditCompletedAt
                          ? ` - completed ${formatDate(plan.auditCompletedAt)}`
                          : ''}
                      </p>
                    </div>

                    <Link
                      href={`/action-plans/${plan.id}`}
                      className="inline-flex min-h-10 shrink-0 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
                    >
                      Open plan
                    </Link>
                  </div>
                </div>

                <dl className="mt-5 grid gap-3 sm:grid-cols-3">
                  <div className="rounded-xl border border-border bg-background p-3">
                    <dt className="text-xs font-semibold text-muted">Items</dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">
                      {plan.completedItemCount}/{plan.itemCount} completed
                    </dd>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <dt className="text-xs font-semibold text-muted">
                      Audit score
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">
                      {scoreLabel(plan)}
                    </dd>
                  </div>
                  <div className="rounded-xl border border-border bg-background p-3">
                    <dt className="text-xs font-semibold text-muted">
                      Focus
                    </dt>
                    <dd className="mt-1 text-sm font-semibold text-foreground">
                      {plan.focusArea ?? 'Manual follow-up'}
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
