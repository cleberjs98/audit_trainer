'use client'

import Link from 'next/link'
import { useActionState } from 'react'

import {
  createStoreAction,
  updateStoreAction,
} from '@/app/store-management/actions'
import type {
  AreaOption,
  StoreManagementProfile,
  StoreManagementRow,
  StoreManagerOption,
  StoreMutationState,
} from '@/components/store-management/types'
import { initialStoreMutationState } from '@/components/store-management/types'

type StoreManagementClientProps = {
  profile: StoreManagementProfile
  areas: AreaOption[]
  stores: StoreManagementRow[]
  storeManagers: StoreManagerOption[]
}

type FieldConfig = {
  name: string
  label: string
  placeholder?: string
  type?: 'text' | 'email' | 'tel'
}

const CONTACT_FIELDS: FieldConfig[] = [
  { name: 'phone', label: 'Phone', placeholder: '+353 ...', type: 'tel' },
  { name: 'email', label: 'Store email', placeholder: 'store@example.com', type: 'email' },
]

const ADDRESS_FIELDS: FieldConfig[] = [
  { name: 'address_line_1', label: 'Address line 1', placeholder: 'Street address' },
  { name: 'address_line_2', label: 'Address line 2', placeholder: 'Unit, level, or building' },
  { name: 'city', label: 'City', placeholder: 'Dublin' },
  { name: 'county_or_state', label: 'County/state', placeholder: 'County Dublin' },
  { name: 'postcode', label: 'Postcode', placeholder: 'K67...' },
  { name: 'country', label: 'Country', placeholder: 'Ireland' },
]

const LOCATION_FIELDS: FieldConfig[] = [
  { name: 'location_type', label: 'Location type', placeholder: 'Airport, high street, kiosk...' },
  { name: 'terminal', label: 'Terminal', placeholder: 'Terminal 1' },
  { name: 'airside_landside', label: 'Airside/landside', placeholder: 'Airside' },
]

function StatusMessage({ state }: { state: StoreMutationState }) {
  if (!state.message) {
    return null
  }

  const tone =
    state.status === 'success'
      ? 'border-success/20 bg-success-soft text-success'
      : 'border-danger/20 bg-danger-soft text-danger'

  return (
    <p
      aria-live="polite"
      className={`rounded-xl border px-3 py-2 text-sm font-semibold ${tone}`}
    >
      {state.message}
    </p>
  )
}

function textValue(value: string | null | undefined) {
  return value ?? ''
}

function Field({
  name,
  label,
  placeholder,
  type = 'text',
  defaultValue,
  required = false,
}: FieldConfig & {
  defaultValue?: string | null
  required?: boolean
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
      {label}
      <input
        name={name}
        type={type}
        required={required}
        defaultValue={textValue(defaultValue)}
        className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        placeholder={placeholder}
      />
    </label>
  )
}

function TextareaField({
  name,
  label,
  placeholder,
  defaultValue,
}: {
  name: string
  label: string
  placeholder: string
  defaultValue?: string | null
}) {
  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
      {label}
      <textarea
        name={name}
        defaultValue={textValue(defaultValue)}
        rows={3}
        className="rounded-lg border border-border bg-white px-3 py-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
        placeholder={placeholder}
      />
    </label>
  )
}

function FormSection({
  title,
  description,
  children,
}: {
  title: string
  description: string
  children: React.ReactNode
}) {
  return (
    <section className="rounded-2xl border border-border bg-surface-soft p-4">
      <div className="mb-4">
        <h3 className="text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm leading-6 text-muted">{description}</p>
      </div>
      {children}
    </section>
  )
}

function AreaField({
  profile,
  areas,
  defaultAreaId,
  mode,
}: {
  profile: StoreManagementProfile
  areas: AreaOption[]
  defaultAreaId?: string
  mode: 'create' | 'update'
}) {
  const assignedArea = areas.find((area) => area.id === defaultAreaId) ?? areas[0]

  if (profile.role === 'area_manager') {
    return (
      <div className="rounded-lg border border-border bg-white p-3">
        <p className="text-sm font-semibold text-foreground">Area</p>
        <p className="mt-1 text-sm text-muted">
          {assignedArea?.name ?? 'Not assigned'}
        </p>
        <input type="hidden" name="area_id" value={assignedArea?.id ?? ''} />
      </div>
    )
  }

  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
      Area
      <select
        name="area_id"
        required
        defaultValue={defaultAreaId ?? ''}
        className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        <option value="" disabled>
          {mode === 'create' ? 'Select an area' : 'Choose an area'}
        </option>
        {areas.map((area) => (
          <option key={area.id} value={area.id}>
            {area.name}
          </option>
        ))}
      </select>
    </label>
  )
}

