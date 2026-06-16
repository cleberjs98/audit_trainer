'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState } from 'react'

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
import type {
  ActionItemStatus,
  ActionPlanActionState,
  ActionPlanDetailData,
  ActionPlanStatus,
} from '@/components/action-plans/types'
import { initialActionPlanActionState } from '@/components/action-plans/types'

type ActionPlanDetailProps = {
  actionPlan: ActionPlanDetailData
  canManage: boolean
  readOnlyReason: string | null
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
    return 'border-green-200 bg-green-50 text-green-800'
  }

  if (status === 'error') {
    return 'border-red-200 bg-red-50 text-red-800'
  }

  return 'border-border bg-background text-muted'
}

export function ActionPlanDetail({
  actionPlan,
  canManage,
  readOnlyReason,
}: ActionPlanDetailProps) {
  const router = useRouter()
  const [editingItemId, setEditingItemId] = useState<string | null>(null)
  const [statusState, setStatusState] = useState<ActionPlanActionState>(
    initialActionPlanActionState
  )
  const [pendingStatusId, setPendingStatusId] = useState<string | null>(null)
  const [isUpdatingPlan, setIsUpdatingPlan] = useState(false)
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

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="flex flex-wrap gap-2">
                <ActionPlanStatusBadge status={actionPlan.status} />
                <ManualPlanBadge generatedByAi={actionPlan.generatedByAi} />
              </div>
              <h1 className="mt-3 text-3xl font-semibold text-foreground">
                {actionPlan.focusArea ?? 'Manual Action Plan'}
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
                {actionPlan.summary ??
                  'Track manual follow-up actions for this completed audit.'}
              </p>
            </div>
            <div className="rounded-xl border border-border bg-background px-4 py-3">
              <p className="text-xs font-semibold text-muted">Items completed</p>
              <p className="mt-1 text-lg font-semibold text-foreground">
                {completedItemCount}/{actionPlan.items.length}
              </p>
            </div>
          </div>
        </section>

        {readOnlyReason ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900 shadow-sm">
            <p className="text-sm font-semibold">Read-only action plan</p>
            <p className="mt-2 text-sm leading-6">{readOnlyReason}</p>
          </section>
        ) : null}

        <section className="grid gap-4 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted">Store</p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {actionPlan.storeName}
            </p>
            <p className="mt-1 text-xs text-muted">Code {actionPlan.storeCode}</p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted">Audit visit</p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {formatDate(actionPlan.auditVisitDate)}
            </p>
            <p className="mt-1 text-xs text-muted">
              Completed {formatDate(actionPlan.auditCompletedAt)}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted">Audit score</p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {scoreLabel(actionPlan)}
            </p>
            <p className="mt-1 text-xs text-muted">
              {actionPlan.auditScoreBand ?? 'No score band'}
            </p>
          </div>
          <div className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted">Created</p>
            <p className="mt-1 text-base font-semibold text-foreground">
              {formatDate(actionPlan.createdAt)}
            </p>
            <p className="mt-1 text-xs text-muted">
              Updated {formatDate(actionPlan.updatedAt)}
            </p>
          </div>
        </section>

        {canManage ? (
          <section className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
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
                className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted"
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
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-foreground">
              Add action item
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              Add one focused, measurable follow-up action at a time.
            </p>
            <div className="mt-4">
              <ActionPlanItemForm
                actionPlanId={actionPlan.id}
                disabled={!canManage}
              />
            </div>
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
                className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
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
                      <div className="rounded-xl border border-border bg-background p-3">
                        <dt className="text-xs font-semibold text-muted">
                          Owner
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-foreground">
                          {item.owner ?? 'Not assigned'}
                        </dd>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-3">
                        <dt className="text-xs font-semibold text-muted">
                          Due date
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-foreground">
                          {formatDate(item.dueDate)}
                        </dd>
                      </div>
                      <div className="rounded-xl border border-border bg-background p-3">
                        <dt className="text-xs font-semibold text-muted">
                          Completed
                        </dt>
                        <dd className="mt-1 text-sm font-semibold text-foreground">
                          {formatDate(item.completedAt)}
                        </dd>
                      </div>
                    </dl>

                    {canManage ? (
                      <div className="flex flex-col gap-2 sm:flex-row">
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
    </main>
  )
}
