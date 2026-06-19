'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2 } from 'lucide-react'

import { deleteAuditAction } from '@/app/audits/[auditId]/actions'
import {
  initialDeleteAuditState,
  type DeleteAuditState,
} from '@/components/checklist/types'

type AuditHistoryDeleteActionProps = {
  auditId: string
}

export function AuditHistoryDeleteAction({
  auditId,
}: AuditHistoryDeleteActionProps) {
  const router = useRouter()
  const [isConfirming, setIsConfirming] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [state, setState] = useState<DeleteAuditState>(initialDeleteAuditState)

  async function handleConfirmDelete() {
    setIsDeleting(true)

    try {
      const result = await deleteAuditAction(auditId)
      setState(result)

      if (result.status === 'success') {
        router.refresh()
      }
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      {!isConfirming ? (
        <button
          type="button"
          onClick={() => {
            setIsConfirming(true)
            setState(initialDeleteAuditState)
          }}
          className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-danger/25 bg-white px-3 text-sm font-semibold text-danger transition hover:border-danger hover:bg-danger-soft focus:outline-none focus:ring-4 focus:ring-danger/15"
          aria-label="Delete audit"
        >
          <Trash2 aria-hidden="true" className="size-4" />
          <span className="sr-only">Delete audit</span>
        </button>
      ) : (
        <div className="rounded-xl border border-danger/20 bg-danger-soft p-3 text-danger">
          <p className="text-xs font-semibold leading-5">
            Permanently delete this audit and its evidence?
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
            <button
              type="button"
              disabled={isDeleting}
              onClick={() => {
                setIsConfirming(false)
                setState(initialDeleteAuditState)
              }}
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-3 text-xs font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15 disabled:cursor-not-allowed disabled:text-muted"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isDeleting}
              onClick={handleConfirmDelete}
              className="inline-flex min-h-10 items-center justify-center rounded-lg bg-danger px-3 text-xs font-semibold text-white transition hover:bg-danger/90 focus:outline-none focus:ring-4 focus:ring-danger/20 disabled:cursor-not-allowed disabled:bg-muted"
            >
              {isDeleting ? 'Deleting...' : 'Confirm delete'}
            </button>
          </div>
        </div>
      )}

      {state.status === 'error' && state.message ? (
        <p className="rounded-lg border border-danger/20 bg-danger-soft px-3 py-2 text-xs font-semibold leading-5 text-danger">
          {state.message}
        </p>
      ) : null}
    </div>
  )
}
