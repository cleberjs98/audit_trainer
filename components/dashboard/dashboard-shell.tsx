import Link from 'next/link'

import { signOut } from '@/app/auth/actions'
import { formatUserRole, type ProfileRow } from '@/lib/auth/profile'

type DashboardShellProps = {
  email: string
  profile: ProfileRow
  context: DashboardContext
}

type DashboardCard = {
  title: string
  description: string
  action: string
  note: string
  href?: string
  disabled?: boolean
}

export type DashboardContext = {
  label: string
  value: string
}

function getDashboardCards(profile: ProfileRow): DashboardCard[] {
  const isLeader = profile.role === 'leader'
  const canManageStores =
    profile.role === 'admin' || profile.role === 'area_manager'

  const cards: DashboardCard[] = [
    {
      title: 'Start New Audit',
      description: isLeader
        ? 'Start a training audit for your assigned store.'
        : 'Create a new draft training audit for an active store.',
      action: 'Start Audit',
      note: 'Available',
      href: '/start-audit',
    },
    {
      title: 'View Audit History',
      description:
        'Review completed and in-progress audits available to your role.',
      action: 'View Audit History',
      note: 'Available',
      href: '/audits',
    },
    {
      title: 'Action Plans',
      description:
        'Track manual follow-up actions created from completed store audits.',
      action: 'Open Action Plans',
      note: 'Available',
      href: '/action-plans',
    },
  ]

  if (canManageStores) {
    cards.push({
      title: 'Store Management',
      description:
        profile.role === 'admin'
          ? 'Manage all stores and operational store details.'
          : 'Create and update stores inside your assigned area.',
      action: 'Open Store Management',
      note: 'Available',
      href: '/store-management',
    })
  }

  return cards
}

