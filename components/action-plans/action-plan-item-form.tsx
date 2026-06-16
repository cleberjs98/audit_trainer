'use client'

import { useRouter } from 'next/navigation'
import { FormEvent, useState } from 'react'

import {
  createActionPlanItemAction,
  updateActionPlanItemAction,
} from '@/app/action-plans/actions'
import type {
  ActionPlanActionState,
  ActionPlanDetailItem,
  ActionPlanItemPayload,
  ActionPriority,
  ActionItemStatus,
} from '@/components/action-plans/types'
import { initialActionPlanActionState } from '@/components/action-plans/types'

type ActionPlanItemFormProps = {
  actionPlanId: string
  item?: ActionPlanDetailItem
  disabled: boolean
  onCancel?: () => void
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

function defaultPayload(item?: ActionPlanDetailItem): ActionPlanItemPayload {
  return {
    actionDescription: item?.actionDescription ?? '',
    owner: item?.owner ?? '',
    priority: item?.priority ?? 'medium',
    dueDate: item?.dueDate ?? '',
    successMeasure: item?.successMeasure ?? '',
    status: item?.status ?? 'open',
  }
}

export function ActionPlanItemForm({
  actionPlanId,
  item,
  disabled,
  onCancel,
}: ActionPlanItemFormProps) {
  const router = useRouter()
  const [payload, setPayload] = useState<ActionPlanItemPayload>(() =>
    defaultPayload(item)
  )
  const [state, setState] = useState<ActionPlanActionState>(
    initialActionPlanActionState
  )
  const [isSaving, setIsSaving] = useState(false)
  const isEditing = Boolean(item)

  function updatePayload(next: Partial<ActionPlanItemPayload>) {
    setPayload((current) => ({ ...current, ...next }))
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (disabled) {
      return
    }

    setIsSaving(true)

    try {
      const result =
        item
          ? await updateActionPlanItemAction(item.id, payload)
          : await createActionPlanItemAction(actionPlanId, payload)

      setState(result)

      if (result.status === 'success') {
        if (!item) {
          setPayload(defaultPayload())
        }
        router.refresh()
      }
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-border bg-background p-4"
    >
      <div className="grid gap-4">
        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          Action description
          <textarea
            rows={4}
            value={payload.actionDescription}
            disabled={disabled}
            onChange={(event) =>
              updatePayload({ actionDescription: event.currentTarget.value })
            }
            placeholder="Describe the follow-up action"
            className="rounded-lg border border-border bg-surface px-3 py-3 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background disabled:text-muted"
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
            Owner
            <input
              value={payload.owner}
              disabled={disabled}
              onChange={(event) => updatePayload({ owner: event.currentTarget.value })}
              placeholder="Name or role"
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background disabled:text-muted"
            />
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
            Due date
            <input
              type="date"
              value={payload.dueDate}
              disabled={disabled}
              onChange={(event) =>
                updatePayload({ dueDate: event.currentTarget.value })
              }
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background disabled:text-muted"
            />
          </label>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
            Priority
            <select
              value={payload.priority}
              disabled={disabled}
              onChange={(event) =>
                updatePayload({
                  priority: event.currentTarget.value as ActionPriority,
                })
              }
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background disabled:text-muted"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </label>

          <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
            Status
            <select
              value={payload.status}
              disabled={disabled}
              onChange={(event) =>
                updatePayload({
                  status: event.currentTarget.value as ActionItemStatus,
                })
              }
              className="min-h-11 rounded-lg border border-border bg-surface px-3 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background disabled:text-muted"
            >
              <option value="open">Open</option>
              <option value="in_progress">In Progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>
        </div>

        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          Success measure
          <textarea
            rows={3}
            value={payload.successMeasure}
            disabled={disabled}
            onChange={(event) =>
              updatePayload({ successMeasure: event.currentTarget.value })
            }
            placeholder="How will the team know this action worked?"
            className="rounded-lg border border-border bg-surface px-3 py-3 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 disabled:bg-background disabled:text-muted"
          />
        </label>

        {state.message ? (
          <p
            aria-live="polite"
            className={`rounded-lg border px-3 py-2 text-sm font-medium ${stateTone(
              state.status
            )}`}
          >
            {state.message}
          </p>
        ) : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          {onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="min-h-11 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Cancel
            </button>
          ) : null}
          <button
            type="submit"
            disabled={disabled || isSaving}
            className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted"
          >
            {isSaving
              ? 'Saving...'
              : isEditing
                ? 'Save Item'
                : 'Add Item'}
          </button>
        </div>
      </div>
    </form>
  )
}
