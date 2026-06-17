import Link from 'next/link'

import { acceptInviteAction } from '@/app/accept-invite/actions'
import { createClient } from '@/lib/supabase/server'

type AcceptInvitePageProps = {
  searchParams: Promise<{
    token?: string | string[]
  }>
}

function firstParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function roleLabel(role: string) {
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function PageShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
      <section className="w-full max-w-xl rounded-[1.75rem] border border-border bg-surface p-6 shadow-[0_24px_70px_rgba(23,26,31,0.14)] sm:p-8">
        <div className="mb-7 flex items-center gap-3">
          <div className="flex size-12 items-center justify-center rounded-2xl bg-primary text-sm font-black text-white shadow-[0_14px_28px_rgba(209,31,58,0.25)]">
            AT
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
              Audit Trainer
            </p>
            <h1 className="text-2xl font-semibold text-foreground">
              Invitation access
            </h1>
          </div>
        </div>

        {children}
      </section>
    </main>
  )
}

function ActionLink({
  href,
  children,
  primary = false,
}: {
  href: string
  children: React.ReactNode
  primary?: boolean
}) {
  return (
    <Link
      href={href}
      className={
        primary
          ? 'app-primary-action inline-flex min-h-12 items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition focus:outline-none focus:ring-4 focus:ring-primary/20'
          : 'inline-flex min-h-12 items-center justify-center rounded-xl border border-border bg-surface-soft px-5 text-sm font-semibold text-foreground transition hover:border-primary/25 hover:bg-primary-soft hover:text-primary'
      }
    >
      {children}
    </Link>
  )
}

export default async function AcceptInvitePage({
  searchParams,
}: AcceptInvitePageProps) {
  const params = await searchParams
  const token = firstParam(params.token)?.trim()

  if (!token) {
    return (
      <PageShell>
        <div className="rounded-2xl border border-danger/20 bg-danger-soft p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Invitation link missing
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-strong">
            This invitation link is missing its secure token. Open the latest
            invitation email or ask your manager to send a new invite.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ActionLink href="/login">Go to login</ActionLink>
          <ActionLink href="/dashboard" primary>
            Dashboard
          </ActionLink>
        </div>
      </PageShell>
    )
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <PageShell>
        <div className="rounded-2xl border border-warning/25 bg-warning-soft p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Sign in required
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-strong">
            Sign in with the email address that received this invitation, then
            open the invite link again to finish setup.
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ActionLink href="/login" primary>
            Go to login
          </ActionLink>
          <ActionLink href="/dashboard">Dashboard</ActionLink>
        </div>
      </PageShell>
    )
  }

  const result = await acceptInviteAction(token)

  if (result.status === 'error') {
    return (
      <PageShell>
        <div className="rounded-2xl border border-danger/20 bg-danger-soft p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Invitation could not be accepted
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-strong">
            {result.message}
          </p>
        </div>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <ActionLink href="/dashboard" primary>
            Dashboard
          </ActionLink>
          <ActionLink href="/login">Switch account</ActionLink>
        </div>
      </PageShell>
    )
  }

  const scopeLabel =
    result.storeName && result.storeCode
      ? `${result.storeName} (${result.storeCode})`
      : result.areaName ?? 'Workspace access'

  return (
    <PageShell>
      <div className="rounded-2xl border border-success/20 bg-success-soft p-5">
        <h2 className="text-lg font-semibold text-foreground">
          Invitation accepted
        </h2>
        <p className="mt-2 text-sm leading-6 text-muted-strong">
          Your Audit Trainer access is ready.
        </p>
      </div>

      <dl className="mt-6 grid gap-3 rounded-2xl border border-border bg-surface-soft p-4">
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm font-medium text-muted">Role</dt>
          <dd className="text-right text-sm font-semibold text-foreground">
            {roleLabel(result.role)}
          </dd>
        </div>
        <div className="flex items-center justify-between gap-4">
          <dt className="text-sm font-medium text-muted">Scope</dt>
          <dd className="text-right text-sm font-semibold text-foreground">
            {scopeLabel}
          </dd>
        </div>
      </dl>

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <ActionLink href="/dashboard" primary>
          Go to dashboard
        </ActionLink>
      </div>
    </PageShell>
  )
}
