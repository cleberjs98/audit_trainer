import {
  Bell,
  CircleCheck,
  Clock,
  ListChecks,
  Square,
  TriangleAlert,
} from 'lucide-react'

import type {
  ActionItemStatus,
  ActionPlanStatus,
  ActionPriority,
} from '@/components/action-plans/types'

function titleCase(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function actionPlanStatusIcon(status: ActionPlanStatus) {
  if (status === 'completed') {
    return <CircleCheck aria-hidden="true" className="size-3.5" />
  }

  if (status === 'in_progress') {
    return <Clock aria-hidden="true" className="size-3.5" />
  }

  return <Bell aria-hidden="true" className="size-3.5" />
}

function actionItemStatusIcon(status: ActionItemStatus) {
  if (status === 'completed') {
    return <CircleCheck aria-hidden="true" className="size-3.5" />
  }

  if (status === 'in_progress') {
    return <Clock aria-hidden="true" className="size-3.5" />
  }

  return <Square aria-hidden="true" className="size-3.5" />
}

function priorityIcon(priority: ActionPriority) {
  if (priority === 'high') {
    return <TriangleAlert aria-hidden="true" className="size-3.5" />
  }

  if (priority === 'medium') {
    return <Clock aria-hidden="true" className="size-3.5" />
  }

  return <CircleCheck aria-hidden="true" className="size-3.5" />
}

export function ActionPlanStatusBadge({
  status,
}: {
  status: ActionPlanStatus
}) {
  const tone =
    status === 'completed'
      ? 'border-success/20 bg-success-soft text-success'
      : status === 'in_progress'
        ? 'border-warning/20 bg-warning-soft text-warning'
        : 'border-primary/20 bg-primary-soft text-primary'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}
    >
      {actionPlanStatusIcon(status)}
      {titleCase(status)}
    </span>
  )
}

export function ActionItemStatusBadge({
  status,
}: {
  status: ActionItemStatus
}) {
  const tone =
    status === 'completed'
      ? 'border-success/20 bg-success-soft text-success'
      : status === 'in_progress'
        ? 'border-warning/20 bg-warning-soft text-warning'
        : 'border-border bg-background text-muted'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}
    >
      {actionItemStatusIcon(status)}
      {titleCase(status)}
    </span>
  )
}

export function ActionPriorityBadge({
  priority,
}: {
  priority: ActionPriority
}) {
  const tone =
    priority === 'high'
      ? 'border-danger/20 bg-danger-soft text-danger'
      : priority === 'medium'
        ? 'border-warning/20 bg-warning-soft text-warning'
        : 'border-success/20 bg-success-soft text-success'

  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}
    >
      {priorityIcon(priority)}
      {titleCase(priority)}
    </span>
  )
}

export function ManualPlanBadge({
  generatedByAi,
}: {
  generatedByAi: boolean
}) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold text-muted">
      <ListChecks aria-hidden="true" className="size-3.5" />
      {generatedByAi ? 'AI generated' : 'Manual'}
    </span>
  )
}
