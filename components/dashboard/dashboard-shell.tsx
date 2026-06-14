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
      action: 'Coming soon',
      note: 'Placeholder',
    },
    {
      title: 'Action Plans',
      description:
        'Track follow-up actions generated from completed store audits.',
      action: 'Coming soon',
      note: 'Placeholder',
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
                Store Audit Trainer
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-primary/20 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
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

      <section className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:px-8">
        <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm sm:p-6">
          <div className="max-w-3xl">
            <p className="text-sm font-medium text-primary">Welcome back</p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">
              Your audit workspace is ready.
            </h1>
            <p className="mt-3 text-base leading-7 text-muted">
              Use this dashboard to start audits, review audit history, and
              follow action plans as each workflow becomes available.
            </p>
          </div>
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted">Signed-in email</p>
            <p className="mt-2 break-words text-base font-semibold text-foreground">
              {email}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted">Role</p>
            <p className="mt-2 text-base font-semibold text-foreground">
              {roleLabel}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted">{context.label}</p>
            <p className="mt-2 break-words text-base font-semibold text-foreground">
              {context.value}
            </p>
          </div>
        </section>

        {profile.role === 'leader' ? (
          <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-semibold text-primary">
              Read-focused dashboard
            </p>
            <p className="mt-2 text-sm leading-6 text-muted">
              Leader access is designed for learning from existing store audits,
              reports, and action plans. Leaders can also start audits for
              their assigned store when training needs to be captured.
            </p>
          </section>
        ) : null}

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((card) => (
            <article
              key={card.title}
              className="flex min-h-56 flex-col justify-between rounded-2xl border border-border bg-surface p-5 shadow-sm"
            >
              <div>
                <div className="mb-4 inline-flex rounded-full border border-border bg-background px-3 py-1 text-xs font-semibold text-muted">
                  {card.note}
                </div>
                <h2 className="text-xl font-semibold text-foreground">
                  {card.title}
                </h2>
                <p className="mt-3 text-sm leading-6 text-muted">
                  {card.description}
                </p>
              </div>

              {card.href ? (
                <Link
                  href={card.href}
                  className="mt-6 inline-flex min-h-11 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-semibold text-white transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  {card.action}
                </Link>
              ) : (
                <button
                  type="button"
                  disabled={card.disabled ?? true}
                  className="mt-6 min-h-11 w-full rounded-lg border border-border bg-background px-4 text-sm font-semibold text-muted"
                >
                  {card.action}
                </button>
              )}
            </article>
          ))}
        </section>
      </section>
    </main>
  )
}

export function MissingProfileDashboard({ email }: { email: string }) {
  return (
    <main className="min-h-screen bg-background">
      <header className="border-b border-border bg-surface/90 px-4 py-4 shadow-sm">
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
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 shadow-sm">
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