function StoreManagerField({
  store,
  storeManagers,
}: {
  store: StoreManagementRow
  storeManagers: StoreManagerOption[]
}) {
  const eligibleManagers = storeManagers.filter(
    (manager) => manager.storeId === store.id
  )

  if (eligibleManagers.length === 0) {
    return (
      <div className="rounded-lg border border-border bg-white p-3">
        <p className="text-sm font-semibold text-foreground">Store Manager</p>
        <p className="mt-1 text-sm leading-6 text-muted">
          Invite or assign a store manager from Team Management first.
        </p>
        <input type="hidden" name="store_manager_id" value="" />
      </div>
    )
  }

  return (
    <label className="flex flex-col gap-2 text-sm font-semibold text-foreground">
      Store Manager
      <select
        name="store_manager_id"
        defaultValue={store.storeManagerId ?? ''}
        className="min-h-11 rounded-lg border border-border bg-white px-3 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
      >
        <option value="">No store manager assigned</option>
        {eligibleManagers.map((manager) => (
          <option key={manager.id} value={manager.id}>
            {manager.fullName} - {manager.email}
          </option>
        ))}
      </select>
    </label>
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
    <form action={formAction} className="app-card rounded-[1.5rem] p-5">
      <div>
        <p className="text-sm font-semibold text-primary">Create store</p>
        <h2 className="mt-2 text-2xl font-semibold text-foreground">
          Add an operational store
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted">
          Use store number/code as the official identifier. Store manager
          assignment becomes available after the store exists.
        </p>
      </div>

      <div className="mt-5 grid gap-4">
        <FormSection
          title="Identity"
          description="Core store identity and operating status."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="code"
              label="Store Number"
              placeholder="5292"
              required
            />
            <Field
              name="name"
              label="Store name"
              placeholder="Dublin Airport"
              required
            />
            <AreaField profile={profile} areas={areas} mode="create" />
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked
                className="size-4 accent-primary"
              />
              Active store
            </label>
            <div className="rounded-lg border border-border bg-white p-3 sm:col-span-2">
              <p className="text-sm font-semibold text-foreground">
                Store Manager
              </p>
              <p className="mt-1 text-sm leading-6 text-muted">
                Assignment is disabled for new stores. Create the store first,
                then assign an eligible store manager.
              </p>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Contact"
          description="Customer-facing or operational contact details."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            {CONTACT_FIELDS.map((field) => (
              <Field key={field.name} {...field} />
            ))}
          </div>
        </FormSection>

        <FormSection title="Address" description="Physical store address.">
          <div className="grid gap-4 sm:grid-cols-2">
            {ADDRESS_FIELDS.map((field) => (
              <Field key={field.name} {...field} />
            ))}
          </div>
        </FormSection>

        <FormSection
          title="Location"
          description="Operational context for travel hubs or special locations."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            {LOCATION_FIELDS.map((field) => (
              <Field key={field.name} {...field} />
            ))}
          </div>
          <div className="mt-4">
            <TextareaField
              name="location_notes"
              label="Location notes"
              placeholder="Access notes, landmarks, or operating constraints."
            />
          </div>
        </FormSection>

        <FormSection title="Opening" description="Store trading hours.">
          <TextareaField
            name="opening_hours"
            label="Opening hours"
            placeholder="Mon-Fri 06:00-20:00..."
          />
        </FormSection>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusMessage state={state} />
        <button
          type="submit"
          disabled={isPending || !canSubmit}
          className="app-primary-action min-h-11 rounded-xl px-5 text-sm font-semibold text-white transition focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted"
        >
          {isPending ? 'Saving...' : 'Create store'}
        </button>
      </div>
    </form>
  )
}

