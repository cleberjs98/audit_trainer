'use client'

import { useMemo, useState } from 'react'
import { useActionState } from 'react'
import {
  Clock,
  Mail,
  UserPlus,
  Users,
  XCircle,
} from 'lucide-react'

import {
  createInvitationAction,
  revokeInvitationAction,
} from '@/app/team/actions'
import { formatUserRole } from '@/lib/auth/profile'

import type {
  InvitationRole,
  PendingInvitation,
  TeamActionState,
  TeamScopeOption,
} from './types'
import { initialTeamActionState } from './types'

type TeamManagementClientProps = {
  currentRole: 'admin' | 'area_manager' | 'store_manager'
  areaOptions: TeamScopeOption[]
  storeOptions: TeamScopeOption[]
  fixedStoreLabel: string | null
  invitations: PendingInvitation[]
}

const ROLE_OPTIONS_BY_CURRENT_ROLE = {
  admin: ['admin', 'area_manager', 'store_manager', 'leader'],
  area_manager: ['store_manager', 'leader'],
  store_manager: ['leader'],
} as const satisfies Record<
  TeamManagementClientProps['currentRole'],
  readonly InvitationRole[]
>

function formatDateTime(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Europe/Dublin',
  }).format(date)
}

function formatInvitationStatus(status: PendingInvitation['status']) {
  return status
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function CopyableInviteLink({ state }: { state: TeamActionState }) {
  if (!state.manualInviteLink) {
    return null
  }

  return (
    <div className="mt-4 rounded-2xl border border-warning/25 bg-warning-soft p-4">
      <p className="text-sm font-semibold text-foreground">
        Development invite link
      </p>
      <p className="mt-2 text-sm leading-6 text-muted-strong">
        Share this link manually once, then create a new invitation if it is
        lost.
      </p>
      <code className="mt-3 block overflow-x-auto break-all rounded-xl border border-border bg-white px-3 py-2 text-xs font-semibold text-foreground">
        {state.manualInviteLink}
      </code>
    </div>
  )
}

function RevokeInvitationForm({ invitationId }: { invitationId: string }) {
  const [state, formAction, isPending] = useActionState(
    revokeInvitationAction,
    initialTeamActionState
  )

  return (
    <form action={formAction} className="flex flex-col gap-2 sm:items-end">
      <input type="hidden" name="invitation_id" value={invitationId} />
      <button
        type="submit"
        disabled={isPending}
        className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-danger/20 bg-danger-soft px-4 text-sm font-semibold text-danger transition hover:border-danger/40 hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        <XCircle aria-hidden="true" className="size-4" />
        {isPending ? 'Cancelling...' : 'Cancel invite'}
      </button>
      {state.message ? (
        <p
          className={`text-xs font-semibold ${
            state.status === 'error' ? 'text-danger' : 'text-success'
          }`}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  )
}

export function TeamManagementClient({
  currentRole,
  areaOptions,
  storeOptions,
  fixedStoreLabel,
  invitations,
}: TeamManagementClientProps) {
  const [state, formAction, isPending] = useActionState(
    createInvitationAction,
    initialTeamActionState
  )
  const availableRoles = ROLE_OPTIONS_BY_CURRENT_ROLE[currentRole]
  const defaultRole = availableRoles[0]
  const [selectedRole, setSelectedRole] = useState<InvitationRole>(defaultRole)
  const defaultAreaId = areaOptions[0]?.id ?? ''
  const defaultStoreId = storeOptions[0]?.id ?? ''
  const showAreaSelector =
    currentRole === 'admin' && selectedRole === 'area_manager'
  const showStoreSelector =
    currentRole !== 'store_manager' &&
    (selectedRole === 'store_manager' || selectedRole === 'leader')

  const roleDescriptions = useMemo(
    () => ({
      admin: 'Full workspace access. No area or store scope.',
      area_manager: 'Manages one area. Requires an area scope.',
      store_manager: 'Manages one store. Requires a store scope.',
      leader: 'Operational access for one store. Requires a store scope.',
    }),
    []
  )

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] lg:items-start">
      <section className="app-card rounded-[1.5rem] p-5 sm:p-6">
        <div className="flex items-start gap-4">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary-soft text-primary">
            <UserPlus aria-hidden="true" className="size-6" />
          </div>
          <div>
            <p className="text-sm font-semibold text-primary">
              Invite user
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Create a pending invitation
            </h2>
            <p className="mt-2 text-sm leading-6 text-muted">
              The invited person must sign in with the same email before
              accepting the invitation.
            </p>
          </div>
        </div>

        <form action={formAction} className="mt-6 grid gap-5">
          <div className="grid gap-2">
            <label
              htmlFor="email"
              className="text-sm font-semibold text-foreground"
            >
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              placeholder="name@example.com"
              className="min-h-12 rounded-xl border border-border bg-white px-4 text-base text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            />
          </div>

          <div className="grid gap-2">
            <label
              htmlFor="role"
              className="text-sm font-semibold text-foreground"
            >
              Role
            </label>
            <select
              id="role"
              name="role"
              defaultValue={defaultRole}
              onChange={(event) =>
                setSelectedRole(event.target.value as InvitationRole)
              }
              className="min-h-12 rounded-xl border border-border bg-white px-4 text-base font-semibold text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            >
              {availableRoles.map((role) => (
                <option key={role} value={role}>
                  {formatUserRole(role)}
                </option>
              ))}
            </select>
            <div className="grid gap-2 rounded-2xl border border-border bg-surface-soft p-3">
              {availableRoles.map((role) => (
                <p key={role} className="text-xs leading-5 text-muted">
                  <span className="font-semibold text-foreground">
                    {formatUserRole(role)}:
                  </span>{' '}
                  {roleDescriptions[role]}
                </p>
              ))}
            </div>
          </div>

          {showAreaSelector && areaOptions.length > 0 ? (
            <div className="grid gap-2">
              <label
                htmlFor="area_id"
                className="text-sm font-semibold text-foreground"
              >
                Area for Area Manager invites
              </label>
              <select
                id="area_id"
                name="area_id"
                defaultValue={defaultAreaId}
                className="min-h-12 rounded-xl border border-border bg-white px-4 text-base font-semibold text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
              >
                {areaOptions.map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {currentRole === 'store_manager' ? (
            <div className="rounded-2xl border border-border bg-surface-soft p-4">
              <p className="text-sm font-semibold text-foreground">
                Store scope
              </p>
              <p className="mt-1 text-sm text-muted">
                {fixedStoreLabel ?? 'Your assigned store'}
              </p>
              <input type="hidden" name="store_id" value={defaultStoreId} />
            </div>
          ) : showStoreSelector && storeOptions.length > 0 ? (
            <div className="grid gap-2">
              <label
                htmlFor="store_id"
                className="text-sm font-semibold text-foreground"
              >
                Store for Store Manager or Leader invites
              </label>
              <select
                id="store_id"
                name="store_id"
                defaultValue={defaultStoreId}
                className="min-h-12 rounded-xl border border-border bg-white px-4 text-base font-semibold text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
              >
                {storeOptions.map((store) => (
                  <option key={store.id} value={store.id}>
                    {store.label}
                  </option>
                ))}
              </select>
            </div>
          ) : null}

          {state.message ? (
            <div
              role="status"
              className={`rounded-2xl border p-4 text-sm font-semibold ${
                state.status === 'error'
                  ? 'border-danger/20 bg-danger-soft text-danger'
                  : state.status === 'warning'
                    ? 'border-warning/25 bg-warning-soft text-warning'
                  : 'border-success/20 bg-success-soft text-success'
              }`}
            >
              {state.message}
            </div>
          ) : null}

          <CopyableInviteLink state={state} />

          <button
            type="submit"
            disabled={isPending}
            className="app-primary-action inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-sm font-semibold text-white transition focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <UserPlus aria-hidden="true" className="size-4" />
            {isPending ? 'Creating invitation...' : 'Create invitation'}
          </button>
        </form>
      </section>

      <section className="app-card rounded-[1.5rem] p-5 sm:p-6">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary-soft text-primary">
              <Users aria-hidden="true" className="size-6" />
            </div>
            <div>
            <p className="text-sm font-semibold text-primary">
              Pending invitations
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-foreground">
              Awaiting acceptance
            </h2>
            </div>
          </div>
          <p className="text-sm font-semibold text-muted">
            {invitations.length} pending
          </p>
        </div>

        {invitations.length === 0 ? (
          <div className="mt-5 rounded-2xl border border-border bg-surface-soft p-5">
            <p className="text-sm font-semibold text-foreground">
              No pending invitations.
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              New invitations will appear here until they are accepted,
              revoked, or expired.
            </p>
          </div>
        ) : (
          <div className="mt-5 grid gap-3">
            {invitations.map((invitation) => (
              <article
                key={invitation.id}
                className="rounded-2xl border border-border bg-white p-4 shadow-sm"
              >
                <div className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-start">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning-soft px-3 py-1 text-xs font-semibold text-warning">
                        <Clock aria-hidden="true" className="size-3.5" />
                        {formatInvitationStatus(invitation.status)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                        <Mail aria-hidden="true" className="size-3.5" />
                        {formatUserRole(invitation.role)}
                      </span>
                    </div>
                    <h3 className="mt-3 break-words text-lg font-semibold text-foreground">
                      {invitation.email}
                    </h3>
                    <div className="mt-2 grid gap-1 text-sm leading-6 text-muted sm:grid-cols-2">
                      <p>
                        <span className="font-semibold text-muted-strong">
                          Scope:
                        </span>{' '}
                        {invitation.scopeLabel}
                      </p>
                      <p>
                        <span className="font-semibold text-muted-strong">
                          Expires:
                        </span>{' '}
                        {formatDateTime(invitation.expiresAt)}
                      </p>
                      <p>
                        <span className="font-semibold text-muted-strong">
                          Invited by:
                        </span>{' '}
                        {invitation.invitedByLabel}
                      </p>
                      <p>
                        <span className="font-semibold text-muted-strong">
                          Created:
                        </span>{' '}
                        {formatDateTime(invitation.createdAt)}
                      </p>
                    </div>
                  </div>

                  <RevokeInvitationForm invitationId={invitation.id} />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
