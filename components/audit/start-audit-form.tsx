'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import {
  initialStartAuditState,
  startAuditAction,
  type StartAuditState,
} from '@/app/start-audit/actions'
import { formatUserRole } from '@/lib/auth/profile'
import type {
  StartAuditProfile,
  StartAuditStoreOption,
} from '@/components/audit/types'

type StartAuditFormProps = {
  profile: StartAuditProfile
  stores: StartAuditStoreOption[]
  fixedStore: StartAuditStoreOption | null
}

const shiftOptions = [
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },
]

const trafficOptions = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
]

const visitTypeOptions = [
  { value: 'training_audit', label: 'Training Audit' },
  { value: 'follow_up_audit', label: 'Follow-up Audit' },
  { value: 'mystery_shop_simulation', label: 'Mystery Shop Simulation' },
]

function StatusMessage({ state }: { state: StartAuditState }) {
  if (!state.message) {
    return null
  }

  const tone =
    state.status === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : 'border-red-200 bg-red-50 text-red-800'

  return (
    <div
      aria-live="polite"
      className={`rounded-lg border px-3 py-3 text-sm font-medium ${tone}`}
    >
      <p>{state.message}</p>
      {state.status === 'success' && state.auditId ? (
        <p className="mt-1 text-xs">
          Audit ID: <span className="font-mono">{state.auditId}</span>
        </p>
      ) : null}
    </div>
  )
}

function FieldLabel({
  children,
  label,
}: {
  children: React.ReactNode
  label: string
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
      {label}
      {children}
    </label>
  )
}

function inputClasses() {
  return 'min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20'
}

export function StartAuditForm({
  profile,
  stores,
  fixedStore,
}: StartAuditFormProps) {
  const [state, formAction, isPending] = useActionState(
    startAuditAction,
    initialStartAuditState
  )
  const usesFixedStore =
    profile.role === 'store_manager' || profile.role === 'leader'
  const canSubmit = usesFixedStore ? !!fixedStore : stores.length > 0

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6"
    >
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-primary">Audit details</p>
        <h2 className="text-2xl font-semibold text-foreground">
          Start a new audit
        </h2>
        <p className="text-sm leading-6 text-muted">
          Create a draft audit for an active store. Checklist answers, photos,
          reports, and action plans are handled in later steps.
        </p>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        {usesFixedStore ? (
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-sm font-semibold text-foreground">Store</p>
            <p className="mt-1 text-sm text-muted">
              {fixedStore
                ? `${fixedStore.name} (${fixedStore.code})`
                : 'Store assignment needed'}
            </p>
            <p className="mt-1 text-xs text-muted">
              {formatUserRole(profile.role)} users start audits only for their
              assigned store.
            </p>
          </div>
        ) : (
          <FieldLabel label="Store">
            <select
              name="store_id"
              required
              defaultValue=""
              className={inputClasses()}
            >
              <option value="" disabled>
                Select an active store
              </option>
              {stores.map((store) => (
                <option key={store.id} value={store.id}>
                  {store.name} ({store.code}) - {store.areaName}
                </option>
              ))}
            </select>
          </FieldLabel>
        )}

        <FieldLabel label="Visit date">
          <input
            name="visit_date"
            type="date"
            required
            className={inputClasses()}
          />
        </FieldLabel>

        <FieldLabel label="Visit time">
          <input
            name="visit_time"
            type="time"
            required
            className={inputClasses()}
          />
        </FieldLabel>

        <FieldLabel label="Shift type">
          <select
            name="shift_type"
            required
            defaultValue=""
            className={inputClasses()}
          >
            <option value="" disabled>
              Select shift
            </option>
            {shiftOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Traffic level">
          <select
            name="traffic_level"
            required
            defaultValue=""
            className={inputClasses()}
          >
            <option value="" disabled>
              Select traffic level
            </option>
            {trafficOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Visit type">
          <select
            name="visit_type"
            required
            defaultValue=""
            className={inputClasses()}
          >
            <option value="" disabled>
              Select visit type
            </option>
            {visitTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </FieldLabel>

        <FieldLabel label="Manager on Duty / MOD">
          <input
            name="mod"
            className={inputClasses()}
            placeholder="Optional"
          />
        </FieldLabel>

        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground md:col-span-2">
          Initial notes
          <textarea
            name="initial_notes"
            rows={4}
            className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Optional context for this visit"
          />
        </label>
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <StatusMessage state={state} />

        {state.status === 'success' ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <Link
              href="/dashboard"
              className="inline-flex min-h-11 items-center justify-center rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              Back to dashboard
            </Link>
          </div>
        ) : (
          <button
            type="submit"
            disabled={isPending || !canSubmit}
            className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-muted"
          >
            {isPending ? 'Starting audit...' : 'Start audit'}
          </button>
        )}
      </div>
    </form>
  )
}