function StoreUpdateForm({
  store,
  profile,
  areas,
  storeManagers,
}: {
  store: StoreManagementRow
  profile: StoreManagementProfile
  areas: AreaOption[]
  storeManagers: StoreManagerOption[]
}) {
  const [state, formAction, isPending] = useActionState(
    updateStoreAction,
    initialStoreMutationState
  )

  return (
    <form action={formAction} className="app-card rounded-2xl p-4">
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
                  ? 'bg-success-soft text-success'
                  : 'bg-warning-soft text-warning'
              }`}
            >
              {store.isActive ? 'Active' : 'Inactive'}
            </span>
          </div>
          <p className="mt-1 text-sm text-muted">
            Store {store.code} - {store.areaName}
          </p>
          <p className="mt-1 text-sm text-muted">
            {store.storeManagerName
              ? `Store Manager: ${store.storeManagerName}`
              : 'No store manager assigned'}
          </p>
        </div>
        <div className="rounded-2xl border border-border bg-surface-soft px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Location
          </p>
          <p className="mt-1 text-sm font-semibold text-foreground">
            {[store.city, store.terminal, store.airsideLandside]
              .filter(Boolean)
              .join(' - ') || 'Not specified'}
          </p>
        </div>
      </div>

      <div className="mt-5 grid gap-4">
        <FormSection
          title="Identity"
          description="Store number, area, status, and manager assignment."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="code"
              label="Store Number"
              defaultValue={store.code}
              required
            />
            <Field
              name="name"
              label="Store name"
              defaultValue={store.name}
              required
            />
            <AreaField
              profile={profile}
              areas={areas}
              defaultAreaId={store.areaId}
              mode="update"
            />
            <label className="flex min-h-11 items-center gap-3 rounded-xl border border-border bg-white px-3 text-sm font-semibold text-foreground">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={store.isActive}
                className="size-4 accent-primary"
              />
              Active
            </label>
            <div className="sm:col-span-2">
              <StoreManagerField
                store={store}
                storeManagers={storeManagers}
              />
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Contact"
          description="Phone and email for the store."
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="phone"
              label="Phone"
              type="tel"
              defaultValue={store.phone}
            />
            <Field
              name="email"
              label="Store email"
              type="email"
              defaultValue={store.email}
            />
          </div>
        </FormSection>

        <FormSection title="Address" description="Physical store address.">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field
              name="address_line_1"
              label="Address line 1"
              defaultValue={store.addressLine1}
            />
            <Field
              name="address_line_2"
              label="Address line 2"
              defaultValue={store.addressLine2}
            />
            <Field name="city" label="City" defaultValue={store.city} />
            <Field
              name="county_or_state"
              label="County/state"
              defaultValue={store.countyOrState}
            />
            <Field
              name="postcode"
              label="Postcode"
              defaultValue={store.postcode}
            />
            <Field
              name="country"
              label="Country"
              defaultValue={store.country}
            />
          </div>
        </FormSection>

        <FormSection
          title="Location"
          description="Travel hub, terminal, and access information."
        >
          <div className="grid gap-4 sm:grid-cols-3">
            <Field
              name="location_type"
              label="Location type"
              defaultValue={store.locationType}
            />
            <Field
              name="terminal"
              label="Terminal"
              defaultValue={store.terminal}
            />
            <Field
              name="airside_landside"
              label="Airside/landside"
              defaultValue={store.airsideLandside}
            />
          </div>
          <div className="mt-4">
            <TextareaField
              name="location_notes"
              label="Location notes"
              placeholder="Access notes, landmarks, or operating constraints."
              defaultValue={store.locationNotes}
            />
          </div>
        </FormSection>

        <FormSection title="Opening" description="Store trading hours.">
          <TextareaField
            name="opening_hours"
            label="Opening hours"
            placeholder="Mon-Fri 06:00-20:00..."
            defaultValue={store.openingHours}
          />
        </FormSection>
      </div>

      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <StatusMessage state={state} />
        <button
          type="submit"
          disabled={isPending}
          className="app-primary-action min-h-11 rounded-xl px-5 text-sm font-semibold text-white transition focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:bg-muted"
        >
          {isPending ? 'Saving...' : 'Update store'}
        </button>
      </div>
    </form>
  )
}

export function StoreManagementClient({
  profile,
  areas,
  stores,
  storeManagers,
}: StoreManagementClientProps) {
  const activeStoreCount = stores.filter((store) => store.isActive).length

  return (
    <main className="min-h-screen bg-background">
      <header className="app-topbar border-b px-4 py-4">
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

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="app-card rounded-[1.5rem] p-5 sm:p-7">
          <p className="text-sm font-semibold text-primary">
            Store Management
          </p>
          <h1 className="mt-2 text-3xl font-semibold text-foreground">
            Manage operational stores.
          </h1>
          <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
            Admins can manage all stores. Area managers can create and update
            stores only inside their assigned area. Store number uses
            <span className="font-semibold text-foreground"> stores.code</span>.
          </p>
        </section>

        <section className="grid gap-4 sm:grid-cols-3">
          <div className="app-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Total stores
            </p>
            <p className="mt-3 text-3xl font-semibold text-foreground">
              {stores.length}
            </p>
          </div>
          <div className="app-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Active stores
            </p>
            <p className="mt-3 text-3xl font-semibold text-success">
              {activeStoreCount}
            </p>
          </div>
          <div className="app-card rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Eligible managers
            </p>
            <p className="mt-3 text-3xl font-semibold text-primary">
              {storeManagers.length}
            </p>
          </div>
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
                <StoreUpdateForm
                  key={store.id}
                  store={store}
                  profile={profile}
                  areas={areas}
                  storeManagers={storeManagers}
                />
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
