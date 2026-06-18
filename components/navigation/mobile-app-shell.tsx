import Link from 'next/link'
import {
  ClipboardList,
  Home,
  ListChecks,
  Store,
  Users,
  type LucideIcon,
} from 'lucide-react'

import type { UserRole } from '@/types/user'

type MobileNavActive = 'dashboard' | 'audits' | 'action-plans' | 'stores' | 'more'

type MobileAppHeaderProps = {
  title: string
  subtitle?: string
  actionHref?: string
  actionLabel?: string
  userLabel?: string
  rightSlot?: React.ReactNode
}

type MobileBottomNavProps = {
  role: UserRole
  active: MobileNavActive
}

type MobileNavItem = {
  key: MobileNavActive
  label: string
  href: string
  icon: LucideIcon
}

function initials(value: string | undefined) {
  if (!value) {
    return 'AT'
  }

  const [first = '', second = ''] = value
    .split(/[\s@.]+/)
    .filter(Boolean)

  return `${first.charAt(0)}${second.charAt(0) || first.charAt(1) || ''}`
    .toUpperCase()
    .slice(0, 2)
}

function mobileNavItems(role: UserRole, active: MobileNavActive) {
  const items: MobileNavItem[] = [
    { key: 'dashboard', label: 'Home', href: '/dashboard', icon: Home },
    { key: 'audits', label: 'Audits', href: '/audits', icon: ClipboardList },
    {
      key: 'action-plans',
      label: 'Plans',
      href: '/action-plans',
      icon: ListChecks,
    },
  ]

  const roleItems =
    role === 'admin' || role === 'area_manager'
      ? [
          {
            key: 'stores',
            label: 'Stores',
            href: '/store-management',
            icon: Store,
          } satisfies MobileNavItem,
        ]
      : []
  const moreItems =
    role === 'admin' || role === 'area_manager' || role === 'store_manager'
      ? [
          {
            key: 'more',
            label: 'Team',
            href: '/team',
            icon: Users,
          } satisfies MobileNavItem,
        ]
      : []

  return [...items, ...roleItems, ...moreItems].map((item) => ({
    ...item,
    active: item.key === active,
  }))
}

export function MobileAppHeader({
  title,
  subtitle,
  actionHref,
  actionLabel,
  userLabel,
  rightSlot,
}: MobileAppHeaderProps) {
  return (
    <header className="border-b border-border bg-surface/95 px-4 py-4 shadow-[0_12px_30px_rgba(23,26,31,0.08)] backdrop-blur lg:hidden">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-sm font-black text-white shadow-[0_10px_24px_rgba(209,31,58,0.22)]">
            AT
          </div>
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-foreground">
              {title}
            </p>
            {subtitle ? (
              <p className="truncate text-xs font-medium text-muted">
                {subtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          {rightSlot ? (
            rightSlot
          ) : (
            <>
              {actionHref && actionLabel ? (
                <Link
                  href={actionHref}
                  className="hidden min-h-10 items-center justify-center rounded-full border border-border bg-surface-soft px-3 text-xs font-semibold text-foreground shadow-sm transition hover:border-primary hover:text-primary sm:inline-flex"
                >
                  {actionLabel}
                </Link>
              ) : null}
              <div
                aria-label={
                  userLabel ? `Signed in as ${userLabel}` : 'Audit Trainer'
                }
                className="flex size-10 items-center justify-center rounded-full border border-border bg-surface-soft text-xs font-black text-primary"
              >
                {initials(userLabel)}
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export function MobileBottomNav({ role, active }: MobileBottomNavProps) {
  return (
    <nav
      aria-label="Mobile app navigation"
      className="fixed inset-x-0 bottom-0 z-50 border-t border-border bg-surface/95 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 shadow-[0_-14px_34px_rgba(23,26,31,0.14)] backdrop-blur lg:hidden"
    >
      <div className="mx-auto flex max-w-md items-center justify-around gap-1">
        {mobileNavItems(role, active).map((item) => {
          const Icon = item.icon

          return (
            <Link
              key={item.key}
              href={item.href}
              className={`flex min-h-12 flex-1 flex-col items-center justify-center rounded-2xl px-2 text-[0.7rem] font-semibold transition ${
                item.active
                  ? 'bg-primary text-white shadow-[0_10px_24px_rgba(209,31,58,0.24)]'
                  : 'text-muted hover:bg-surface-soft hover:text-foreground'
              }`}
              aria-current={item.active ? 'page' : undefined}
            >
              <Icon
                aria-hidden="true"
                className={`mb-1 size-5 ${
                  item.active ? 'text-white' : 'text-muted-strong'
                }`}
                strokeWidth={2.2}
              />
              {item.label}
            </Link>
          )
        })}
      </div>
    </nav>
  )
}
