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
      ? 'border-green-200 bg-green-50 text-green-800'
      : status === 'in_progress'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-primary/20 bg-primary/10 text-primary'

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
      ? 'border-green-200 bg-green-50 text-green-800'
      : status === 'in_progress'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
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
      ? 'border-red-200 bg-red-50 text-red-800'
      : priority === 'medium'
        ? 'border-amber-200 bg-amber-50 text-amber-900'
        : 'border-green-200 bg-green-50 text-green-800'

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
