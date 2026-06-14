'use client'

import { useActionState } from 'react'

import { signIn, type LoginFormState } from '@/app/auth/actions'

const initialState: LoginFormState = {
  message: '',
}

export function LoginForm() {
  const [state, formAction, isPending] = useActionState(signIn, initialState)

  return (
    <form action={formAction} className="mt-8 space-y-5">
      <div className="space-y-2">
        <label
          htmlFor="email"
          className="block text-sm font-medium text-foreground"
        >
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          className="min-h-12 w-full rounded-lg border border-border bg-white px-4 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="name@example.com"
        />
      </div>

      <div className="space-y-2">
        <label
          htmlFor="password"
          className="block text-sm font-medium text-foreground"
        >
          Password
        </label>
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className="min-h-12 w-full rounded-lg border border-border bg-white px-4 text-base text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          placeholder="Enter your password"
        />
      </div>

      {state.message ? (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {state.message}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="min-h-12 w-full rounded-lg bg-primary px-4 text-base font-semibold text-white shadow-sm transition hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-primary/30 disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isPending ? 'Signing in...' : 'Sign in'}
      </button>
    </form>
  )
}
