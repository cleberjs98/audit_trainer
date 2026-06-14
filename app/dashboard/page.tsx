import { redirect } from 'next/navigation'

import {
  type DashboardContext,
  DashboardShell,
  MissingProfileDashboard,
} from '@/components/dashboard/dashboard-shell'
import {
  isUserRole,
  type ProfileRow,
} from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'

type AreaRow = {
  name: string
}

type StoreRow = {
  name: string
  code: string
}

async function getDashboardContext(
  supabase: Awaited<ReturnType<typeof createClient>>,
  profile: ProfileRow
): Promise<DashboardContext> {
  if (profile.role === 'admin') {
    return {
      label: 'Workspace context',
      value: 'All areas and stores',
    }
  }

  if (profile.role === 'area_manager') {
    if (!profile.area_id) {
      return {
        label: 'Assigned area',
        value: 'Not assigned',
      }
    }

    const { data: area } = await supabase
      .from('areas')
      .select('name')
      .eq('id', profile.area_id)
      .single<AreaRow>()

    return {
      label: 'Assigned area',
      value: area?.name ?? 'Unavailable',
    }
  }

  if (!profile.store_id) {
    return {
      label: 'Assigned store',
      value: 'Not assigned',
    }
  }

  const { data: store } = await supabase
    .from('stores')
    .select('name, code')
    .eq('id', profile.store_id)
    .single<StoreRow>()

  return {
    label: 'Assigned store',
    value: store ? `${store.name} (${store.code})` : 'Unavailable',
  }
}

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

  const context = await getDashboardContext(supabase, profile)

  return <DashboardShell email={email} profile={profile} context={context} />
}
