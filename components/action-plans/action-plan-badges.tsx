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
    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}>
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
    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}>
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
    <span className={`rounded-full border px-2 py-1 text-xs font-semibold ${tone}`}>
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
    <span className="rounded-full border border-border bg-background px-2 py-1 text-xs font-semibold text-muted">
      {generatedByAi ? 'AI generated' : 'Manual'}
    </span>
  )
}