export function DashboardShell({
  email,
  profile,
  context,
}: DashboardShellProps) {
  const cards = getDashboardCards(profile)
  const roleLabel = formatUserRole(profile.role)
  const canManageStores =
    profile.role === 'admin' || profile.role === 'area_manager'
  const sidebarItems = [
    { label: 'Dashboard', href: '/dashboard', active: true },
    { label: 'Start Audit', href: '/start-audit', active: false },
    { label: 'Audit History', href: '/audits', active: false },
    { label: 'Action Plans', href: '/action-plans', active: false },
    ...(canManageStores
      ? [{ label: 'Stores', href: '/store-management', active: false }]
      : []),
  ]

  return (
    <main className="app-shell min-h-screen lg:grid lg:grid-cols-[17rem_1fr]">
      <aside className="app-sidebar hidden min-h-screen flex-col px-5 py-6 lg:flex">
        <div className="flex items-center gap-3">
          <div className="flex size-11 items-center justify-center rounded-xl bg-primary text-sm font-black text-white">
            AT
          </div>
          <div>
            <p className="text-lg font-semibold">Audit Trainer</p>
            <p className="text-xs font-medium text-slate-400">
              Operations suite
            </p>
          </div>
        </div>

        <nav className="mt-10 flex flex-1 flex-col gap-2" aria-label="Main">
          {sidebarItems.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              className={`rounded-xl px-4 py-3 text-sm font-semibold transition ${
                item.active
                  ? 'bg-primary text-white shadow-[0_12px_28px_rgba(209,31,58,0.24)]'
                  : 'text-slate-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="rounded-2xl border border-white/10 bg-white/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
            Signed in
          </p>
          <p className="mt-2 break-words text-sm font-semibold text-white">
            {email}
          </p>
          <form action={signOut} className="mt-4">
            <button
              type="submit"
              className="min-h-10 w-full rounded-xl border border-white/15 bg-white/10 px-4 text-sm font-semibold text-white transition hover:bg-white/15 focus:outline-none focus:ring-4 focus:ring-white/10"
            >
              Sign out
            </button>
          </form>
        </div>
      </aside>

      <div className="min-w-0">
        <header className="app-topbar border-b px-4 py-4 lg:hidden">
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
                Store Audit Trainer
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
              {roleLabel}
            </span>
            <form action={signOut}>
              <button
                type="submit"
                className="min-h-10 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
              >
                Sign out
              </button>
            </form>
          </div>
        </div>
        </header>

        <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
          <section className="app-card overflow-hidden rounded-[1.5rem]">
            <div className="grid gap-0 lg:grid-cols-[1fr_19rem]">
              <div className="p-5 sm:p-7">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                  Command center
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  Your audit workspace is ready.
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
                  Start guided audits, review store performance, and keep manual
                  action plans moving from one operational workspace.
                </p>
                <div className="mt-5 flex flex-col gap-3 sm:flex-row">
                  <Link
                    href="/start-audit"
                    className="app-primary-action inline-flex min-h-11 items-center justify-center rounded-xl px-5 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-primary/20"
                  >
                    Start New Audit
                  </Link>
                  <Link
                    href="/audits"
                    className="inline-flex min-h-11 items-center justify-center rounded-xl border border-border bg-white px-5 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
                  >
                    View Audit History
                  </Link>
                </div>
              </div>
              <div className="border-t border-border bg-info p-5 text-white lg:border-l lg:border-t-0 sm:p-7">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-300">
                  Current scope
                </p>
                <p className="mt-3 text-2xl font-semibold">
                  {context.value}
                </p>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  {context.label}
                </p>
              </div>
            </div>
          </section>

          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div className="app-card rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Role
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {roleLabel}
              </p>
              <p className="mt-2 text-sm text-muted">Access profile</p>
            </div>
            <div className="app-card rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Available workflows
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {cards.length}
              </p>
              <p className="mt-2 text-sm text-muted">Enabled actions</p>
            </div>
            <div className="app-card rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Store tools
              </p>
              <p className="mt-3 text-2xl font-semibold text-foreground">
                {canManageStores ? 'Enabled' : 'View only'}
              </p>
              <p className="mt-2 text-sm text-muted">Role based</p>
            </div>
            <div className="app-card rounded-2xl p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-muted">
                Account
              </p>
              <p className="mt-3 break-words text-base font-semibold text-foreground">
                {email}
              </p>
            </div>
          </section>

          {profile.role === 'leader' ? (
            <section className="rounded-2xl border border-info/20 bg-info-soft p-5 shadow-sm">
              <p className="text-sm font-semibold text-info">
                Read-focused dashboard
              </p>
              <p className="mt-2 text-sm leading-6 text-muted-strong">
                Leader access is designed for learning from existing store
                audits, reports, and action plans. Leaders can also start audits
                for their assigned store when training needs to be captured.
              </p>
            </section>
          ) : null}

          <section>
            <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-primary">
                  Quick actions
                </p>
                <h2 className="text-2xl font-semibold text-foreground">
                  Move work forward
                </h2>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {cards.map((card, index) => (
              <article
                key={card.title}
                className="app-card flex min-h-64 flex-col justify-between rounded-2xl p-5 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_22px_50px_rgba(23,26,31,0.12)]"
              >
                <div>
                  <div className="mb-5 flex items-center justify-between">
                    <div className="flex size-12 items-center justify-center rounded-2xl bg-primary-soft text-base font-black text-primary">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="rounded-full border border-border bg-surface-soft px-3 py-1 text-xs font-semibold text-muted">
                      {card.note}
                    </div>
                  </div>
                  <h3 className="text-xl font-semibold text-foreground">
                    {card.title}
                  </h3>
                  <p className="mt-3 text-sm leading-6 text-muted">
                    {card.description}
                  </p>
                </div>

                {card.href ? (
                  <Link
                    href={card.href}
                    className="app-primary-action mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-xl px-4 text-sm font-semibold transition focus:outline-none focus:ring-4 focus:ring-primary/20"
                  >
                    {card.action}
                  </Link>
                ) : (
                  <button
                    type="button"
                    disabled={card.disabled ?? true}
                    className="mt-6 min-h-11 w-full rounded-xl border border-border bg-surface-soft px-4 text-sm font-semibold text-muted"
                  >
                    {card.action}
                  </button>
                )}
              </article>
            ))}
            </div>
          </section>
        </section>
      </div>
    </main>
  )
}

export function MissingProfileDashboard({ email }: { email: string }) {
  return (
    <main className="min-h-screen bg-background">
      <header className="app-topbar border-b px-4 py-4">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-lg bg-primary text-sm font-bold text-white">
              AT
            </div>
            <p className="text-lg font-semibold text-foreground">
              Audit Trainer
            </p>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="min-h-10 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Sign out
            </button>
          </form>
        </div>
      </header>

      <section className="mx-auto w-full max-w-3xl px-4 py-8 sm:px-6">
        <div className="rounded-2xl border border-warning/20 bg-warning-soft p-5 text-warning shadow-sm">
          <p className="text-sm font-semibold">Profile setup needed</p>
          <h1 className="mt-2 text-2xl font-semibold">
            Your account is signed in.
          </h1>
          <p className="mt-3 text-sm leading-6">
            {email} does not have a ready profile yet. Ask an admin to create
            your profile with one of the approved roles before using the app.
          </p>
        </div>
      </section>
    </main>
  )
}
