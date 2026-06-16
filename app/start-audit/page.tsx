import Link from 'next/link'
import { redirect } from 'next/navigation'

import { StartAuditForm } from '@/components/audit/start-audit-form'
import type {
  StartAuditProfile,
  StartAuditStoreOption,
} from '@/components/audit/types'
import { MissingProfileDashboard } from '@/components/dashboard/dashboard-shell'
import { formatUserRole, isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'

type StoreRow = {
  id: string
  name: string
  code: string
  area_id: string
}

type AreaRow = {
  id: string
  name: string
}

function toStoreOptions(
  stores: StoreRow[] | null,
  areaNames: Map<string, string>
): StartAuditStoreOption[] {
  return (stores ?? []).map((store) => ({
    id: store.id,
    name: store.name,
    code: store.code,
    areaName: areaNames.get(store.area_id) ?? 'Unavailable',
  }))
}

function AssignmentNotice({
  title,
  message,
}: {
  title: string
  message: string
}) {
  return (
    <main className="min-h-screen bg-background">
      <header className="app-topbar border-b px-4 py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              AT
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                Audit Trainer
              </p>
              <p className="text-xs font-medium text-muted">Start Audit</p>
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

      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-warning/20 bg-warning-soft p-5 text-warning shadow-sm">
          <p className="text-sm font-semibold">{title}</p>
          <h1 className="mt-2 text-2xl font-semibold">
            Audit creation is not available yet.
          </h1>
          <p className="mt-3 text-sm leading-6">{message}</p>
        </div>
      </section>
    </main>
  )
}

export default async function StartAuditPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, store_id, area_id, created_at, updated_at')
    .eq('id', user.id)
    .single<ProfileRow>()

  const email = user.email ?? profile?.email ?? 'Unknown email'

  if (profileError || !profile || !isUserRole(profile.role)) {
    return <MissingProfileDashboard email={email} />
  }

  if (
    (profile.role === 'store_manager' || profile.role === 'leader') &&
    !profile.store_id
  ) {
    return (
      <AssignmentNotice
        title="Store assignment needed"
        message="Ask an admin to assign your profile to a store before starting an audit."
      />
    )
  }

  if (profile.role === 'area_manager' && !profile.area_id) {
    return (
      <AssignmentNotice
        title="Area assignment needed"
        message="Ask an admin to assign your profile to an area before starting an audit."
      />
    )
  }

  let stores: StoreRow[] | null = null

  if (profile.role === 'admin') {
    const { data } = await supabase
      .from('stores')
      .select('id, name, code, area_id')
      .eq('is_active', true)
      .order('name', { ascending: true })
      .returns<StoreRow[]>()

    stores = data
  } else if (profile.role === 'area_manager' && profile.area_id) {
    const { data } = await supabase
      .from('stores')
      .select('id, name, code, area_id')
      .eq('area_id', profile.area_id)
      .eq('is_active', true)
      .order('name', { ascending: true })
      .returns<StoreRow[]>()

    stores = data
  } else if (profile.store_id) {
    const { data } = await supabase
      .from('stores')
      .select('id, name, code, area_id')
      .eq('id', profile.store_id)
      .eq('is_active', true)
      .returns<StoreRow[]>()

    stores = data
  }

  const areaIds = Array.from(new Set((stores ?? []).map((store) => store.area_id)))
  let areas: AreaRow[] | null = null

  if (areaIds.length > 0) {
    const { data } = await supabase
      .from('areas')
      .select('id, name')
      .in('id', areaIds)
      .returns<AreaRow[]>()

    areas = data
  }

  const areaNames = new Map((areas ?? []).map((area) => [area.id, area.name]))
  const storeOptions = toStoreOptions(stores, areaNames)
  const fixedStore =
    profile.role === 'store_manager' || profile.role === 'leader'
      ? storeOptions[0] ?? null
      : null
  const startAuditProfile: StartAuditProfile = {
    role: profile.role,
    areaId: profile.area_id,
    storeId: profile.store_id,
  }

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
              <p className="text-xs font-medium text-muted">Start Audit</p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              {formatUserRole(profile.role)}
            </span>
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Back to dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="app-card overflow-hidden rounded-[1.5rem]">
          <div className="grid gap-0 lg:grid-cols-[1fr_18rem]">
            <div className="p-5 sm:p-7">
              <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                Start Audit
              </p>
              <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                Set up the visit.
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
                Choose the store, timing, and visit context. The next step opens
                the guided checklist for the selected store.
              </p>
            </div>
            <div className="border-t border-border bg-info p-5 text-white lg:border-l lg:border-t-0 sm:p-7">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                Next
              </p>
              <p className="mt-3 text-2xl font-semibold">Guided checklist</p>
              <p className="mt-2 text-sm leading-6 text-slate-300">
                One focused question at a time with score preview and review.
              </p>
            </div>
          </div>
        </section>

        {storeOptions.length === 0 ? (
          <div className="rounded-2xl border border-warning/20 bg-warning-soft p-5 text-warning shadow-sm">
            <p className="text-sm font-semibold">No active stores available</p>
            <p className="mt-2 text-sm leading-6">
              There are no active stores available for your role. Ask an admin
              to check your assignment or store status.
            </p>
          </div>
        ) : null}

        <StartAuditForm
          profile={startAuditProfile}
          stores={storeOptions}
          fixedStore={fixedStore}
        />
      </section>
    </main>
  )
}
