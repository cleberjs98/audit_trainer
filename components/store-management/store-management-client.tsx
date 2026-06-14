'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import {
  createStoreAction,
  initialStoreMutationState,
  updateStoreAction,
  type StoreMutationState,
} from '@/app/store-management/actions'
import type {
  AreaOption,
  StoreManagementProfile,
  StoreManagementRow,
} from '@/components/store-management/types'

type StoreManagementClientProps = {
  profile: StoreManagementProfile
  areas: AreaOption[]
  stores: StoreManagementRow[]
}

function StatusMessage({ state }: { state: StoreMutationState }) {
  if (!state.message) {
    return null
  }

  const tone =
    state.status === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : 'border-red-200 bg-red-50 text-red-800'

  return (
    <p
      aria-live="polite"
      className={`rounded-lg border px-3 py-2 text-sm font-medium ${tone}`}
    >
      {state.message}
    </p>
  )
}

function CreateStoreForm({
  areas,
  profile,
}: {
  areas: AreaOption[]
  profile: StoreManagementProfile
}) {
  const [state, formAction, isPending] = useActionState(
    createStoreAction,
    initialStoreMutationState
  )
  const assignedArea = areas[0]
  const canSubmit = profile.role === 'admin' ? areas.length > 0 : !!assignedArea

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <div>
        <p className="text-sm font-semibold text-primary">Create store</p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">
          Add a store
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          New stores are saved through Supabase with RLS enforcing your role
          scope.
        </p>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          Store name
          <input
            name="name"
            required
            className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="Dublin Airport"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          Store code
          <input
            name="code"
            required
            className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            placeholder="5292"
          />
        </label>

        {profile.role === 'admin' ? (
          <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
            Area
            <select
              name="area_id"
              required
              defaultValue=""
              className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            >
              <option value="" disabled>
                Select an area
              </option>
              {areas.map((area) => (
                <option key={area.id} value={area.id}>
                  {area.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="rounded-lg border border-border bg-background p-3">
            <p className="text-sm font-semibold text-foreground">Area</p>
            <p className="mt-1 text-sm text-muted">
              {assignedArea?.name ?? 'Not assigned'}
            </p>
            <input
              type="hidden"
              name="area_id"
              value={assignedArea?.id ?? ''}
            />
          </div>
        )}

        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked
            className="size-4 accent-primary"
          />
          Active store
        </label>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusMessage state={state} />
        <button
          type="submit"
          disabled={isPending || !canSubmit}
          className="min-h-11 rounded-lg bg-primary px-5 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:bg-muted"
        >
          {isPending ? 'Saving...' : 'Create store'}
        </button>
      </div>
    </form>
  )
}

function StoreUpdateForm({ store }: { store: StoreManagementRow }) {
  const [state, formAction, isPending] = useActionState(
    updateStoreAction,
    initialStoreMutationState
  )

  return (
    <form
      action={formAction}
      className="rounded-2xl border border-border bg-surface p-5 shadow-sm"
    >
      <input type="hidden" name="store_id" value={store.id} />

      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-xl font-semibold text-foreground">
              {store.name}
            </h3>
            <span
              className={`rounded-full px-3 py-1 text-xs font-semibold ${
                store.isActive
                  ? 'bg-green-50 text-green-800'
                  : 'bg-amber-50 text-amber-800'
              }`}
            >
              {store.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            {store.areaName} - Code {store.code}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1fr_10rem_10rem_auto] lg:items-end">
        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          Store name
          <input
            name="name"
            required
            defaultValue={store.name}
            className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
          Store code
          <input
            name="code"
            required
            defaultValue={store.code}
            className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </label>

        <label className="flex min-h-11 items-center gap-3 rounded-lg border border-border bg-white px-3 text-sm font-semibold text-foreground">
          <input
            type="checkbox"
            name="is_active"
            defaultChecked={store.isActive}
            className="size-4 accent-primary"
          />
          Active
        </label>

        <button
          type="submit"
          disabled={isPending}
          className="min-h-11 rounded-lg border border-primary bg-white px-5 text-sm font-semibold text-primary transition hover:bg-primary hover:text-white focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:cursor-not-allowed disabled:border-border disabled:text-muted"
        >
          {isPending ? 'Saving...' : 'Update'}
        </button>
      </div>

      <div className="mt-4">
        <StatusMessage state={state} />
      </div>
    </form>
  )
}

export function StoreManagementClient({
  profile,
  areas,
  stores,
}: StoreManagementClientProps) {
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
                Store Management
              </p>
            </div>
          </div>

          <Link
            href="/dashboard"
            className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
          >
            Back to dashboard
          </Link>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <p className="text-sm font-semibold text-primary">
            Store Management
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            Manage operational stores.
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
            Admins can manage all stores. Area managers can create and update
            stores only inside their assigned area.
          </p>
        </section>

        <CreateStoreForm areas={areas} profile={profile} />

        <section>
          <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-sm font-semibold text-primary">Stores</p>
              <h2 className="text-2xl font-semibold text-foreground">
                Current stores
              </h2>
            </div>
            <p className="text-sm text-muted">
              {stores.length} {stores.length === 1 ? 'store' : 'stores'}
            </p>
          </div>

          {stores.length > 0 ? (
            <div className="grid gap-4">
              {stores.map((store) => (
                <StoreUpdateForm key={store.id} store={store} />
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-border bg-surface p-6 text-center shadow-sm">
              <h3 className="text-xl font-semibold text-foreground">
                No stores found
              </h3>
              <p className="mt-2 text-sm leading-6 text-muted">
                Stores you can manage will appear here once they are created.
              </p>
            </div>
          )}
        </section>
      </section>
    </main>
  )
}
