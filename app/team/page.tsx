import Link from 'next/link'
import { redirect } from 'next/navigation'

import { TeamManagementClient } from '@/components/team/team-management-client'
import type {
  InvitationRole,
  InvitationStatus,
  PendingInvitation,
  TeamScopeOption,
} from '@/components/team/types'
import { MissingProfileDashboard } from '@/components/dashboard/dashboard-shell'
import {
  MobileAppHeader,
  MobileBottomNav,
} from '@/components/navigation/mobile-app-shell'
import { isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'

type AreaRow = {
  id: string
  name: string
}

type StoreRow = {
  id: string
  name: string
  code: string
  area_id: string
}

type InvitationRow = {
  id: string
  email: string
  role: InvitationRole
  status: InvitationStatus
  area_id: string | null
  store_id: string | null
  invited_by: string
  expires_at: string
  created_at: string
}

type InviterRow = {
  id: string
  full_name: string
  email: string
}

function canManageTeam(profile: ProfileRow) {
  return (
    profile.role === 'admin' ||
    profile.role === 'area_manager' ||
    profile.role === 'store_manager'
  )
}

function toAreaOptions(areas: AreaRow[]): TeamScopeOption[] {
  return areas.map((area) => ({
    id: area.id,
    label: area.name,
  }))
}

function toStoreOptions(stores: StoreRow[]): TeamScopeOption[] {
  return stores.map((store) => ({
    id: store.id,
    label: `${store.name} (${store.code})`,
    areaId: store.area_id,
  }))
}

function mapById<T extends { id: string }>(rows: T[]) {
  return new Map(rows.map((row) => [row.id, row]))
}

function invitationScopeLabel(
  invitation: InvitationRow,
  areaById: Map<string, AreaRow>,
  storeById: Map<string, StoreRow>
) {
  if (invitation.area_id) {
    return areaById.get(invitation.area_id)?.name ?? 'Area unavailable'
  }

  if (invitation.store_id) {
    const store = storeById.get(invitation.store_id)

    return store ? `${store.name} (${store.code})` : 'Store unavailable'
  }

  return 'All areas and stores'
}

function inviterLabel(
  invitation: InvitationRow,
  inviterById: Map<string, InviterRow>
) {
  const inviter = inviterById.get(invitation.invited_by)

  if (!inviter) {
    return 'Unavailable'
  }

  return inviter.full_name || inviter.email
}

function buildPendingInvitations(
  invitations: InvitationRow[],
  areas: AreaRow[],
  stores: StoreRow[],
  inviters: InviterRow[]
): PendingInvitation[] {
  const areaById = mapById(areas)
  const storeById = mapById(stores)
  const inviterById = mapById(inviters)

  return invitations.map((invitation) => ({
    id: invitation.id,
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    expiresAt: invitation.expires_at,
    createdAt: invitation.created_at,
    scopeLabel: invitationScopeLabel(invitation, areaById, storeById),
    invitedByLabel: inviterLabel(invitation, inviterById),
  }))
}

async function loadAreas(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: ProfileRow
) {
  let query = supabase.from('areas').select('id, name').order('name')

  if (profile.role === 'area_manager' && profile.area_id) {
    query = query.eq('id', profile.area_id)
  }

  const { data } = await query.returns<AreaRow[]>()

  return data ?? []
}

async function loadStores(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: ProfileRow
) {
  let query = supabase
    .from('stores')
    .select('id, name, code, area_id')
    .eq('is_active', true)
    .order('name')

  if (profile.role === 'area_manager' && profile.area_id) {
    query = query.eq('area_id', profile.area_id)
  }

  if (profile.role === 'store_manager' && profile.store_id) {
    query = query.eq('id', profile.store_id)
  }

  const { data } = await query.returns<StoreRow[]>()

  return data ?? []
}

async function loadPendingInvitations(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const { data } = await supabase
    .from('user_invitations')
    .select(
      'id, email, role, status, area_id, store_id, invited_by, expires_at, created_at'
    )
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .returns<InvitationRow[]>()

  return data ?? []
}

async function loadInviters(
  supabase: Awaited<ReturnType<typeof createClient>>,
  invitations: InvitationRow[]
) {
  const ids = Array.from(
    new Set(invitations.map((invitation) => invitation.invited_by))
  )

  if (ids.length === 0) {
    return []
  }

  const { data } = await supabase
    .from('profiles')
    .select('id, full_name, email')
    .in('id', ids)
    .returns<InviterRow[]>()

  return data ?? []
}

export default async function TeamPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, store_id, area_id, created_at, updated_at')
    .eq('id', user.id)
    .single<ProfileRow>()

  const hasProfile = !error && profile && isUserRole(profile.role)
  const email = user.email ?? profile?.email ?? 'Unknown email'

  if (!hasProfile) {
    return <MissingProfileDashboard email={email} />
  }

  if (!canManageTeam(profile)) {
    return (
      <main className="min-h-screen bg-background">
        <MobileAppHeader
          title="Team Management"
          subtitle="Access restricted"
          actionHref="/dashboard"
          actionLabel="Home"
        />
        <header className="app-topbar hidden border-b px-4 py-4 lg:block">
          <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
                AT
              </div>
              <div>
                <p className="text-lg font-semibold text-foreground">
                  Audit Trainer
                </p>
                <p className="text-xs font-medium text-muted">
                  Team Management
                </p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Dashboard
            </Link>
          </div>
        </header>

        <section className="mx-auto w-full max-w-3xl px-4 pb-28 pt-6 sm:px-6 lg:pb-8 lg:pt-8">
          <div className="rounded-2xl border border-warning/25 bg-warning-soft p-5">
            <p className="text-sm font-semibold text-warning">
              Access restricted
            </p>
            <h1 className="mt-2 text-2xl font-semibold text-foreground">
              Team Management is not available for your role.
            </h1>
            <p className="mt-3 text-sm leading-6 text-muted-strong">
              Leaders do not manage invitations in V1.
            </p>
          </div>
        </section>
      </main>
    )
  }

  const [areas, stores, invitations] = await Promise.all([
    loadAreas(supabase, profile),
    loadStores(supabase, profile),
    loadPendingInvitations(supabase),
  ])
  const inviters = await loadInviters(supabase, invitations)
  const pendingInvitations = buildPendingInvitations(
    invitations,
    areas,
    stores,
    inviters
  )
  const storeOptions = toStoreOptions(stores)
  const currentRole = profile.role as 'admin' | 'area_manager' | 'store_manager'
  const fixedStoreLabel =
    profile.role === 'store_manager'
      ? storeOptions[0]?.label ?? 'Assigned store unavailable'
      : null

  return (
    <main className="min-h-screen bg-background">
      <MobileAppHeader
        title="Team Management"
        subtitle={`${pendingInvitations.length} pending invites`}
        actionHref="/dashboard"
        actionLabel="Home"
      />

      <header className="app-topbar hidden border-b px-4 py-4 lg:block">
        <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              AT
            </div>
            <div>
              <p className="text-lg font-semibold text-foreground">
                Audit Trainer
              </p>
              <p className="text-xs font-medium text-muted">
                Team Management
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center justify-center rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Dashboard
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-28 pt-5 sm:px-6 lg:gap-6 lg:px-8 lg:pb-8 lg:pt-6">
        <section className="rounded-[1.5rem] border border-white/10 bg-info p-5 text-white shadow-[0_18px_45px_rgba(23,26,31,0.14)] lg:border-border lg:bg-surface lg:text-foreground lg:shadow-[0_14px_38px_rgba(23,26,31,0.07)] sm:p-7">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary-soft lg:text-primary">
            Controlled access
          </p>
          <div className="mt-3 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl lg:text-foreground">
                Team Management
              </h1>
              <p className="mt-3 max-w-3xl text-base leading-7 text-slate-300 lg:text-muted">
                Create scoped invitations and manage pending invite access.
                Request access, multi-store managers, and active user
                assignment controls are future phases.
              </p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 lg:border-border lg:bg-surface-soft">
              <p className="text-xs font-semibold text-slate-300 lg:text-muted">
                Pending invitations
              </p>
              <p className="mt-1 text-2xl font-semibold text-white lg:text-foreground">
                {pendingInvitations.length}
              </p>
            </div>
          </div>
        </section>

        <TeamManagementClient
          currentRole={currentRole}
          areaOptions={toAreaOptions(areas)}
          storeOptions={storeOptions}
          fixedStoreLabel={fixedStoreLabel}
          invitations={pendingInvitations}
        />
      </section>
      <MobileBottomNav role={profile.role} active="more" />
    </main>
  )
}
