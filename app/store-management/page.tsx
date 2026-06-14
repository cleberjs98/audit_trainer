import { redirect } from 'next/navigation'

import { MissingProfileDashboard } from '@/components/dashboard/dashboard-shell'
import { StoreManagementClient } from '@/components/store-management/store-management-client'
import type {
  AreaOption,
  StoreManagementProfile,
  StoreManagementRow,
} from '@/components/store-management/types'
import { isUserRole, type ProfileRow } from '@/lib/auth/profile'
import { createClient } from '@/lib/supabase/server'

type AreaRow = {
  id: string
  name: string
}

type StoreRow = {
  id: string
  name: string
  code: string
  area_id: string
  is_active: boolean
}

function toAreaOptions(rows: AreaRow[] | null): AreaOption[] {
  return (rows ?? []).map((area) => ({
    id: area.id,
    name: area.name,
  }))
}

function toStoreRows(
  rows: StoreRow[] | null,
  areaNames: Map<string, string>
): StoreManagementRow[] {
  return (rows ?? []).map((store) => ({
    id: store.id,
    name: store.name,
    code: store.code,
    areaId: store.area_id,
    areaName: areaNames.get(store.area_id) ?? 'Unavailable',
    isActive: store.is_active,
  }))
}

export default async function StoreManagementPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, email, role, store_id, area_id, created_at, updated_at')
    .eq('id', user.id)
    .single<ProfileRow>()

  const email = user.email ?? profile?.email ?? 'Unknown email'

  if (profileError || !profile || !isUserRole(profile.role)) {
    return <MissingProfileDashboard email={email} />
  }

  if (profile.role !== 'admin' && profile.role !== 'area_manager') {
    redirect('/dashboard')
  }

  let areas: AreaOption[] = []

  if (profile.role === 'admin') {
    const { data } = await supabase
      .from('areas')
      .select('id, name')
      .order('name', { ascending: true })
      .returns<AreaRow[]>()

    areas = toAreaOptions(data)
  } else if (profile.area_id) {
    const { data } = await supabase
      .from('areas')
      .select('id, name')
      .eq('id', profile.area_id)
      .returns<AreaRow[]>()

    areas = toAreaOptions(data)
  }

  let storeData: StoreRow[] | null = null

  if (profile.role === 'admin') {
    const { data } = await supabase
      .from('stores')
      .select('id, name, code, area_id, is_active')
      .order('name', { ascending: true })
      .returns<StoreRow[]>()

    storeData = data
  } else if (profile.area_id) {
    const { data } = await supabase
      .from('stores')
      .select('id, name, code, area_id, is_active')
      .eq('area_id', profile.area_id)
      .order('name', { ascending: true })
      .returns<StoreRow[]>()

    storeData = data
  }

  const areaNames = new Map(areas.map((area) => [area.id, area.name]))
  const stores = toStoreRows(storeData, areaNames)
  const managementProfile: StoreManagementProfile = {
    role: profile.role,
    areaId: profile.area_id,
  }

  return (
    <StoreManagementClient
      profile={managementProfile}
      areas={areas}
      stores={stores}
    />
  )
}
