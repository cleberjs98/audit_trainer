import Link from 'next/link'

import { signOut } from '@/app/auth/actions'
import { formatUserRole, type ProfileRow } from '@/lib/auth/profile'
import {
  MobileAppHeader,
  MobileBottomNav,
} from '@/components/navigation/mobile-app-shell'

type DashboardShellProps = {
  email: string
  profile: ProfileRow
  context: DashboardContext
  analytics: DashboardAnalytics
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

export type DashboardMetric = {
  label: string
  value: string
  helper: string
  tone?: 'neutral' | 'success' | 'warning' | 'danger'
}

export type DashboardRecentAudit = {
  id: string
  storeName: string
  storeCode: string
  visitDate: string
  completedAt: string | null
  scoreLabel: string
  scoreBand: 'excellent' | 'good' | 'needs_focus' | 'critical' | null
  scoreBandLabel: string
}

export type DashboardAttentionStore = {
  storeName: string
  storeCode: string
  reason: string
  scoreLabel: string
  tone: 'excellent' | 'good' | 'needs_focus' | 'critical'
}

export type DashboardActionItem = {
  id: string
  title: string
  owner: string | null
  priority: 'low' | 'medium' | 'high'
  dueDate: string | null
  status: 'open' | 'in_progress' | 'completed'
  storeName: string
  isOverdue: boolean
}

export type DashboardWeakSection = {
  title: string
  score: string
  percentage: number
}

export type DashboardAnalytics = {
  scopeLabel: string
  scopeValue: string
  completedThisMonth: number
  averageScoreThisMonth: number | null
  criticalOrNeedsFocusCount: number
  openActionPlanCount: number
  openActionItemCount: number
  overdueActionItemCount: number
  latestAudit: DashboardRecentAudit | null
  trendDelta: number | null
  metrics: DashboardMetric[]
  recentAudits: DashboardRecentAudit[]
  attentionStores: DashboardAttentionStore[]
  currentActionItems: DashboardActionItem[]
  weakestSections: DashboardWeakSection[]
}

function formatDate(value: string | null) {
  if (!value) {
    return 'Not dated'
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    const [year, month, day] = value.split('-')

    return year && month && day ? `${day}/${month}/${year}` : value
  }

  return new Intl.DateTimeFormat('en-IE', {
    dateStyle: 'medium',
    timeZone: 'Europe/Dublin',
  }).format(date)
}

function formatStatus(value: string) {
  return value
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function metricToneClass(tone: DashboardMetric['tone']) {
  if (tone === 'success') {
    return 'border-success/20 bg-success-soft text-success'
  }

  if (tone === 'warning') {
    return 'border-warning/20 bg-warning-soft text-warning'
  }

  if (tone === 'danger') {
    return 'border-danger/20 bg-danger-soft text-danger'
  }

  return 'border-primary/20 bg-primary-soft text-primary'
}

function scoreBandTone(
  tone: DashboardRecentAudit['scoreBand'] | DashboardAttentionStore['tone']
) {
  if (tone === 'excellent' || tone === 'good') {
    return 'border-success/20 bg-success-soft text-success'
  }

  if (tone === 'needs_focus') {
    return 'border-warning/20 bg-warning-soft text-warning'
  }

  if (tone === 'critical') {
    return 'border-danger/20 bg-danger-soft text-danger'
  }

  return 'border-border bg-surface-soft text-muted'
}

function priorityTone(priority: DashboardActionItem['priority']) {
  if (priority === 'high') {
    return 'border-danger/20 bg-danger-soft text-danger'
  }

  if (priority === 'medium') {
    return 'border-warning/20 bg-warning-soft text-warning'
  }

  return 'border-success/20 bg-success-soft text-success'
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-soft p-5">
      <p className="text-sm font-semibold text-foreground">{message}</p>
    </div>
  )
}

function getDashboardCards(profile: ProfileRow): DashboardCard[] {
  const isLeader = profile.role === 'leader'
  const canManageStores =
    profile.role === 'admin' || profile.role === 'area_manager'
  const canManageTeam =
    profile.role === 'admin' ||
    profile.role === 'area_manager' ||
    profile.role === 'store_manager'

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

  if (canManageTeam) {
    cards.push({
      title: 'Team Management',
      description:
        profile.role === 'store_manager'
          ? 'Invite leaders for your assigned store and manage pending invites.'
          : 'Create scoped invitations and manage pending team access.',
      action: 'Open Team Management',
      note: 'Available',
      href: '/team',
    })
  }

  return cards
}

export function DashboardShell({
  email,
  profile,
  context,
  analytics,
}: DashboardShellProps) {
  const cards = getDashboardCards(profile)
  const roleLabel = formatUserRole(profile.role)
  const canManageStores =
    profile.role === 'admin' || profile.role === 'area_manager'
  const canManageTeam =
    profile.role === 'admin' ||
    profile.role === 'area_manager' ||
    profile.role === 'store_manager'
  const sidebarItems = [
    { label: 'Dashboard', href: '/dashboard', active: true },
    { label: 'Start Audit', href: '/start-audit', active: false },
    { label: 'Audit History', href: '/audits', active: false },
    { label: 'Action Plans', href: '/action-plans', active: false },
    ...(canManageStores
      ? [{ label: 'Stores', href: '/store-management', active: false }]
      : []),
    ...(canManageTeam
      ? [{ label: 'Team', href: '/team', active: false }]
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
        <MobileAppHeader
          title="Audit Trainer"
          subtitle={roleLabel}
          userLabel={email}
          rightSlot={
            <form action={signOut}>
              <button
                type="submit"
                className="min-h-10 rounded-full border border-border bg-surface-soft px-3 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary hover:text-primary focus:outline-none focus:ring-4 focus:ring-primary/15"
              >
                Sign out
              </button>
            </form>
          }
        />

        <section className="mx-auto flex w-full max-w-7xl flex-col gap-5 px-4 pb-28 pt-5 sm:px-6 lg:gap-6 lg:px-8 lg:pb-8 lg:pt-6">
          <section className="app-card overflow-hidden rounded-[1.5rem]">
            <div className="grid gap-0 lg:grid-cols-[1fr_19rem]">
              <div className="p-5 sm:p-7">
                <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
                  Command center
                </p>
                <h1 className="mt-3 text-3xl font-semibold tracking-tight text-foreground sm:text-4xl">
                  {profile.role === 'admin'
                    ? 'Business performance at a glance.'
                    : profile.role === 'area_manager'
                      ? 'Area performance at a glance.'
                      : profile.role === 'store_manager'
                        ? 'Store performance and follow-up.'
                        : "Today's store execution view."}
                </h1>
                <p className="mt-3 max-w-3xl text-base leading-7 text-muted">
                  Track audit scores, action plans, and stores that need
                  attention from one role-scoped command center.
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

          <section className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-1 md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 md:pb-0 xl:grid-cols-4">
            {analytics.metrics.map((metric) => (
              <div
                key={metric.label}
                className="app-card min-w-[10.5rem] rounded-2xl p-4 md:min-w-0 md:p-5"
              >
                <div
                  className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold ${metricToneClass(
                    metric.tone
                  )}`}
                >
                  {metric.label}
                </div>
                <p className="mt-4 text-2xl font-semibold text-foreground">
                  {metric.value}
                </p>
                <p className="mt-2 text-sm text-muted">{metric.helper}</p>
              </div>
            ))}
          </section>

          <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
            <article className="app-card rounded-2xl p-5 sm:p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="text-sm font-semibold text-primary">
                    Recent audits
                  </p>
                  <h2 className="text-2xl font-semibold text-foreground">
                    Latest completed visits
                  </h2>
                </div>
                <Link
                  href="/audits"
                  className="inline-flex min-h-10 items-center justify-center rounded-xl border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary"
                >
                  View all
                </Link>
              </div>

              {analytics.recentAudits.length === 0 ? (
                <div className="mt-5">
                  <EmptyState message="No completed audits yet." />
                </div>
              ) : (
                <div className="mt-5 grid gap-3">
                  {analytics.recentAudits.map((audit) => (
                    <Link
                      key={audit.id}
                      href={`/audits/${audit.id}`}
                      className="rounded-2xl border border-border bg-white p-4 transition hover:border-primary/40 hover:shadow-md"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-foreground">
                            {audit.storeName} ({audit.storeCode})
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            Visit {formatDate(audit.visitDate)}
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold text-primary">
                            {audit.scoreLabel}
                          </span>
                          <span
                            className={`rounded-full border px-3 py-1 text-xs font-semibold ${scoreBandTone(
                              audit.scoreBand
                            )}`}
                          >
                            {audit.scoreBandLabel}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </article>

            <article className="app-card rounded-2xl p-5 sm:p-6">
              <p className="text-sm font-semibold text-primary">
                Action plans
              </p>
              <h2 className="text-2xl font-semibold text-foreground">
                Current priorities
              </h2>
              <div className="mt-4 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-border bg-surface-soft p-3">
                  <p className="text-xs font-semibold text-muted">Plans</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {analytics.openActionPlanCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-border bg-surface-soft p-3">
                  <p className="text-xs font-semibold text-muted">Items</p>
                  <p className="mt-1 text-xl font-semibold text-foreground">
                    {analytics.openActionItemCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-warning/20 bg-warning-soft p-3">
                  <p className="text-xs font-semibold text-warning">Overdue</p>
                  <p className="mt-1 text-xl font-semibold text-warning">
                    {analytics.overdueActionItemCount}
                  </p>
                </div>
              </div>

              {analytics.currentActionItems.length === 0 ? (
                <div className="mt-5">
                  <EmptyState message="No open action plan items." />
                </div>
              ) : (
                <div className="mt-5 grid gap-3">
                  {analytics.currentActionItems.map((item) => (
                    <div
                      key={item.id}
                      className="rounded-2xl border border-border bg-white p-4"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${priorityTone(
                            item.priority
                          )}`}
                        >
                          {formatStatus(item.priority)}
                        </span>
                        {item.isOverdue ? (
                          <span className="rounded-full border border-danger/20 bg-danger-soft px-3 py-1 text-xs font-semibold text-danger">
                            Overdue
                          </span>
                        ) : null}
                      </div>
                      <p className="mt-3 line-clamp-2 text-sm font-semibold text-foreground">
                        {item.title}
                      </p>
                      <p className="mt-2 text-xs leading-5 text-muted">
                        {item.storeName}
                        {item.owner ? ` - ${item.owner}` : ''}
                        {item.dueDate ? ` - Due ${formatDate(item.dueDate)}` : ''}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <article className="app-card rounded-2xl p-5 sm:p-6">
              <p className="text-sm font-semibold text-primary">
                Needs attention
              </p>
              <h2 className="text-2xl font-semibold text-foreground">
                Stores to watch
              </h2>

              {analytics.attentionStores.length === 0 ? (
                <div className="mt-5">
                  <EmptyState message="No stores need attention right now." />
                </div>
              ) : (
                <div className="mt-5 grid gap-3">
                  {analytics.attentionStores.map((store) => (
                    <div
                      key={`${store.storeCode}-${store.reason}`}
                      className="rounded-2xl border border-border bg-white p-4"
                    >
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div>
                          <p className="font-semibold text-foreground">
                            {store.storeName} ({store.storeCode})
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {store.reason}
                          </p>
                        </div>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold ${scoreBandTone(
                            store.tone
                          )}`}
                        >
                          {store.scoreLabel}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>

            <article className="app-card rounded-2xl p-5 sm:p-6">
              <p className="text-sm font-semibold text-primary">
                Score focus
              </p>
              <h2 className="text-2xl font-semibold text-foreground">
                Weakest checklist areas
              </h2>

              {analytics.weakestSections.length === 0 ? (
                <div className="mt-5">
                  <EmptyState message="No completed audit section data yet." />
                </div>
              ) : (
                <div className="mt-5 grid gap-3">
                  {analytics.weakestSections.map((section) => (
                    <div
                      key={section.title}
                      className="rounded-2xl border border-border bg-white p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-foreground">
                            {section.title}
                          </p>
                          <p className="mt-1 text-sm text-muted">
                            {section.score}
                          </p>
                        </div>
                        <p className="text-lg font-semibold text-foreground">
                          {section.percentage}%
                        </p>
                      </div>
                      <div className="mt-3 h-2 overflow-hidden rounded-full bg-surface-soft">
                        <div
                          className="h-full rounded-full bg-primary"
                          style={{
                            width: `${Math.max(
                              0,
                              Math.min(100, section.percentage)
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </article>
          </section>

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

            <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 xl:grid-cols-4">
            {cards.map((card, index) => (
              <article
                key={card.title}
                className="app-card flex flex-col justify-between rounded-2xl p-4 transition hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-[0_22px_50px_rgba(23,26,31,0.12)] sm:min-h-64 sm:p-5"
              >
                <div>
                  <div className="mb-4 flex items-center justify-between sm:mb-5">
                    <div className="flex size-11 items-center justify-center rounded-2xl bg-primary-soft text-base font-black text-primary sm:size-12">
                      {String(index + 1).padStart(2, '0')}
                    </div>
                    <div className="rounded-full border border-border bg-surface-soft px-3 py-1 text-xs font-semibold text-muted">
                      {card.note}
                    </div>
                  </div>
                  <h3 className="text-lg font-semibold text-foreground sm:text-xl">
                    {card.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-muted sm:mt-3">
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
      <MobileBottomNav role={profile.role} active="dashboard" />
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
