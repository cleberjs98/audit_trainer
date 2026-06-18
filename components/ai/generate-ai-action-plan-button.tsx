'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { ArrowRight, ListChecks, Sparkles } from 'lucide-react'

import { generateAiActionPlanForAuditAction } from '@/app/action-plans/actions'

type GenerateAiActionPlanButtonProps = {
  auditId: string
  existingActionPlanId?: string | null
}

type MessageState = {
  tone: 'error' | 'info'
  message: string
  actionPlanId?: string
} | null

function messageToneClass(tone: NonNullable<MessageState>['tone']) {
  if (tone === 'error') {
    return 'border-danger/20 bg-danger-soft text-danger'
  }

  return 'border-border bg-surface-soft text-muted-strong'
}

export function GenerateAiActionPlanButton({
  auditId,
  existingActionPlanId,
}: GenerateAiActionPlanButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [message, setMessage] = useState<MessageState>(null)

  if (existingActionPlanId) {
    return (
      <section className="mobile-premium-card rounded-2xl p-4 sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-success-soft text-success">
              <ListChecks aria-hidden="true" className="size-5" />
            </span>
            <div>
              <p className="text-sm font-semibold text-primary">
                Action Plan Ready
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                This audit already has an action plan.
              </p>
            </div>
          </div>
          <Link
            href={`/action-plans/${existingActionPlanId}`}
            className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            View Action Plan
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </div>
      </section>
    )
  }

  function handleGenerate() {
    setMessage({
      tone: 'info',
      message: 'This may take a moment.',
    })

    startTransition(async () => {
      const result = await generateAiActionPlanForAuditAction(auditId)

      if (result.success && result.actionPlanId) {
        router.push(`/action-plans/${result.actionPlanId}`)
        return
      }

      setMessage({
        tone: 'error',
        message:
          result.message ||
          "We couldn't generate the action plan. Please try again.",
        actionPlanId: result.actionPlanId,
      })
    })
  }

  return (
    <section className="mobile-premium-card rounded-2xl p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-3">
          <span className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary-soft text-primary">
            <Sparkles aria-hidden="true" className="size-5" />
          </span>
          <div>
            <p className="text-sm font-semibold text-primary">
              AI Action Plan
            </p>
            <p className="mt-1 text-sm leading-6 text-muted">
              Generate a coaching-focused action plan from this completed audit.
            </p>
          </div>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={handleGenerate}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted"
        >
          {isPending ? 'Generating...' : 'Generate AI Action Plan'}
          <Sparkles aria-hidden="true" className="size-4" />
        </button>
      </div>

      {message ? (
        <div
          aria-live="polite"
          className={`mt-3 rounded-lg border px-3 py-2 text-sm font-medium ${messageToneClass(
            message.tone
          )}`}
        >
          <p>{message.message}</p>
          {message.actionPlanId ? (
            <Link
              href={`/action-plans/${message.actionPlanId}`}
              className="mt-2 inline-flex items-center gap-1 text-sm font-semibold underline-offset-4 hover:underline"
            >
              View Action Plan
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
