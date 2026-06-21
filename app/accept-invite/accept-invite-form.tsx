'use client'

import Link from 'next/link'
import { useActionState, useState } from 'react'

import {
  createInviteAccountAction,
  type CreateInviteAccountState,
} from '@/app/accept-invite/actions'

const initialState: CreateInviteAccountState = {
  status: 'idle',
  message: '',
}

type AcceptInviteFormProps = {
  token: string
  email: string
}

export function AcceptInviteForm({ token, email }: AcceptInviteFormProps) {
  const [state, formAction, isPending] = useActionState(
    createInviteAccountAction,
    initialState
  )
  const [showPassword, setShowPassword] = useState(false)

  if (state.status === 'success') {
    return (
      <div className="space-y-5">
        <div className="rounded-2xl border border-success/20 bg-success-soft p-5">
          <h2 className="text-lg font-semibold text-foreground">
            Account ready
          </h2>
          <p className="mt-2 text-sm leading-6 text-muted-strong">
            {state.message}
          </p>
        </div>
        <Link
          href="/dashboard"
          className="app-primary-action inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 text-sm font-semibold text-white transition focus:outline-none focus:ring-4 focus:ring-primary/20 sm:w-auto"
        >
          Go to dashboard
        </Link>
      </div>
    )
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="token" value={token} />

      <div className="space-y-2">
        <label
          htmlFor="invite-email"
          className="block text-sm font-semibold text-foreground"
        >
          Invited email
        </label>
        <input
          id="invite-email"
          value={email}
          readOnly
          className="min-h-12 w-full rounded-xl border border-border bg-surface-soft px-4 text-base font-semibold text-muted-strong outline-none"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="full-name"
          className="block text-sm font-semibold text-foreground"
        >
          Name
        </label>
        <input
          id="full-name"
          name="full_name"
          type="text"
          autoComplete="name"
          required
          className="min-h-12 w-full rounded-xl border border-border bg-white px-4 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          placeholder="Enter your name"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-foreground"
          >
            Create password
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              minLength={8}
              className="min-h-12 w-full rounded-xl border border-border bg-white px-4 pr-20 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
              placeholder="At least 8 characters"
            />
            <button
              type="button"
              onClick={() => setShowPassword((current) => !current)}
              className="absolute right-2 top-1/2 inline-flex min-h-9 -translate-y-1/2 items-center justify-center rounded-lg border border-border bg-surface-soft px-3 text-xs font-semibold text-muted-strong transition hover:border-primary/20 hover:bg-primary-soft hover:text-primary"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="confirm-password"
            className="block text-sm font-semibold text-foreground"
          >
            Confirm password
          </label>
          <input
            id="confirm-password"
            name="confirm_password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="new-password"
            required
            minLength={8}
            className="min-h-12 w-full rounded-xl border border-border bg-white px-4 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            placeholder="Repeat password"
          />
        </div>
      </div>

      {state.status === 'error' && state.message ? (
        <div
          role="alert"
          className="rounded-xl border border-danger/20 bg-danger-soft px-4 py-3 text-sm font-semibold text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="app-primary-action min-h-12 w-full rounded-xl px-5 text-base font-semibold text-white transition focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? 'Creating account...' : 'Create account'}
      </button>
    </form>
  )
}
