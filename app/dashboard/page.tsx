import { redirect } from 'next/navigation'

import {
  DashboardShell,
  MissingProfileDashboard,
} from '@/components/dashboard/dashboard-shell'
import {
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
  const email = user.email ?? profile?.email ?? 'Unknown email'

  if (!hasProfile) {
    return <MissingProfileDashboard email={email} />
  }

  return <DashboardShell email={email} profile={profile} />
}
