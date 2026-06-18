'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  Calendar,
  CircleCheck,
  Clock,
  Gauge,
  ListChecks,
  Plus,
  Store,
} from 'lucide-react'

import {
  updateActionPlanItemStatusAction,
  updateActionPlanStatusAction,
} from '@/app/action-plans/actions'
import {
  ActionItemStatusBadge,
  ActionPlanStatusBadge,
  ActionPriorityBadge,
  ManualPlanBadge,
} from '@/components/action-plans/action-plan-badges'
import { ActionPlanItemForm } from '@/components/action-plans/action-plan-item-form'
import {
  MobileAppHeader,
  MobileBottomNav,
} from '@/components/navigation/mobile-app-shell'
import type {
  ActionItemStatus,
  ActionPlanActionState,
  ActionPlanDetailData,
  ActionPlanStatus,
} from '@/components/action-plans/types'
import { initialActionPlanActionState } from '@/components/action-plans/types'
import type { UserRole } from '@/types/user'

type ActionPlanDetailProps = {
  actionPlan: ActionPlanDetailData
  canManage: boolean
  readOnlyReason: string | null
  userRole: UserRole
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not set'
  }

  const [date] = value.split('T')
  const [year, month, day] = date.split('-')

  if (!year || !month || !day) {
    return value
  }

  return `${day}/${month}/${year}`
}

function scoreLabel(actionPlan: ActionPlanDetailData) {
  if (actionPlan.auditMaxScore <= 0 || actionPlan.auditStatus !== 'completed') {
    return 'Not finalized'
  }

  return `${actionPlan.auditTotalScore}/${actionPlan.auditMaxScore} - ${actionPlan.auditPercentage}%`
}

function stateTone(status: ActionPlanActionState['status']) {
  if (status === 'success') {
    return 'border-success/20 bg-success-soft text-success'
  }

  if (status === 'error') {
    return 'border-danger/20 bg-danger-soft text-danger'
  }

  return 'border-border bg-background text-muted'
}

