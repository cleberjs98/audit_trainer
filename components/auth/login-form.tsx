'use client'

import { useState } from 'react'
import { useActionState } from 'react'

import { signIn, type LoginFormState } from '@/app/auth/actions'

const initialState: LoginFormState = {
  message: '',
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState)
  const [showPassword, setShowPassword] = useState(false)

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-semibold text-foreground"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="min-h-14 w-full rounded-xl border border-border bg-white px-4 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
          placeholder="name@example.com"
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-3">
          <label
            htmlFor="password"
            className="block text-sm font-semibold text-foreground"
          >
            Password
          </label>
          <button
            type="button"
            className="rounded-lg border border-transparent px-2 py-1 text-sm font-semibold text-primary transition hover:border-primary/20 hover:bg-primary-soft hover:text-primary-dark"
            aria-label="Forgot password is not available yet"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={showPassword ? 'text' : 'password'}
            autoComplete="current-password"
            required
            className="min-h-14 w-full rounded-xl border border-border bg-white px-4 pr-20 text-base font-medium text-foreground outline-none transition focus:border-primary focus:ring-4 focus:ring-primary/15"
            placeholder="Enter your password"
          />
          <button
            type="button"
            onClick={() => setShowPassword((current) => !current)}
            className="absolute right-2 top-1/2 inline-flex min-h-10 -translate-y-1/2 items-center justify-center rounded-lg border border-border bg-surface-soft px-3 text-sm font-semibold text-muted-strong transition hover:border-primary/20 hover:bg-primary-soft hover:text-primary"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
      </div>

      {state.message ? (
        <div
          role="alert"
          className="rounded-lg border border-danger/20 bg-danger-soft px-4 py-3 text-sm text-danger"
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="app-primary-action min-h-14 w-full rounded-xl px-4 text-base font-semibold transition focus:outline-none focus:ring-4 focus:ring-primary/20 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
