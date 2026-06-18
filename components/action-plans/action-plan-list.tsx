import Link from 'next/link'
import {
  ArrowRight,
  Bell,
  Calendar,
  CircleCheck,
  Clock,
  ListChecks,
} from 'lucide-react'

import {
  ActionPlanStatusBadge,
  ManualPlanBadge,
} from '@/components/action-plans/action-plan-badges'
import {
  MobileAppHeader,
  MobileBottomNav,
} from '@/components/navigation/mobile-app-shell'
import type {
  ActionPlanListItem,
  ActionPlanStatus,
} from '@/components/action-plans/types'
import type { UserRole } from '@/types/user'

type ActionPlanListProps = {
  actionPlans: ActionPlanListItem[]
  activeStatus: ActionPlanStatus | null
  userRole: UserRole
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
  userRole,
}: ActionPlanListProps) {
  const openCount = actionPlans.filter((plan) => plan.status === 'open').length
  const inProgressCount = actionPlans.filter(
    (plan) => plan.status === 'in_progress'
  ).length
  const completedCount = actionPlans.filter(
    (plan) => plan.status === 'completed'
  ).length

  return (
    <main className="min-h-screen bg-background">
      <MobileAppHeader
        title="Action Plans"
        subtitle={`${actionPlans.length} plans in scope`}
        actionHref="/audits"
        actionLabel="Audits"
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

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-28 pt-5 sm:px-6 lg:gap-5 lg:px-8 lg:pb-8 lg:pt-6">
        <section className="rounded-[1.5rem] border border-white/10 bg-info p-5 text-white shadow-[0_18px_45px_rgba(23,26,31,0.14)] lg:border-border lg:bg-surface lg:text-foreground lg:shadow-[0_14px_38px_rgba(23,26,31,0.07)] sm:p-7">
          <p className="text-sm font-semibold text-primary-soft lg:text-primary">
            Manual Action Plans
          </p>
          <div className="mt-2 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold text-white lg:text-foreground">
                Track follow-up work
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300 lg:text-muted">
                Review manual action plans created from completed audits. AI
                generation is not included in V1.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 lg:border-border lg:bg-surface-soft">
              <p className="text-xs font-semibold text-slate-300 lg:text-muted">Showing</p>
              <p className="mt-1 text-lg font-semibold text-white lg:text-foreground">
                {actionPlans.length} plans
              </p>
            </div>
          </div>
        </section>

        <section className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-3 md:overflow-visible md:px-0 md:pb-0">
          {[
            {
              label: 'Open',
              value: openCount,
              tone: 'text-primary',
              badge: 'border-primary/20 bg-primary-soft text-primary',
              icon: Bell,
            },
            {
              label: 'In Progress',
              value: inProgressCount,
              tone: 'text-warning',
              badge: 'border-warning/20 bg-warning-soft text-warning',
              icon: Clock,
            },
            {
              label: 'Completed',
              value: completedCount,
              tone: 'text-success',
              badge: 'border-success/20 bg-success-soft text-success',
              icon: CircleCheck,
            },
          ].map((metric) => {
            const Icon = metric.icon

            return (
            <div
              key={metric.label}
              className="app-card min-w-[9.5rem] rounded-2xl p-4 md:min-w-0 md:p-5"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                  {metric.label}
                </p>
                <span
                  className={`flex size-10 shrink-0 items-center justify-center rounded-2xl border ${metric.badge}`}
                >
                  <Icon aria-hidden="true" className="size-5" />
                </span>
              </div>
              <p className={`mt-3 text-3xl font-semibold ${metric.tone}`}>
                {metric.value}
              </p>
            </div>
            )
          })}
        </section>

        <section className="app-card rounded-2xl p-4">
          <p className="text-sm font-semibold text-foreground">Status</p>
          <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
            {STATUS_OPTIONS.map((option) => {
              const isActive = option.value === activeStatus

              return (
                <Link
                  key={option.label}
                  href={buildHref(option.value)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-semibold transition ${
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
              className="mt-4 inline-flex min-h-10 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              View Audit History
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </section>
        ) : (
          <section className="grid gap-3">
            {actionPlans.map((plan) => (
              <article
                key={plan.id}
                className="app-card rounded-[1.35rem] p-4 transition hover:border-primary/30 hover:shadow-[0_18px_40px_rgba(23,26,31,0.10)]"
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_22rem_auto] lg:items-center">
                  <div className="flex items-start gap-3 sm:gap-4">
                    <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary-soft text-primary sm:size-12">
                      <ListChecks aria-hidden="true" className="size-5" />
                    </div>
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <ActionPlanStatusBadge status={plan.status} />
                        <ManualPlanBadge generatedByAi={plan.generatedByAi} />
                      </div>
                      <h2 className="mt-2 text-base font-semibold text-foreground sm:text-lg">
                        {plan.storeName}
                      </h2>
                      <p className="text-sm font-medium text-muted">
                        Store {plan.storeCode} - Audit{' '}
                        <span className="inline-flex items-center gap-1">
                          <Calendar aria-hidden="true" className="size-3.5" />
                          {formatDate(plan.auditVisitDate)}
                        </span>
                      </p>
                    </div>
                  </div>

                  <dl className="grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-border bg-surface-soft p-3">
                      <dt className="text-xs font-semibold text-muted">Items</dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground">
                        {plan.completedItemCount}/{plan.itemCount}
                      </dd>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-soft p-3">
                      <dt className="text-xs font-semibold text-muted">
                        Audit score
                      </dt>
                      <dd className="mt-1 text-sm font-semibold text-foreground">
                        {scoreLabel(plan)}
                      </dd>
                    </div>
                    <div className="rounded-xl border border-border bg-surface-soft p-3">
                      <dt className="text-xs font-semibold text-muted">Focus</dt>
                      <dd className="mt-1 truncate text-sm font-semibold text-foreground">
                        {plan.focusArea ?? 'Manual'}
                      </dd>
                    </div>
                  </dl>

                  <Link
                    href={`/action-plans/${plan.id}`}
                    className="app-primary-action inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-primary/20"
                  >
                    Open plan
                    <ArrowRight aria-hidden="true" className="size-4" />
                  </Link>
                </div>
              </article>
            ))}
          </section>
        )}
      </section>
      <MobileBottomNav role={userRole} active="action-plans" />
    </main>
  )
}
