import { redirect } from 'next/navigation'

import { signOut } from '@/app/auth/actions'
import {
  formatUserRole,
  isUserRole,
  type ProfileRow,
} from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, store_id, area_id, created_at, updated_at')
    .eq('id', user.id)
    .single<ProfileRow>()

  const hasProfile = !error && profile && isUserRole(profile.role)

  return (
    <main className="min-h-screen px-4 py-6 sm:px-6 lg:px-8">
      <section className="mx-auto flex w-full max-w-4xl flex-col gap-6">
        <header className="flex flex-col gap-4 rounded-2xl border border-border bg-surface p-5 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="text-sm font-medium text-primary">Audit Trainer</p>
            <h1 className="mt-2 text-3xl font-semibold text-foreground">
              Welcome back
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted">
              You are signed in and ready to continue your store audit work.
            </p>
          </div>

          <form action={signOut}>
            <button
              type="submit"
              className="min-h-11 rounded-lg border border-border bg-white px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              Sign out
            </button>
          </form>
        </header>

        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted">Signed-in email</p>
            <p className="mt-2 break-words text-lg font-semibold text-foreground">
              {user.email}
            </p>
          </div>

          <div className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
            <p className="text-sm font-medium text-muted">Role</p>
            <p className="mt-2 text-lg font-semibold text-foreground">
              {hasProfile ? formatUserRole(profile.role) : 'Profile pending'}
            </p>
          </div>
        </section>

        {!hasProfile ? (
          <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-6 text-amber-800">
            Your account is signed in, but your profile is not ready yet. Ask an
            admin to create your profile with one of the approved roles before
            using the app.
          </section>
        ) : null}
      </section>
    </main>
  )
}
