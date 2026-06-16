import { redirect } from 'next/navigation'

import { LoginForm } from '@/components/auth/login-form'
import { createClient } from '@/lib/supabase/server'

export default async function LoginPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    redirect('/dashboard')
  }

  return (
    <main className="app-shell flex min-h-screen items-center justify-center px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
      <section className="grid w-full max-w-6xl overflow-hidden rounded-[1.75rem] border border-border bg-surface shadow-[0_30px_80px_rgba(23,26,31,0.16)] lg:grid-cols-[1.05fr_0.95fr]">
        <div className="relative hidden min-h-[620px] flex-col justify-between overflow-hidden bg-[#171A1F] p-10 text-white lg:flex">
          <div className="absolute inset-x-0 top-0 h-56 bg-[radial-gradient(circle_at_30%_20%,rgba(209,31,58,0.42),transparent_34rem)]" />
          <div className="relative">
            <div className="flex size-16 items-center justify-center rounded-2xl bg-primary text-lg font-black text-white shadow-[0_16px_35px_rgba(209,31,58,0.35)]">
              AT
            </div>
            <p className="mt-8 text-sm font-semibold uppercase tracking-[0.24em] text-primary-soft">
              Store operations command center
            </p>
            <h1 className="mt-4 max-w-xl text-5xl font-semibold leading-tight">
              Operational audits, made simple.
            </h1>
            <p className="mt-5 max-w-lg text-lg leading-8 text-slate-300">
              Run guided audits, complete action plans, and keep store
              performance visible without slowing the team down.
            </p>
          </div>

          <div className="relative grid gap-3">
            {['Guided checklist flow', 'Manual action plans', 'Role-scoped visibility'].map(
              (item) => (
                <div
                  key={item}
                  className="rounded-2xl border border-white/10 bg-white/10 px-4 py-3 text-sm font-semibold text-slate-100"
                >
                  {item}
                </div>
              )
            )}
          </div>
        </div>

        <div className="flex min-h-[620px] flex-col justify-center p-6 sm:p-10 lg:p-12">
          <div className="mb-8 flex items-center justify-between gap-3 lg:hidden">
            <div className="flex size-14 items-center justify-center rounded-2xl bg-primary text-base font-black text-white shadow-sm">
              AT
            </div>
            <div className="rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase text-primary">
              Internal access only
            </div>
          </div>

          <div className="max-w-lg">
            <div className="hidden rounded-full border border-primary/20 bg-primary-soft px-3 py-1 text-xs font-semibold uppercase text-primary lg:inline-flex">
              Internal access only
            </div>
            <h2 className="mt-4 text-4xl font-semibold tracking-tight text-foreground">
              Audit Trainer
            </h2>
            <p className="mt-3 text-base leading-7 text-muted">
              Sign in to manage audits, action plans, and store performance.
            </p>

            <LoginForm />
          </div>
        </div>
      </section>
    </main>
  )
}
