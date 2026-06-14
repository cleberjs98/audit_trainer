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
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <section className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 shadow-sm sm:p-8">
        <div className="mb-6 inline-flex rounded-full bg-primary px-3 py-1 text-xs font-semibold uppercase text-white">
          Internal access only
        </div>

        <div className="space-y-3">
          <h1 className="text-3xl font-semibold text-foreground">
            Audit Trainer
          </h1>
          <p className="text-base leading-7 text-muted">
            Sign in to continue to your store audit workspace.
          </p>
        </div>

        <LoginForm />
      </section>
    </main>
  )
}