export function ActionPlanDetail({
  actionPlan,
  canManage,
  readOnlyReason,
  userRole,
}: ActionPlanDetailProps) {
  const router = useRouter()
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [statusState, setStatusState] = useState<ActionPlanActionState>(
    initialActionPlanActionState
  )
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false)
  const [showCreateItemForm, setShowCreateItemForm] = useState(false)
  const [planStatus, setPlanStatus] = useState<ActionPlanStatus>(
    actionPlan.status
  )
  const completedItemCount = actionPlan.items.filter(
    (item) => item.status === 'completed'
  ).length

  async function handlePlanStatusUpdate() {
    setIsUpdatingPlan(true)

    try {
      const result = await updateActionPlanStatusAction(actionPlan.id, planStatus)
      setStatusState(result)

      if (result.status === 'success') {
        router.refresh()
      }
    } finally {
      setIsUpdatingPlan(false)
    }
  }

  async function handleItemStatusUpdate(
    itemId: string,
    status: ActionItemStatus
  ) {
    setPendingStatusId(itemId)

    try {
      const result = await updateActionPlanItemStatusAction(itemId, status)
      setStatusState(result)

      if (result.status === 'success') {
        router.refresh()
      }
    } finally {
      setPendingStatusId(null)
    }
  }

  return (
    <main className="min-h-screen bg-background">
      <MobileAppHeader
        title="Action Plan"
        subtitle={actionPlan.storeName}
        actionHref="/action-plans"
        actionLabel="Plans"
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
              <p className="text-xs font-medium text-muted">
                Action Plan Detail
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/action-plans"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Back to action plans
            </Link>
            <Link
              href={`/audits/${actionPlan.auditId}`}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Open audit
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 pb-28 pt-5 sm:px-6 lg:gap-5 lg:px-8 lg:pb-8 lg:pt-6">
        <section className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-info text-white shadow-[0_18px_45px_rgba(23,26,31,0.14)] lg:border-border lg:bg-surface lg:text-foreground lg:shadow-[0_14px_38px_rgba(23,26,31,0.07)]">
          <div className="grid gap-0 lg:grid-cols-[1fr_20rem]">
            <div className="p-5 sm:p-7">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex items-start gap-4">
                  <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-white/10 text-primary-soft lg:border-primary/20 lg:bg-primary-soft lg:text-primary">
                    <ListChecks aria-hidden="true" className="size-6" />
                  </div>
                  <div>
                    <div className="flex flex-wrap gap-2">
                      <ActionPlanStatusBadge status={actionPlan.status} />
                      <ManualPlanBadge generatedByAi={actionPlan.generatedByAi} />
                    </div>
                    <h1 className="mt-3 text-3xl font-semibold text-white lg:text-foreground">
                      {actionPlan.focusArea ?? 'Manual Action Plan'}
                    </h1>
                    <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300 lg:text-muted">
                      {actionPlan.summary ??
                        'Track manual follow-up actions for this completed audit.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
            <div className="border-t border-white/10 bg-white/10 p-5 text-white lg:border-l lg:border-t-0 lg:border-border lg:bg-info sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Item progress
              </p>
              <p className="mt-3 text-4xl font-semibold">
                {completedItemCount}/{actionPlan.items.length}
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/15">
                <div
                  className="h-full rounded-full bg-primary"
                  style={{
                    width: `${
                      actionPlan.items.length > 0
                        ? Math.round(
                            (completedItemCount / actionPlan.items.length) * 100
                          )
                        : 0
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </section>

        {readOnlyReason ? (
          <section className="rounded-2xl border border-warning/20 bg-warning-soft p-4 text-warning shadow-sm">
            <p className="text-sm font-semibold">Read-only action plan</p>
            <p className="mt-2 text-sm leading-6">{readOnlyReason}</p>
          </section>
        ) : null}

        <section className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 lg:mx-0 lg:grid lg:grid-cols-4 lg:overflow-visible lg:px-0 lg:pb-0">
          <div className="min-w-[12rem] rounded-2xl border border-border bg-surface p-4 shadow-sm lg:min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-muted">
              <Store aria-hidden="true" className="size-4 text-primary" />
              Store
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {actionPlan.storeName}
            </p>
            <p className="mt-1 text-xs text-muted">Code {actionPlan.storeCode}</p>
          </div>
          <div className="min-w-[12rem] rounded-2xl border border-border bg-surface p-4 shadow-sm lg:min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-muted">
              <Calendar aria-hidden="true" className="size-4 text-primary" />
              Audit visit
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {formatDate(actionPlan.auditVisitDate)}
            </p>
            <p className="mt-1 text-xs text-muted">
              Completed {formatDate(actionPlan.auditCompletedAt)}
            </p>
          </div>
          <div className="min-w-[12rem] rounded-2xl border border-border bg-surface p-4 shadow-sm lg:min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-muted">
              <Gauge aria-hidden="true" className="size-4 text-primary" />
              Audit score
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {scoreLabel(actionPlan)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {actionPlan.auditScoreBand ?? 'No score band'}
            </p>
          </div>
          <div className="min-w-[12rem] rounded-2xl border border-border bg-surface p-4 shadow-sm lg:min-w-0">
            <p className="inline-flex items-center gap-2 text-xs font-semibold text-muted">
              <Clock aria-hidden="true" className="size-4 text-primary" />
              Created
            </p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {formatDate(actionPlan.createdAt)}
            </p>
            <p className="mt-1 text-xs text-muted">
              Updated {formatDate(actionPlan.updatedAt)}
            </p>
          </div>
        </section>

        {canManage ? (
          <section className="app-card rounded-2xl p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
              <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
                Plan status
                <select
                  value={planStatus}
                  onChange={(event) =>
                    setPlanStatus(event.currentTarget.value as ActionPlanStatus)
                  }
                  className="min-h-11 rounded-lg border border-border bg-background px-3 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                </select>
              </label>
              <button
                type="button"
                disabled={isUpdatingPlan}
                onClick={handlePlanStatusUpdate}
                className="app-primary-action min-h-11 rounded-xl px-5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted"
              >
                {isUpdatingPlan ? 'Updating...' : 'Update Status'}
              </button>
            </div>
            {statusState.message ? (
              <p
                aria-live="polite"
                className={`mt-3 rounded-lg border px-3 py-2 text-sm font-medium ${stateTone(
                  statusState.status
                )}`}
              >
                {statusState.message}
              </p>
            ) : null}
          </section>
        ) : null}

        {canManage ? (
          <section className="app-card rounded-2xl p-4 sm:p-5">
            {showCreateItemForm ? (
              <ActionPlanItemForm
                actionPlanId={actionPlan.id}
                disabled={!canManage}
                onCancel={() => setShowCreateItemForm(false)}
                onSuccess={() => setShowCreateItemForm(false)}
              />
            ) : (
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
                    <Plus aria-hidden="true" className="size-5" />
                  </span>
                  <div className="min-w-0">
                    <h2 className="text-lg font-semibold text-foreground">
                      Add action item
                    </h2>
                    <p className="mt-1 text-sm leading-6 text-muted">
                      Add one focused, measurable follow-up action at a time.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowCreateItemForm(true)}
                  className="app-primary-action inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-primary/20 sm:w-auto"
                >
                  <Plus aria-hidden="true" className="size-4" />
                  Add action item
                </button>
              </div>
            )}
          </section>
        ) : null}

        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-semibold text-foreground">
            Action items
          </h2>

          {actionPlan.items.length === 0 ? (
            <div className="rounded-2xl border border-border bg-surface p-5 text-muted shadow-sm">
              No action items have been added yet.
            </div>
          ) : (
            actionPlan.items.map((item) => (
              <article
                key={item.id}
                className="app-card rounded-2xl p-4"
              >
                {editingItemId === item.id ? (
                  <ActionPlanItemForm
                    actionPlanId={actionPlan.id}
                    item={item}
                    disabled={!canManage}
                    onCancel={() => setEditingItemId(null)}
                  />
                ) : (
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-wrap gap-2">
                      <ActionItemStatusBadge status={item.status} />
                      <ActionPriorityBadge priority={item.priority} />
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold text-foreground">
                        {item.actionDescription}
                      </h3>
                      {item.successMeasure ? (
                        <p className="mt-2 text-sm leading-6 text-muted">
                          Success measure: {item.successMeasure}
                        </p>
                      ) : null}
                    </div>

                    <dl className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-xl border border-border bg-surface-soft p-3">
                        <dt className="text-xs font-semibold text-muted">
                          Owner
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-foreground">
                          {item.owner ?? 'Not assigned'}
                        </dd>
                      </div>
                      <div className="rounded-xl border border-border bg-surface-soft p-3">
                        <dt className="text-xs font-semibold text-muted">
                          <Calendar aria-hidden="true" className="mr-1 inline size-3.5 text-primary" />
                          Due date
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-foreground">
                          {formatDate(item.dueDate)}
                        </dd>
                      </div>
                      <div className="rounded-xl border border-border bg-surface-soft p-3">
                        <dt className="text-xs font-semibold text-muted">
                          <CircleCheck aria-hidden="true" className="mr-1 inline size-3.5 text-success" />
                          Completed
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-foreground">
                          {formatDate(item.completedAt)}
                        </dd>
                      </div>
                    </dl>

                    {canManage ? (
                      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
                        <button
                          type="button"
                          onClick={() => setEditingItemId(item.id)}
                          className="min-h-10 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                        >
                          Edit item
                        </button>
                        {(['open', 'in_progress', 'completed'] as const).map(
                          (status) => (
                            <button
                              key={status}
                              type="button"
                              disabled={
                                pendingStatusId === item.id ||
                                item.status === status
                              }
                              onClick={() =>
                                handleItemStatusUpdate(item.id, status)
                              }
                              className="min-h-10 rounded-lg border border-border bg-background px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:text-muted"
                            >
                              Mark {status.replace('_', ' ')}
                            </button>
                          )
                        )}
                      </div>
                    ) : null}
                  </div>
                )}
              </article>
            ))
          )}
        </section>
      </section>
      <MobileBottomNav role={userRole} active="action-plans" />
    </main>
  )
}
